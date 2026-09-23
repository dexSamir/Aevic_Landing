import { useLocation } from 'react-router-dom';
import { createContext, type ReactNode, useContext, useEffect } from 'react';
import { Button, EmptyState, LoadingSkeleton } from '../components/common/primitives';
import type { ApiError } from './apiError';
import type { AdminPlatformSnapshot, PublicPlatformSnapshot, TeamPlatformSnapshot } from '../types/domain';
import { competitionNow, services } from '.';
import { queryPolicy, usePlatformQuery, invalidateQuery } from './queryCache';
import { deriveTeamCompetitionContexts } from '../utils/teamCompetitionContext';

const PublicContext = createContext<PublicPlatformSnapshot | null>(null);
const TeamContext = createContext<TeamPlatformSnapshot | null>(null);
const AdminContext = createContext<AdminPlatformSnapshot | null>(null);

function QueryBoundary<T>({ query, children }: { query: { data?: T; loading: boolean; error?: ApiError; retryAfterSeconds: number; refetch: () => void }; children: (value: T) => ReactNode }) {
  if (query.loading && !query.data) return <div className="route-loading"><LoadingSkeleton rows={5} /></div>;
  if (!query.data) return <div className="route-loading"><EmptyState heading="h1" title="Platform məlumatı yüklənmədi" body={query.error?.code==='SERVER_NOT_CONFIGURED'?'Platform xidməti hələ konfiqurasiya edilməyib.':'Məlumat servisi hazırda cavab vermir.'} action={query.error?.retryable ? <Button disabled={query.retryAfterSeconds > 0} onClick={query.refetch}>{query.retryAfterSeconds > 0 ? `${query.retryAfterSeconds} san. sonra yoxla` : 'Yenidən yoxla'}</Button> : undefined} />{query.error?.requestId && <small>Sorğu kodu: {query.error.requestId}</small>}</div>;
  return <>{query.error && <p role="status" className="connectivity-status">Yenilənmə alınmadı. Son yüklənmiş məlumat göstərilir. <Button variant="ghost" onClick={query.refetch}>Yenidən yoxla</Button></p>}{children(query.data)}</>;
}

export function PublicPlatformProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(()=>{const timer=setInterval(()=>{if(navigator.onLine&&document.visibilityState==='visible')invalidateQuery('');},60_000);return()=>clearInterval(timer);},[]);
  const query = usePlatformQuery({ key: 'snapshot:public', scope: 'public', query: (signal) => services.snapshots.public(signal), staleTime: queryPolicy.publicCompetition, refetchOnFocus:true });
  return <QueryBoundary query={query}>{(value) => <PublicContext.Provider value={value}>{value.unavailable && /^\/(tournaments|leaderboard|matches|archive|records|organizations)(\/|$)|^\/teams\/compare$/.test(pathname) ? <div className="page-section container"><EmptyState heading="h1" title="Yarış məlumatları hələ əlçatan deyil" body="Komanda profilləri əlçatandır. Turnir, matç və sıralama məlumatlarının bağlantısı hələ tamamlanmayıb." /></div> : <>{children}{value.unavailable && <p role="status" className="container public-team-note">Komanda məlumatları mövcud bazadan göstərilir. Yarış tarixçəsi və hesab əməliyyatları hələ əlçatan deyil.</p>}</>}</PublicContext.Provider>}</QueryBoundary>;
}

export function TeamPlatformProvider({ children }: { children: ReactNode }) {
  const query = usePlatformQuery({ key: 'snapshot:team', query: (signal) => services.snapshots.team(signal), staleTime: queryPolicy.account, refetchOnFocus:true });
  return <QueryBoundary query={query}>{(value) => <TeamContext.Provider value={value}><TeamRealtime teamId={value.currentTeam.id} />{children}</TeamContext.Provider>}</QueryBoundary>;
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

function TeamRealtime({teamId}:{teamId:string}) {
 useEffect(()=>{const controller=new AbortController();const refresh=()=>{if(navigator.onLine&&document.visibilityState==='visible')invalidateQuery('snapshot:team');};const polling=setInterval(refresh,60_000);window.addEventListener('online',refresh);void import('./realtime').then(m=>m.subscribeTeam(teamId,controller.signal)).catch(()=>{ /* Reads still work if Realtime cannot connect. */ });return()=>{controller.abort();clearInterval(polling);window.removeEventListener('online',refresh);};},[teamId]);return null;
}
