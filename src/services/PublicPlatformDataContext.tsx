import { Link, useLocation } from 'react-router-dom';
import { createContext, type ReactNode, useContext, useEffect } from 'react';
import { Button, EmptyState } from '../components/common/primitives';
import { RouteSkeleton, RefreshIndicator } from '../components/common/LoadingSkeleton';
import type { ApiError } from './apiError';
import type { PublicPlatformSnapshot } from '../types/domain';
import { services } from '.';
import { queryPolicy, usePlatformQuery, invalidateQuery } from './queryCache';

const PublicContext = createContext<PublicPlatformSnapshot | null>(null);

function QueryBoundary<T>({ query, children }: { query: { data?: T; loading: boolean; refreshing?: boolean; error?: ApiError; retryAfterSeconds: number; refetch: () => void }; children: (value: T) => ReactNode }) {
  const {pathname}=useLocation();
  const state = (content: ReactNode) => content;
  if (query.error?.status===401 || query.error?.status===403) {
    const expired=query.error.status===401;
    return state(<div className={"route-loading"}><EmptyState heading="h1" title={expired?'Sessiyanın vaxtı bitib':'Bu bölməyə giriş icazəniz yoxdur'} body={expired?'Davam etmək üçün yenidən daxil olun.':'Hesabınızın səlahiyyətlərini yoxlayın və ya dəstək xidməti ilə əlaqə saxlayın.'} action={<Link className="button button--primary button--md" to={expired?(pathname.startsWith('/admin')?'/admin/login':'/login'):'/support'}>{expired?'Yenidən daxil ol':'Dəstək mərkəzi'}</Link>} /></div>);
  }
  if (query.loading && !query.data) return <RouteSkeleton path={pathname}/>;
  if (!query.data) return state(<div className={"route-loading"}><EmptyState heading="h1" title="Platform məlumatı yüklənmədi" body={query.error?.code==='SERVER_NOT_CONFIGURED'?'Platform xidməti hələ konfiqurasiya edilməyib.':'Məlumat servisi hazırda cavab vermir.'} action={query.error?.retryable ? <Button disabled={query.retryAfterSeconds > 0} onClick={query.refetch}>{query.retryAfterSeconds > 0 ? `${query.retryAfterSeconds} san. sonra yoxla` : 'Yenidən yoxla'}</Button> : undefined} />{query.error?.requestId && <small>Sorğu kodu: {query.error.requestId}</small>}</div>);
  return <><RefreshIndicator active={query.refreshing}/>{query.error && <p role="status" className="connectivity-status">Yenilənmə alınmadı. Son yüklənmiş məlumat göstərilir. <Button variant="ghost" onClick={query.refetch}>Yenidən yoxla</Button></p>}{children(query.data)}</>;
}

export function PublicPlatformProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(()=>{const timer=setInterval(()=>{if(navigator.onLine&&document.visibilityState==='visible')invalidateQuery('snapshot:public');},60_000);return()=>clearInterval(timer);},[]);
  const query = usePlatformQuery({ key: 'snapshot:public', scope: 'public', query: (signal) => services.snapshots.public(signal), staleTime: queryPolicy.publicCompetition, refetchOnFocus:true });
  return <QueryBoundary query={query}>{(value) => <PublicContext.Provider value={value}>{value.unavailable && /^\/(tournaments|leaderboard|matches|archive|records|organizations)(\/|$)|^\/teams\/compare$/.test(pathname) ? <div className="page-section container"><EmptyState heading="h1" title="Yarış məlumatları hələ əlçatan deyil" body="Komanda profilləri əlçatandır. Turnir, matç və sıralama məlumatlarının bağlantısı hələ tamamlanmayıb." /></div> : <>{children}{value.unavailable && <p role="status" className="container public-team-note">Komanda məlumatları mövcud bazadan göstərilir. Yarış məlumatlarının bağlantısı hələ tamamlanmayıb.</p>}</>}</PublicContext.Provider>}</QueryBoundary>;
}

export function usePublicPlatformData() {
  const value = useContext(PublicContext); if (!value) throw new Error('usePublicPlatformData must be used inside PublicPlatformProvider'); return value;
}
