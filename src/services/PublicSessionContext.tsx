import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { serviceCapabilities, services } from './index';
import type { Team } from '../types/domain';

type Session = Awaited<ReturnType<typeof services.auth.getSession>>;
const PublicSessionContext = createContext<{ session: Session | undefined; team?: Team }>({ session: undefined });

/** Shares the public header's server-verified identity with guest content and exports. */
export function PublicSessionProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [identity, setIdentity] = useState<{ session: Session | undefined; team?: Team }>({ session: undefined });
  useEffect(() => {
    let revision = 0;
    let active = true;
    const refresh = async () => {
      const request = ++revision;
      setIdentity({ session: undefined });
      if (!serviceCapabilities.publicSession) { setIdentity({ session: null }); return; }
      try {
        const session = await services.auth.getSession();
        if (!active || request !== revision) return;
        setIdentity({ session });
        if (session && ['captain', 'team'].includes(session.role)) {
          const team = await services.teams.current().catch(() => undefined);
          if (active && request === revision) setIdentity({ session, team });
        }
      } catch { if (active && request === revision) setIdentity({ session: undefined }); }
    };
    void refresh();
    window.addEventListener('aevic:session-change', refresh);
    return () => { active = false; window.removeEventListener('aevic:session-change', refresh); };
  }, [pathname]);
  return <PublicSessionContext.Provider value={identity}>{children}</PublicSessionContext.Provider>;
}
export const usePublicSession = () => useContext(PublicSessionContext);
export function GuestOnly({ children }: { children: ReactNode }) {
  const { session } = usePublicSession();
  return session === null ? <>{children}</> : null;
}
