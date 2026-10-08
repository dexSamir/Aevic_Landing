import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { serviceCapabilities, services } from './index';
import { ApiError, safeQueryError } from './apiError';
import type { Team } from '../types/domain';

type Session = Awaited<ReturnType<typeof services.auth.getSession>>;
type Identity = { session: Session | undefined; team?: Team; loading: boolean; error?: ApiError };
const PublicSessionContext = createContext<(Identity & { refresh: () => void }) | undefined>(undefined);

/** One server-verified identity shared by the header, registration and exports. */
export function PublicSessionProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt(value => value + 1), []);
  const [identity, setIdentity] = useState<Identity>({ session: undefined, loading: true });
  useEffect(() => {
    let active = true;
    setIdentity({ session: undefined, loading: true });
    const read = async () => {
      if (!serviceCapabilities.publicSession) { setIdentity({ session: null, loading: false }); return; }
      let session: Session | undefined;
      try {
        session = await services.auth.getSession() ?? null;
        if (!active) return;
        let team: Team | undefined;
        if (session && ['captain', 'team'].includes(session.role)) {
          try { team = await services.teams.current(); }
          catch (error) {
            // An authenticated spectator can legitimately have no workspace.
            if (!(error instanceof ApiError && error.status === 403)) throw error;
          }
        }
        if (active) setIdentity({ session, team, loading: false });
      } catch (error) { if (active) setIdentity({ session, loading: false, error: safeQueryError(error) }); }
    };
    void read();
    return () => { active = false; };
  }, [pathname, attempt]);
  useEffect(() => {
    window.addEventListener('aevic:session-change', refresh);
    return () => window.removeEventListener('aevic:session-change', refresh);
  }, [refresh]);
  return <PublicSessionContext.Provider value={{ ...identity, refresh }}>{children}</PublicSessionContext.Provider>;
}
export const useOptionalPublicSession = () => useContext(PublicSessionContext);
export const usePublicSession = () => useOptionalPublicSession() ?? { session: undefined, loading: true, refresh: () => {} };
export function GuestOnly({ children }: { children: ReactNode }) {
  const { session } = usePublicSession();
  return session === null ? <>{children}</> : null;
}
