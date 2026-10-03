import { TeamWorkspacePlaceholder } from '../layouts/TeamWorkspaceFrame';
import { Link, useLocation } from 'react-router-dom';
import { createContext, lazy, Suspense, type ReactNode, useContext, useEffect } from 'react';
import { Button, EmptyState } from '../components/common/primitives';
import { RouteSkeleton, RefreshIndicator } from '../components/common/LoadingSkeleton';
import type { ApiError } from './apiError';
import type { AdminPlatformSnapshot, TeamPlatformSnapshot } from '../types/domain';
import { competitionNow, services } from '.';
import { queryPolicy, usePlatformQuery, invalidateQuery } from './queryCache';
import { deriveTeamCompetitionContexts } from '../utils/teamCompetitionContext';

const InvitationsWithoutWorkspace=lazy(()=>import('../pages/routes/TeamInvitationsPage').then(m=>({default:m.TeamInvitationsPage})));
const TeamContext = createContext<TeamPlatformSnapshot | null>(null);
const AdminContext = createContext<AdminPlatformSnapshot | null>(null);

function QueryBoundary<T>({ query, children, workspace = false }: { workspace?: boolean; query: { data?: T; loading: boolean; refreshing?: boolean; error?: ApiError; retryAfterSeconds: number; refetch: () => void }; children: (value: T) => ReactNode }) {
  const {pathname}=useLocation();
  const state = (content: ReactNode) => workspace ? <TeamWorkspacePlaceholder>{content}</TeamWorkspacePlaceholder> : content;
  if (query.error?.status===401 || query.error?.status===403) {
    const expired=query.error.status===401;
    return state(<div className={workspace ? "workspace-state" : "route-loading"}><EmptyState heading="h1" title={expired?'Sessiyanın vaxtı bitib':'Bu bölməyə giriş icazəniz yoxdur'} body={expired?'Davam etmək üçün yenidən daxil olun.':'Hesabınızın səlahiyyətlərini yoxlayın və ya dəstək xidməti ilə əlaqə saxlayın.'} action={<Link className="button button--primary button--md" to={expired?(pathname.startsWith('/admin')?'/admin/login':'/login'):'/support'}>{expired?'Yenidən daxil ol':'Dəstək mərkəzi'}</Link>} /></div>);
  }
  if (query.loading && !query.data) return workspace ? <TeamWorkspacePlaceholder /> : <RouteSkeleton path={pathname}/>;
  if (!query.data) return state(<div className={workspace ? "workspace-state" : "route-loading"}><EmptyState heading="h1" title="Platform məlumatı yüklənmədi" body={query.error?.code==='SERVER_NOT_CONFIGURED'?'Platform xidməti hələ konfiqurasiya edilməyib.':'Məlumat servisi hazırda cavab vermir.'} action={query.error?.retryable ? <Button disabled={query.retryAfterSeconds > 0} onClick={query.refetch}>{query.retryAfterSeconds > 0 ? `${query.retryAfterSeconds} san. sonra yoxla` : 'Yenidən yoxla'}</Button> : undefined} />{query.error?.requestId && <small>Sorğu kodu: {query.error.requestId}</small>}</div>);
  return <><RefreshIndicator active={query.refreshing}/>{query.error && <p role="status" className="connectivity-status">Yenilənmə alınmadı. Son yüklənmiş məlumat göstərilir. <Button variant="ghost" onClick={query.refetch}>Yenidən yoxla</Button></p>}{children(query.data)}</>;
}

export function TeamPlatformProvider({ children }: { children: ReactNode }) {
  const {pathname}=useLocation();
  const query = usePlatformQuery({ key: 'snapshot:team', query: (signal) => services.snapshots.team(signal), staleTime: queryPolicy.account, refetchOnFocus:true });
  if(query.error?.code==='TEAM_WORKSPACE_REQUIRED')return <TeamWorkspacePlaceholder><p>Aktiv komanda iş sahəniz yoxdur. Yeni dəvətləri burada qəbul edə bilərsiniz.</p><a href="/account/profile">Hesab ayarları</a><Suspense fallback={<RouteSkeleton path={pathname}/>}><InvitationsWithoutWorkspace/></Suspense></TeamWorkspacePlaceholder>;
  return <QueryBoundary query={query} workspace>{(value) => <TeamContext.Provider value={value}><TeamRealtime teamId={value.currentTeam.id} original={value.dataSource==='public.teams'} />{children}</TeamContext.Provider>}</QueryBoundary>;
}

export function AdminPlatformProvider({ children }: { children: ReactNode }) {
  const query = usePlatformQuery({ key: 'snapshot:admin', query: (signal) => services.snapshots.admin(signal), staleTime: queryPolicy.account, refetchOnFocus:true });
  return <QueryBoundary query={query}>{(value) => <AdminContext.Provider value={value}>{children}</AdminContext.Provider>}</QueryBoundary>;
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

export { PublicPlatformProvider, usePublicPlatformData } from './PublicPlatformDataContext';
