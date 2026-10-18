import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { safeQueryError, type ApiError } from './apiError';
import { runReadQuery } from './queryRetry';

type Scope = 'public' | 'private';
type CacheEntry<T> = { data: T; updatedAt: number; invalidated?: boolean };
type InFlightEntry<T> = { promise: Promise<T>; controller: AbortController; observers: number };
const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, InFlightEntry<unknown>>();
// Cooldown metadata survives navigation; failed promises and response data do not.
const cooldowns = new Map<string, ApiError>();
function cooldownFor(key: string) {
  for (const [id, error] of cooldowns) {
    if (Date.now() >= Date.parse(error.timestamp) + (error.retryAfterMs ?? 0)) cooldowns.delete(id);
  }
  return cooldowns.get(key);
}
let privateEpoch = 0;
let publicEpoch = 0;
const listeners = new Set<() => void>();
const MAX_ENTRIES = 160;
function pruneCache() {
  for (const [key, entry] of cache) if (Date.now() - entry.updatedAt > 10 * 60_000) { cache.delete(key); keyVersions.delete(key); }
  while (cache.size > MAX_ENTRIES) { const key = cache.keys().next().value!; cache.delete(key); keyVersions.delete(key); }
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
let sessionIdentity = '';
const keyVersions = new Map<string, number>();
const versionFor = (scope: Scope, key: string) => `${scope === 'private' ? privateEpoch : publicEpoch}/${keyVersions.get(key) ?? 0}`;

export const queryPolicy = {
  publicDirectory: 5 * 60_000, publicCompetition: 60_000,
  historical: 60_000, account: 30_000,
} as const;

export function clearQueryCache(scope: Scope | 'all' = 'private') {
  const matches = (key: string) => scope === 'all' || key.startsWith(scope + ':');
  for (const key of cache.keys()) if (matches(key)) cache.delete(key);
  for (const key of cooldowns.keys()) if (matches(key)) cooldowns.delete(key);
  for (const key of keyVersions.keys()) if (matches(key)) keyVersions.delete(key);
  for (const [key, pending] of inFlight) if (matches(key)) { pending.controller.abort(); inFlight.delete(key); }
  if (scope !== 'public') privateEpoch += 1;
  if (scope !== 'private') publicEpoch += 1;
  listeners.forEach((listener) => listener());
}

export function synchronizeSessionCache(identity: string | null) {
  if (sessionIdentity !== (identity ?? '')) { sessionIdentity = identity ?? ''; clearQueryCache('private'); }
}

export function invalidateQuery(prefix: string, scope?: Scope, exact = false) {
  for (const key of new Set([...cache.keys(), ...inFlight.keys()])) {
    const resource = key.slice(key.indexOf(':') + 1);
    if (scope && !key.startsWith(scope + ':') || (exact ? resource !== prefix : !resource.startsWith(prefix))) continue;
    const stale = cache.get(key); if (stale) cache.set(key, { ...stale, invalidated: true });
    inFlight.get(key)?.controller.abort(); inFlight.delete(key);
    keyVersions.set(key, (keyVersions.get(key) ?? 0) + 1);
  }
  listeners.forEach((listener) => listener());
}

/** Resolve ID-based mutations against public profiles cached by either ID or slug. */
export function invalidateTeamProfile(id: string) {
  const keys = new Set([`profile:${id}`]);
  for (const [key, entry] of cache) {
    if (!key.startsWith('public:profile:')) continue;
    const profile = entry.data as { team?: { id?: string } } | undefined;
    if (profile?.team?.id === id) keys.add(key.slice('public:'.length));
  }
  for (const key of inFlight.keys()) if (key.startsWith('public:profile:') && !cache.has(key)) keys.add(key.slice('public:'.length));
  for (const key of keys) invalidateQuery(key, 'public', true);
}

/** Apply an acknowledged service response without refetching the same snapshot. */
export function updateCachedQuery<T>(key: string, update: (value: T) => T, scope: Scope = 'private') {
  const cacheKey = `${scope}:${key}`;
  const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;
  if (!entry) return;
  inFlight.get(cacheKey)?.controller.abort(); inFlight.delete(cacheKey);
  cache.set(cacheKey, { data: update(entry.data), updatedAt: Date.now() });
  keyVersions.set(cacheKey, (keyVersions.get(cacheKey) ?? 0) + 1);
  listeners.forEach(listener => listener());
}

export function usePlatformQuery<T>(options: {
  key: string; query: (signal: AbortSignal) => Promise<T>;
  scope?: Scope; staleTime?: number; enabled?: boolean; retry?: number; refetchOnFocus?: boolean; maxDataAge?: number;
}) {
  const { key, query, scope = 'private', staleTime = queryPolicy.publicCompetition, enabled = true, retry = 1, refetchOnFocus = true, maxDataAge = scope === 'public' ? 5 * 60_000 : Infinity } = options;
  const cacheKey = scope + ':' + key;
  const epoch = useSyncExternalStore(subscribe, () => versionFor(scope, cacheKey), () => '0/0');
  const stateKey = cacheKey + ':' + epoch;
  const queryRef = useRef(query); queryRef.current = query;
  const initial = cache.get(cacheKey) as CacheEntry<T> | undefined;
  const [state, setState] = useState<{ key: string; data?: T; updatedAt?: number; loading: boolean; error?: ApiError }>({ key: stateKey, data: enabled ? initial?.data : undefined, updatedAt: initial?.updatedAt, loading: enabled && !initial });
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
  const refetch = useCallback(() => {
    if (Date.now() < retryAt || cooldownFor(cacheKey) || inFlight.has(cacheKey)) return;
    const entry = cache.get(cacheKey);
    if (entry) cache.set(cacheKey, { ...entry, invalidated: true });
    setAttempt((n) => n + 1);
  }, [cacheKey, retryAt]);

  useEffect(() => {
    if (!enabled || !refetchOnFocus) return;
    const onFocus = () => { const entry = cache.get(cacheKey); if (!entry || entry.invalidated || Date.now() - entry.updatedAt >= staleTime) refetch(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('online', onFocus); };
  }, [enabled, cacheKey, refetch, refetchOnFocus, staleTime]);

  useEffect(() => {
    if (!enabled) { setState({ key: stateKey, loading: false }); return; }
    const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (entry && !entry.invalidated && Date.now() - entry.updatedAt < staleTime) { setState({ key: stateKey, data: entry.data, updatedAt: entry.updatedAt, loading: false }); return; }
    const cooldown = cooldownFor(cacheKey);
    if (cooldown) { setState({ key: stateKey, data: entry?.data, updatedAt: entry?.updatedAt, loading: false, error: cooldown }); return; }
    let active = true;
    setState({ key: stateKey, data: entry?.data, updatedAt: entry?.updatedAt, loading: true });
    let pending = inFlight.get(cacheKey) as InFlightEntry<T> | undefined;
    if (!pending || pending.controller.signal.aborted) {
      const controller = new AbortController();
      const execute = () => runReadQuery((signal) => queryRef.current(signal), controller.signal, retry);
      const created: InFlightEntry<T> = { promise: Promise.resolve().then(execute), controller, observers: 0 };
      created.promise = created.promise.catch(error => {
        const failure = safeQueryError(error);
        if (!controller.signal.aborted && failure.retryable && (failure.retryAfterMs ?? 0) > 0) cooldowns.set(cacheKey, failure);
        throw error;
      }).finally(() => { if (inFlight.get(cacheKey) === created) inFlight.delete(cacheKey); });
      pending = created; inFlight.set(cacheKey, created);
    }
    const owned = pending;
    owned.observers += 1;
    const isCurrent = () => active && !owned.controller.signal.aborted && epoch === versionFor(scope, cacheKey);
    void owned.promise.then((data) => {
      if (!isCurrent()) return;
      cache.set(cacheKey, { data, updatedAt: Date.now() }); pruneCache();
      setState({ key: stateKey, data, updatedAt: Date.now(), loading: false });
    }).catch((error) => {
      if (!isCurrent()) return;
      const failure = safeQueryError(error);
      const denied = [401,403,404].includes(failure.status);
      if (denied) cache.delete(cacheKey);
      setState({ key: stateKey, data: denied ? undefined : entry?.data, updatedAt: entry?.updatedAt, error: failure, loading: false });
    });
    return () => {
      active = false; owned.observers -= 1;
      // React StrictMode and same-tick route hand-offs can immediately resubscribe.
      // Share that request; abort only when it truly has no remaining observers.
      queueMicrotask(() => {
        if (owned.observers <= 0 && inFlight.get(cacheKey) === owned) { owned.controller.abort(); inFlight.delete(cacheKey); }
      });
    };
  }, [attempt, enabled, cacheKey, epoch, scope, stateKey, retry, staleTime]);

  // Key/identity changes hide the old value during render, before effects run.
  const refreshed = enabled ? cache.get(cacheKey) as CacheEntry<T> | undefined : undefined;
  const current = state.key === stateKey && enabled ? state : refreshed ? { data: refreshed.data, updatedAt: Date.now(), loading: false, error: undefined } : { loading: enabled, data: undefined, updatedAt: undefined, error: undefined };
  // Invalidation must not reset the age of the last successful response.
  // Expire visible stale data even when the tab stays mounted and offline.
  const [, expire] = useState(0);
  const updatedAt = refreshed?.updatedAt ?? current.updatedAt;
  const expiresAt = updatedAt === undefined ? Infinity : updatedAt + maxDataAge;
  useEffect(() => {
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return;
    const timer = window.setTimeout(() => { expire(n => n + 1); if (navigator.onLine && document.visibilityState === 'visible' && !current.error) refetch(); }, expiresAt - Date.now());
    return () => window.clearTimeout(timer);
  }, [expiresAt, refetch, current.error]);
  const data = Date.now() >= expiresAt ? undefined : current.data;
  return { data, loading: current.loading && data === undefined,
    refreshing: current.loading && data !== undefined, error: current.error, refetch,
    retryAfterSeconds: Math.max(0, Math.ceil((retryAt - retryClock) / 1000)) };
}
