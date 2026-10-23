import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { TeamWorkspacePlaceholder } from './TeamWorkspaceFrame';
import { BrandEmblem } from '../components/brand/BrandMark';
import { RouteSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState, Button } from '../components/common/primitives';
import { serviceCapabilities, services } from '../services';
import { invalidateQuery, usePlatformQuery } from '../services/queryCache';

const ProtectedSessionContext = createContext<Awaited<ReturnType<typeof services.auth.getSession>>>(null);
export const useProtectedSession = () => useContext(ProtectedSessionContext);

export function ProtectedRoute({ area, children }: { area: 'team' | 'admin' | 'account'; children: ReactNode }) {
  // Private, in-memory navigation state only. Every protected API still verifies
  // credentials, revocation and membership on the server.
  const query = usePlatformQuery({ key: 'session:guard', scope: 'private', query: signal => services.auth.getSession(signal), staleTime: 10_000, retry: 2, enabled: serviceCapabilities.publicSession });
  useEffect(() => {
    const changed = () => invalidateQuery('session:guard');
    window.addEventListener('aevic:session-change', changed);
    return () => window.removeEventListener('aevic:session-change', changed);
  }, []);
  const location = useLocation();
  const loginBase = area === 'admin' ? '/admin/login' : '/login';
  const loginPath = `${loginBase}?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
  if (!serviceCapabilities.publicSession || query.error?.status === 401) return <Navigate to={loginPath} replace />;
  if (query.error?.status === 403) return <Navigate to="/forbidden" replace />;
  // A failed verification never authorizes entry based on a stale identity.
  if (query.error) {
    const content = <EmptyState heading="h1" title="Bağlantını yoxlayın" body="Hesab sessiyasını yoxlamaq mümkün olmadı. Bir az sonra yenidən cəhd edin." action={<Button disabled={query.retryAfterSeconds > 0} onClick={query.refetch}>{query.retryAfterSeconds > 0 ? `${query.retryAfterSeconds} san. sonra yoxla` : 'Yenidən yoxla'}</Button>} />;
    return area === 'team' ? <TeamWorkspacePlaceholder>{content}</TeamWorkspacePlaceholder> : <main className="route-loading">{content}</main>;
  }
  if (query.loading || query.refreshing) {
    return area === 'team' ? <TeamWorkspacePlaceholder phase="session" /> : <main className="route-loading"><div className="route-loading__identity"><BrandEmblem decorative={false} /><span>AEVIC secure access</span></div><RouteSkeleton path={window.location.pathname}/></main>;
  }
  const session = query.data;
  const accepted = area === 'admin' ? session?.role === 'admin' : area === 'account' ? Boolean(session) : Boolean(session && ['captain', 'team', 'admin'].includes(session.role));
  if (!accepted) return <Navigate to={session ? '/forbidden' : loginPath} replace />;
  return <div key={session?.user.id} data-protected-area={area}><ProtectedSessionContext.Provider value={session ?? null}>{children}</ProtectedSessionContext.Provider></div>;
}
