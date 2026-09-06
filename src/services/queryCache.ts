import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { safeQueryError, type ApiError } from './apiError';
import { runReadQuery } from './queryRetry';

type Scope = 'public' | 'private';
type CacheEntry<T> = { data: T; updatedAt: number };
type InFlightEntry<T> = { promise: Promise<T>; controller: AbortController; observers: number };
const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, InFlightEntry<unknown>>();
let privateEpoch = 0;
let publicEpoch = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
let sessionIdentity = '';
const keyVersions = new Map<string, number>();
const versionFor = (scope: Scope, key: string) => `${scope === 'private' ? privateEpoch : publicEpoch}/${keyVersions.get(key) ?? 0}`;

export const queryPolicy = {
  publicDirectory: 5 * 60_000, publicCompetition: 60_000,
  historical: 30 * 60_000, account: 30_000,
} as const;

export function clearQueryCache(scope: Scope | 'all' = 'private') {
  const matches = (key: string) => scope === 'all' || key.startsWith(scope + ':');
  for (const key of cache.keys()) if (matches(key)) cache.delete(key);
  for (const [key, pending] of inFlight) if (matches(key)) { pending.controller.abort(); inFlight.delete(key); }
  if (scope !== 'public') privateEpoch += 1;
  if (scope !== 'private') publicEpoch += 1;
  listeners.forEach((listener) => listener());
}

export function synchronizeSessionCache(identity: string | null) {
  if (sessionIdentity !== (identity ?? '')) { sessionIdentity = identity ?? ''; clearQueryCache('private'); }
}

export function invalidateQuery(prefix: string) {
  for (const key of new Set([...cache.keys(), ...inFlight.keys()])) {
    if (!key.slice(key.indexOf(':') + 1).startsWith(prefix)) continue;
    cache.delete(key);
    inFlight.get(key)?.controller.abort(); inFlight.delete(key);
    keyVersions.set(key, (keyVersions.get(key) ?? 0) + 1);
  }
  listeners.forEach((listener) => listener());
}

export function usePlatformQuery<T>(options: {
  key: string; query: (signal: AbortSignal) => Promise<T>;
  scope?: Scope; staleTime?: number; enabled?: boolean; retry?: number; refetchOnFocus?: boolean;
}) {
  const { key, query, scope = 'private', staleTime = queryPolicy.publicCompetition, enabled = true, retry = 1, refetchOnFocus = false } = options;
  const cacheKey = scope + ':' + key;
  const epoch = useSyncExternalStore(subscribe, () => versionFor(scope, cacheKey), () => '0/0');
  const stateKey = cacheKey + ':' + epoch;
  const queryRef = useRef(query); queryRef.current = query;
  const initial = cache.get(cacheKey) as CacheEntry<T> | undefined;
  const [state, setState] = useState<{ key: string; data?: T; loading: boolean; error?: ApiError }>({ key: stateKey, data: enabled ? initial?.data : undefined, loading: enabled && !initial });
  const [attempt, setAttempt] = useState(0);
  const [retryClock, setRetryClock] = useState(Date.now);
  const retryAt = state.key === stateKey && state.error?.retryAfterMs ? Date.parse(state.error.timestamp) + state.error.retryAfterMs : 0;
  useEffect(() => {
    setRetryClock(Date.now());
    if (retryAt <= Date.now()) return;
    const timer = window.setInterval(() => { const now = Date.now(); setRetryClock(now); if (now >= retryAt) window.clearInterval(timer); }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  // Manual retries also respect a server cooldown; no consumer can bypass it.
  const refetch = useCallback(() => { if (Date.now() < retryAt) return; cache.delete(cacheKey); setAttempt((n) => n + 1); }, [cacheKey, retryAt]);

  useEffect(() => {
    if (!enabled || !refetchOnFocus) return;
    const onFocus = () => { const entry = cache.get(cacheKey); if (!entry || Date.now() - entry.updatedAt >= staleTime) refetch(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, cacheKey, refetch, refetchOnFocus, staleTime]);

  useEffect(() => {
    if (!enabled) { setState({ key: stateKey, loading: false }); return; }
    const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (entry && Date.now() - entry.updatedAt < staleTime) { setState({ key: stateKey, data: entry.data, loading: false }); return; }
    let active = true;
    setState({ key: stateKey, loading: true });
    let pending = inFlight.get(cacheKey) as InFlightEntry<T> | undefined;
    if (!pending || pending.controller.signal.aborted) {
      const controller = new AbortController();
      const execute = () => runReadQuery((signal) => queryRef.current(signal), controller.signal, retry);
      const created: InFlightEntry<T> = { promise: Promise.resolve().then(execute), controller, observers: 0 };
      created.promise = created.promise.finally(() => { if (inFlight.get(cacheKey) === created) inFlight.delete(cacheKey); });
      pending = created; inFlight.set(cacheKey, created);
    }
    const owned = pending;
    owned.observers += 1;
    const isCurrent = () => active && !owned.controller.signal.aborted && epoch === versionFor(scope, cacheKey);
    void owned.promise.then((data) => {
      if (!isCurrent()) return;
      cache.set(cacheKey, { data, updatedAt: Date.now() });
      setState({ key: stateKey, data, loading: false });
    }).catch((error) => { if (isCurrent()) setState({ key: stateKey, error: safeQueryError(error), loading: false }); });
    return () => {
      active = false; owned.observers -= 1;
      if (owned.observers <= 0 && inFlight.get(cacheKey) === owned) { owned.controller.abort(); inFlight.delete(cacheKey); }
    };
  }, [attempt, enabled, cacheKey, epoch, scope, stateKey, retry, staleTime]);

  // Key/identity changes hide the old value during render, before effects run.
  const current = state.key === stateKey && enabled ? state : { loading: enabled, data: undefined, error: undefined };
  return { data: current.data, loading: current.loading, error: current.error, refetch, retryAfterSeconds: Math.max(0, Math.ceil((retryAt - retryClock) / 1000)) };
}
