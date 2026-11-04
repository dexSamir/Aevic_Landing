import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RoomPanel } from '../src/features/tournament-command/RoomPanel';
import { MatchClock } from '../src/features/tournament-command/MatchClock';
import { standingsWindow } from '../src/features/tournament-command/StandingsTable';
import { commandMatch, configuredStages, matchClock, roadmapTime } from '../src/features/tournament-command/model';
import { TeamTournamentDetailPage } from '../src/pages/routes/TeamTournamentDetailPage';
import { deriveTeamCompetitionContexts } from '../src/utils/teamCompetitionContext';
import { fixtureServices, teamSnapshotScenario } from './fixtures/component-services';
import { clearQueryCache } from '../src/services/queryCache';
import { internationalFormula } from '../src/utils/scoring';
import type { TeamPlatformSnapshot, RoomCredentials } from '../src/types/domain';
let data: TeamPlatformSnapshot;
vi.mock('../src/services/PlatformDataContext', () => ({ useTeamPlatformData: () => data, useTeamCompetitionContexts: () => deriveTeamCompetitionContexts(data, new Date()) }));
beforeEach(() => {
  clearQueryCache('all');
  data = structuredClone(teamSnapshotScenario('room-ready'));
  vi.spyOn(fixtureServices.results, 'leaderboard').mockResolvedValue([]);
  vi.spyOn(fixtureServices.results, 'snapshots').mockResolvedValue([]);
  vi.spyOn(fixtureServices.results, 'movement').mockResolvedValue([]);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { vi.useRealTimers(); clearQueryCache('all'); });
const match = () => data.matchSchedule.find(m => m.id === data.currentRoom?.roundId)!;
const page = () => render(<MemoryRouter initialEntries={[`/team/tournaments/${match().tournamentId}`]}><Routes><Route path="/team/tournaments/:tournamentId" element={<TeamTournamentDetailPage />} /></Routes></MemoryRouter>);
it('keeps overdue scheduled rounds, prioritizes declared live, excludes other events and terminal tournaments', () => {
 const first = match(), tournament = data.tournaments.find(t => t.id === first.tournamentId)!;
 const overdue = { ...first, startsAt:'2000-01-01T00:00:00Z', status:'scheduled' as const };
 expect(commandMatch([overdue], tournament)?.id).toBe(first.id);
 expect(commandMatch([overdue, {...first,id:'live',status:'live'}],tournament)?.id).toBe('live');
 expect(commandMatch([{...overdue,tournamentId:'other'}],tournament)).toBeUndefined();
 expect(commandMatch([overdue],{...tournament,status:'cancelled'})).toBeUndefined();
 expect(configuredStages([first,{...first,id:'final',stage:'final'}]).map(s=>s.stage)).toEqual([...new Set([first.stage,'final'])]);
});
it('ticks locally and handles exact start, invalid dates, completed and backend live states honestly', () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-04T10:00:00Z'));
 const m={...match(),status:'scheduled' as const,startsAt:'2026-08-04T10:00:01Z'};
 const {unmount}=render(<MatchClock match={m}/>);
 expect(screen.getByText('00:00:01')).toBeVisible();
 act(()=>vi.advanceTimersByTime(1000)); expect(screen.getByText('Başlama vaxtı çatıb · Status gözlənilir')).toBeVisible();
 expect(matchClock({...m,status:'live'},0)).toBe('CANLI');
 expect(matchClock({...m,startsAt:'bad'},0)).toBe('Vaxt paylaşılmayıb');
 expect(matchClock({...m,status:'completed'},0)).toBe('Matç bitib');
 unmount(); expect(vi.getTimerCount()).toBe(0);
});
it('loads rooms only on demand, masks secrets, cancels old round reads and clears on session change', async () => {
 const m=match(); let resolve!: (room:RoomCredentials)=>void;
 const get=vi.spyOn(fixtureServices.rooms,'getForEligibleTeam').mockImplementation(()=>new Promise(r=>resolve=r));
 const props={tournamentId:m.tournamentId,eligible:true,terminal:false,onVerified:vi.fn()};
 const view=render(<RoomPanel key="first" {...props} match={m}/>);
 expect(get).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button',{name:'Otaq statusunu yoxla'}));
 const signal=get.mock.calls[0][2];
 view.rerender(<RoomPanel key="second" {...props} match={{...m,id:'second'}}/>);
 expect(signal?.aborted).toBe(true);
 await act(async()=>resolve({roundId:m.id,status:'released',releaseAt:m.startsAt,roomId:'old-room',password:'old-secret'}));
 expect(screen.queryByText('old-room')).not.toBeInTheDocument();
 get.mockResolvedValue({roundId:'second',status:'released',releaseAt:m.startsAt,roomId:'test-room',password:'fixture-secret'});
 fireEvent.click(screen.getByRole('button',{name:'Otaq statusunu yoxla'}));
 await screen.findByText('test-room'); expect(screen.queryByText('fixture-secret')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Göstər'})); expect(screen.getByText('fixture-secret')).toBeVisible();
 act(()=>window.dispatchEvent(new Event('aevic:session-change'))); expect(screen.queryByText('fixture-secret')).not.toBeInTheDocument();
 expect(sessionStorage.length).toBe(0); expect(localStorage.length).toBe(0);
});
it.each([['pending',false],['waitlisted',false],['withdrawn',false],['rejected',false],['confirmed',true]] as const)('gates room eligibility for %s participation', async(status,allowed)=>{
 const id=match().tournamentId; data.participations=data.participations.map(p=>p.tournamentId===id?{...p,status}:p);
 page(); expect(screen.queryByRole('button',{name:'Otaq statusunu yoxla'})!==null).toBe(allowed);
});
it('uses per-event check-ins and never carries them to a different tournament or team',()=>{
 const m=match(); data.checkIns=[{...data.checkIn!,tournamentId:m.tournamentId,status:'checked-in'}];
 const contexts=deriveTeamCompetitionContexts(data,new Date());
 expect(contexts.byTournamentId.get(m.tournamentId)?.checkIn?.status).toBe('checked-in');
 for(const c of contexts.all.filter(c=>c.tournament.id!==m.tournamentId))expect(c.checkIn).toBeUndefined();
 data.checkIns=[{...data.checkIns[0],teamId:'other'}];data.checkIn=undefined;
 expect(deriveTeamCompetitionContexts(data,new Date()).byTournamentId.get(m.tournamentId)?.checkIn).toBeUndefined();
});
it('renders saved scoring, no fake rank, official corrections on refresh, and tournament-only results',async()=>{
 const id=match().tournamentId;const t=data.tournaments.find(t=>t.id===id)!;t.pointFormula={...internationalFormula,finishPointValue:2,wwcdBonus:3};
 const row={tournamentId:id,teamId:data.currentTeam.id,placement:2,matches:1,wwcd:0,finishes:4,placementPoints:6,finishPoints:8,penalties:1,totalPoints:13,bestFinish:2};
 const get=vi.spyOn(fixtureServices.results,'leaderboard').mockResolvedValueOnce([row,{...row,tournamentId:'other',totalPoints:999}]).mockResolvedValue([{...row,totalPoints:15}]);
 page(); await waitFor(()=>expect(document.querySelector('.is-own-team td[data-label="Xal"]')).toHaveTextContent('13')); expect(screen.queryByText('999')).not.toBeInTheDocument();
 fireEvent.click(screen.getByText('Xallar necə hesablanır?'));
 expect(screen.getByText(/WWCD bonusu: 3 xal/)).toBeVisible();
 expect(document.querySelector('.command-kill-points')).toHaveTextContent('2 xal');
 fireEvent.click(screen.getByRole('button',{name:'Sıralamanı yenilə'}));await waitFor(()=>expect(document.querySelector('.is-own-team td[data-label="Xal"]')).toHaveTextContent('15'));expect(get).toHaveBeenCalledTimes(2);
 expect(screen.queryByText('#0')).not.toBeInTheDocument();
});
it('switches tournaments without retaining selected-room state and blocks member writes',async()=>{
 data.workspaceRole='PLAYER';const current=match().tournamentId;
 page(); expect(screen.queryByRole('button',{name:'Turnirdən çıx'})).not.toBeInTheDocument();
 const other=data.participations.find(p=>p.tournamentId!==current)!;
 fireEvent.click(document.querySelector(`.command-tournaments a[href="/team/tournaments/${other.tournamentId}"]`)!);
 await waitFor(()=>expect(document.querySelector('.command-tournaments a[aria-current="page"]')).toHaveAttribute('href', `/team/tournaments/${other.tournamentId}`));
 expect(screen.queryByRole('button',{name:'Göstər'})).not.toBeInTheDocument();
});
it('expires in-memory credentials and never mistakes release time for server readiness', async()=>{
 vi.useFakeTimers();
 const m=match();const get=vi.spyOn(fixtureServices.rooms,'getForEligibleTeam').mockResolvedValue({roundId:m.id,status:'locked',reason:'not-configured',releaseAt:'2000-01-01T00:00:00Z'});
 render(<RoomPanel tournamentId={m.tournamentId} match={m} eligible terminal={false} onVerified={vi.fn()}/>);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Otaq statusunu yoxla'})));
 expect(screen.getByText('Admin otaq məlumatlarını hələ daxil etməyib')).toBeVisible();
 expect(screen.queryByRole('button',{name:'Göstər'})).not.toBeInTheDocument();
 get.mockResolvedValue({roundId:m.id,status:'released',releaseAt:m.startsAt,roomId:'lease-fixture',password:'lease-secret'});
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Otaq statusunu yoxla'})));
 expect(screen.getByText('lease-fixture')).toBeVisible();
 act(()=>vi.advanceTimersByTime(60_000));expect(screen.queryByText('lease-fixture')).not.toBeInTheDocument();
});
it('shows only verified announcements for the selected event and clears room access after check-in revocation',async()=>{
 const id=match().tournamentId;
 data.teamAnnouncements=[{...data.teamAnnouncements[0],id:'scoped',title:'Scoped update',entityRef:{type:'tournament',id},expiresAt:undefined},{...data.teamAnnouncements[0],id:'other',title:'Unrelated update',entityRef:{type:'tournament',id:'other'},expiresAt:undefined}];
 const view=page();expect(screen.getByText('Scoped update')).toBeVisible();expect(screen.queryByText('Unrelated update')).not.toBeInTheDocument();
 data={...data,checkIn:{...data.checkIn!,status:'missed'}};
 view.rerender(<MemoryRouter initialEntries={[`/team/tournaments/${id}`]}><Routes><Route path="/team/tournaments/:tournamentId" element={<TeamTournamentDetailPage/>}/></Routes></MemoryRouter>);
 expect(screen.queryByRole('button',{name:'Otaq statusunu yoxla'})).not.toBeInTheDocument();
});

it('windows official rankings around the team and fills five rows at both edges', () => {
 const rows=Array.from({length:12},(_,index)=>({teamId:String(index+1)}));
 for(const [team,expected] of [['1',['1','2','3','4','5']],['2',['1','2','3','4','5']],['3',['1','2','3','4','5']],['7',['5','6','7','8','9']],['6',['4','5','6','7','8']],['11',['8','9','10','11','12']],['12',['8','9','10','11','12']]] as const) {
  const preview = standingsWindow(rows,team);
  expect(preview.map(row=>row.teamId)).toEqual(expected);
  expect(new Set(preview).size).toBe(5);
  expect(preview.every(row=>rows.includes(row))).toBe(true);
 }
 expect(standingsWindow(rows.slice(0,3),'2')).toEqual(rows.slice(0,3));
 expect(standingsWindow(rows,'missing')).toEqual(rows.slice(0,5));
 expect(standingsWindow([],'missing')).toEqual([]);
});

it('keeps room metadata out of the status panel and displays truthful roadmap details',()=>{
 page();
 expect(document.querySelector('.command-room-body')).not.toHaveTextContent('Açılma vaxtı:');
 expect(document.querySelector('.command-room-body')).not.toHaveTextContent(/Raund \d/);
 expect(document.querySelector('.command-progress')).not.toHaveTextContent('Heyət kilidi:');
 expect(roadmapTime('2026-11-18T08:10:00Z')).toBe('18 noyabr · 12:10');
 expect(roadmapTime(undefined,'Təsdiqlənib')).toBe('Təsdiqlənib');
 expect(roadmapTime('invalid')).toBe('Vaxt paylaşılmayıb');
});

it('preserves official standings on refresh failure, prevents pending duplicates and stops the busy state', async () => {
 const id=match().tournamentId;
 const row={tournamentId:id,teamId:data.currentTeam.id,placement:2,matches:1,wwcd:0,finishes:4,placementPoints:6,finishPoints:8,penalties:1,totalPoints:13,bestFinish:2};
 let reject!: (error:Error)=>void;
 const get=vi.spyOn(fixtureServices.results,'leaderboard').mockResolvedValueOnce([row]).mockImplementation(()=>new Promise((_resolve,rejectRequest)=>{reject=rejectRequest;}));
 page();
 await waitFor(()=>expect(document.querySelector('.is-own-team td[data-label="Xal"]')).toHaveTextContent('13'));
 const refresh=screen.getByRole('button',{name:'Sıralamanı yenilə'});
 fireEvent.click(refresh);
 await waitFor(()=>expect(refresh).toBeDisabled());
 fireEvent.click(refresh);
 expect(get).toHaveBeenCalledTimes(2);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 await act(async()=>reject(new Error('Refresh failed')));
 // Query policy retries transient errors once; reject that request too.
 await waitFor(()=>expect(get).toHaveBeenCalledTimes(3));
 await act(async()=>reject(new Error('Refresh failed')));
 await waitFor(()=>expect(refresh).toHaveAttribute('aria-busy','false'));
 expect(screen.getByText(/Yenilənmə alınmadı/)).toBeVisible();
 expect(document.querySelector('.is-own-team td[data-label="Xal"]')).toHaveTextContent('13');
});
