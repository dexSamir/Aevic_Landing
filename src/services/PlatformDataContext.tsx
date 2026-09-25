import { Link, useLocation } from 'react-router-dom';
import { createContext, lazy, Suspense, type ReactNode, useContext, useEffect } from 'react';
import { Button, EmptyState } from '../components/common/primitives';
import { RouteSkeleton, RefreshIndicator } from '../components/common/LoadingSkeleton';
import type { ApiError } from './apiError';
import type { AdminPlatformSnapshot, PublicPlatformSnapshot, TeamPlatformSnapshot } from '../types/domain';
import { competitionNow, services } from '.';
import { queryPolicy, usePlatformQuery, invalidateQuery } from './queryCache';
import { deriveTeamCompetitionContexts } from '../utils/teamCompetitionContext';

const InvitationsWithoutWorkspace=lazy(()=>import('../pages/routes/TeamInvitationsPage').then(m=>({default:m.TeamInvitationsPage})));
const PublicContext = createContext<PublicPlatformSnapshot | null>(null);
const TeamContext = createContext<TeamPlatformSnapshot | null>(null);
const AdminContext = createContext<AdminPlatformSnapshot | null>(null);

function QueryBoundary<T>({ query, children }: { query: { data?: T; loading: boolean; refreshing?: boolean; error?: ApiError; retryAfterSeconds: number; refetch: () => void }; children: (value: T) => ReactNode }) {
  const {pathname}=useLocation();
  if (query.error?.status===401 || query.error?.status===403) {
    const expired=query.error.status===401;
    return <div className="route-loading"><EmptyState heading="h1" title={expired?'Sessiyanın vaxtı bitib':'Bu bölməyə giriş icazəniz yoxdur'} body={expired?'Davam etmək üçün yenidən daxil olun.':'Hesabınızın səlahiyyətlərini yoxlayın və ya dəstək xidməti ilə əlaqə saxlayın.'} action={<Link className="button button--primary button--md" to={expired?(pathname.startsWith('/admin')?'/admin/login':'/login'):'/support'}>{expired?'Yenidən daxil ol':'Dəstək mərkəzi'}</Link>} /></div>;
  }
  if (query.loading && !query.data) return <RouteSkeleton path={pathname}/>;
  if (!query.data) return <div className="route-loading"><EmptyState heading="h1" title="Platform məlumatı yüklənmədi" body={query.error?.code==='SERVER_NOT_CONFIGURED'?'Platform xidməti hələ konfiqurasiya edilməyib.':'Məlumat servisi hazırda cavab vermir.'} action={query.error?.retryable ? <Button disabled={query.retryAfterSeconds > 0} onClick={query.refetch}>{query.retryAfterSeconds > 0 ? `${query.retryAfterSeconds} san. sonra yoxla` : 'Yenidən yoxla'}</Button> : undefined} />{query.error?.requestId && <small>Sorğu kodu: {query.error.requestId}</small>}</div>;
  return <><RefreshIndicator active={query.refreshing}/>{query.error && <p role="status" className="connectivity-status">Yenilənmə alınmadı. Son yüklənmiş məlumat göstərilir. <Button variant="ghost" onClick={query.refetch}>Yenidən yoxla</Button></p>}{children(query.data)}</>;
}

export function PublicPlatformProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(()=>{const timer=setInterval(()=>{if(navigator.onLine&&document.visibilityState==='visible')invalidateQuery('snapshot:public');},60_000);return()=>clearInterval(timer);},[]);
  const query = usePlatformQuery({ key: 'snapshot:public', scope: 'public', query: (signal) => services.snapshots.public(signal), staleTime: queryPolicy.publicCompetition, refetchOnFocus:true });
  return <QueryBoundary query={query}>{(value) => <PublicContext.Provider value={value}>{value.unavailable && /^\/(tournaments|leaderboard|matches|archive|records|organizations)(\/|$)|^\/teams\/compare$/.test(pathname) ? <div className="page-section container"><EmptyState heading="h1" title="Yarış məlumatları hələ əlçatan deyil" body="Komanda profilləri əlçatandır. Turnir, matç və sıralama məlumatlarının bağlantısı hələ tamamlanmayıb." /></div> : <>{children}{value.unavailable && <p role="status" className="container public-team-note">Komanda məlumatları mövcud bazadan göstərilir. Yarış məlumatlarının bağlantısı hələ tamamlanmayıb.</p>}</>}</PublicContext.Provider>}</QueryBoundary>;
}

export function TeamPlatformProvider({ children }: { children: ReactNode }) {
  const {pathname}=useLocation();
  const query = usePlatformQuery({ key: 'snapshot:team', query: (signal) => services.snapshots.team(signal), staleTime: queryPolicy.account, refetchOnFocus:true });
  if(query.error?.code==='TEAM_WORKSPACE_REQUIRED')return <main className="product-page"><p>Aktiv komanda iş sahəniz yoxdur. Yeni dəvətləri burada qəbul edə bilərsiniz.</p><a href="/account/profile">Hesab ayarları</a><Suspense fallback={<RouteSkeleton path={pathname}/>}><InvitationsWithoutWorkspace/></Suspense></main>;
  return <QueryBoundary query={query}>{(value) => <TeamContext.Provider value={value}><TeamRealtime teamId={value.currentTeam.id} original={value.dataSource==='public.teams'} />{value.unavailable?.competition && !['/team','/team/profile','/team/roster','/team/settings','/team/settings/account','/team/settings/security','/team/history'].includes(pathname) ? <EmptyState title="Bu bölmə hələ əlçatan deyil" body="Bu bölmə üçün yarış və ya hesab xidməti hələ qoşulmayıb. Komanda profili, kapitan məlumatları və heyət idarəetməsi əlçatandır." /> : children}</TeamContext.Provider>}</QueryBoundary>;
}

export function AdminPlatformProvider({ children }: { children: ReactNode }) {
  const query = usePlatformQuery({ key: 'snapshot:admin', query: (signal) => services.snapshots.admin(signal), staleTime: queryPolicy.account, refetchOnFocus:true });
  return <QueryBoundary query={query}>{(value) => <AdminContext.Provider value={value}>{children}</AdminContext.Provider>}</QueryBoundary>;
}

export function usePublicPlatformData() {
  const value = useContext(PublicContext); if (!value) throw new Error('usePublicPlatformData must be used inside PublicPlatformProvider'); return value;
}
export function useTeamPlatformData() {
  const value = useContext(TeamContext); if (!value) throw new Error('useTeamPlatformData must be used inside TeamPlatformProvider'); return value;
}
export function useTeamCompetitionContexts() {
  return deriveTeamCompetitionContexts(useTeamPlatformData(), competitionNow());
}
export function useAdminPlatformData() {
  const value = useContext(AdminContext); if (!value) throw new Error('useAdminPlatformData must be used inside AdminPlatformProvider'); return value;
}

function TeamRealtime({teamId,original}:{teamId:string;original?:boolean}) {
 useEffect(()=>{const controller=new AbortController();const refresh=()=>{if(navigator.onLine&&document.visibilityState==='visible')invalidateQuery('snapshot:team');};const polling=setInterval(refresh,60_000);window.addEventListener('online',refresh);if(!original)void import('./realtime').then(m=>m.subscribeTeam(teamId,controller.signal)).catch(()=>{ /* Reads still work if Realtime cannot connect. */ });return()=>{controller.abort();clearInterval(polling);window.removeEventListener('online',refresh);};},[teamId,original]);return null;
}
