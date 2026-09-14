import { describe, expect, it } from 'vitest';
import { mockServices } from '../src/services/mockAdapter';
import { deriveTeamCompetitionContexts } from '../src/utils/teamCompetitionContext';
import { buildTeamOverview } from '../src/utils/teamOverview';

const now = new Date('2026-08-04T12:00:00+04:00');
describe('captain overview domain projection', () => {
  it('keeps missing competition, history and updates empty', async () => {
    const source = await mockServices.snapshots.team();
    const vm = buildTeamOverview({ ...source, matchHistory: [], notifications: [], adminMessages: [], teamAnnouncements: [] });
    expect(vm.nextAction).toMatchObject({ title: 'AKTİV TURNİR YOXDUR', href: '/tournaments' });
    expect(vm.rounds).toEqual([]);
    expect(vm.standings).toEqual([]);
    expect(vm.recentMatches).toEqual([]);
    expect(vm.updates).toEqual([]);
    expect(vm.tournamentHref).toBeUndefined();
  });
  it('never borrows another tournament ranking or pads the real match history', async () => {
    const source = await mockServices.snapshots.team();
    const context = deriveTeamCompetitionContexts(source, now).current!;
    const vm = buildTeamOverview(source, context);
    expect(vm.standings).toEqual([]);
    expect(vm.currentStanding).toBeUndefined();
    expect(vm.recentMatches).toHaveLength(source.matchHistory.length);
    expect(vm.recentMatches.map(match => match.id)).toEqual(source.matchHistory.map(match => match.id));
    expect(vm.rounds).toEqual(context.matches);
  });
  it('centers real standings on the current team and keeps profile blockers ahead of the match', async () => {
    const source = await mockServices.snapshots.team();
    const context = deriveTeamCompetitionContexts(source, now).current!;
    const leaderboard = Array.from({ length: 9 }, (_, i) => ({ ...source.leaderboard[0], tournamentId: context.tournament.id, teamId: i === 4 ? source.currentTeam.id : `competitor-${i}`, placement: i + 1, totalPoints: 100 - i }));
    const vm = buildTeamOverview({ ...source, leaderboard, currentTeam: { ...source.currentTeam, profileComplete: false } }, context);
    expect(vm.standings.map(row => row.placement)).toEqual([3, 4, 5, 6, 7]);
    expect(vm.currentStanding).toMatchObject({ placement: 5, points: 96, current: true });
    expect(vm.nextAction).toMatchObject({ kind: 'blocking', href: '/team/profile' });
  });
});
