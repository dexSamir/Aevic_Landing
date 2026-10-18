import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { serviceCapabilities, services } from './index';
import { runReadQuery } from './queryRetry';
import { ApiError, safeQueryError } from './apiError';
import type { Team } from '../types/domain';

type Session = Awaited<ReturnType<typeof services.auth.getSession>>;
type Identity = { session: Session | undefined; team?: Team; loading: boolean; error?: ApiError };
const PublicSessionContext = createContext<(Identity & { refresh: () => void }) | undefined>(undefined);

/** One server-verified identity shared by the header, registration and exports. */
export function PublicSessionProvider({ children }: { children: ReactNode }) {
  const lastRead = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  const retryAt = useRef(0);
  const refresh = useCallback(() => { if (!pending.current && Date.now() >= retryAt.current) setAttempt(value => value + 1); }, []);
  const [identity, setIdentity] = useState<Identity>({ session: undefined, loading: true });
  useEffect(() => {
    lastRead.current = Date.now();
    let active = true;
    const controller = new AbortController();
    pending.current = true;
    setIdentity(previous => ({ ...previous, loading: previous.session === undefined, error: undefined }));
    const read = async () => {
      if (!serviceCapabilities.publicSession) { pending.current = false; setIdentity({ session: null, loading: false }); return; }
      let session: Session | undefined;
      try {
        session = await runReadQuery(signal => services.auth.getSession(signal), controller.signal, 2) ?? null;
        if (!active) return;
        retryAt.current = 0;
        let team: Team | undefined;
        if (session && ['captain', 'team'].includes(session.role)) {
          try { team = await services.teams.current(); }
          catch (error) {
            // An authenticated spectator can legitimately have no workspace.
            if (!(error instanceof ApiError && error.status === 403)) throw error;
          }
        }
        if (active) setIdentity({ session, team, loading: false });
      } catch (error) {
        if (active) {
          const failure = safeQueryError(error);
          retryAt.current = Date.parse(failure.timestamp) + (failure.retryAfterMs ?? 0);
          setIdentity(previous => ({
            session: failure.status === 401 ? null : session ?? previous.session,
            team: failure.status === 401 || failure.status === 403 ? undefined : previous.team,
            loading: false, error: failure,
          }));
        }
      } finally { if (active) pending.current = false; }
    };
    void read();
    return () => { active = false; pending.current = false; controller.abort(); };
  }, [attempt]);
  useEffect(() => {
    const revalidate = () => { if (Date.now() - lastRead.current >= 60_000) refresh(); };
    const changed = () => { retryAt.current = 0; setIdentity({ session: undefined, loading: true }); setAttempt(value => value + 1); };
    window.addEventListener('aevic:session-change', changed);
    window.addEventListener('focus', revalidate);
    window.addEventListener('online', revalidate);
    return () => { window.removeEventListener('aevic:session-change', changed); window.removeEventListener('focus', revalidate); window.removeEventListener('online', revalidate); };
  }, [refresh]);
  return <PublicSessionContext.Provider value={{ ...identity, refresh }}>{children}</PublicSessionContext.Provider>;
}
export const useOptionalPublicSession = () => useContext(PublicSessionContext);
export const usePublicSession = () => useOptionalPublicSession() ?? { session: undefined, loading: true, refresh: () => {} };
export function GuestOnly({ children }: { children: ReactNode }) {
  const { session } = usePublicSession();
  return session === null ? <>{children}</> : null;
}
