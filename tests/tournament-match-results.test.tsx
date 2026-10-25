import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { TournamentResults } from '../src/components/competition/TournamentResults';
import { services } from '../src/services';
import { clearQueryCache } from '../src/services/queryCache';
import { tournamentMatches } from '../src/utils/tournamentMatches';
import { scoreMatch, placementPointGroups } from '../src/utils/scoring';
import { tournaments, matchSchedule, matchHistory, teams, leaderboard } from './fixtures/platform-data';
vi.mock('../src/services/PublicSessionContext', () => ({ usePublicSession: () => ({ team: null }) }));
beforeEach(() => clearQueryCache('all'));
const cup = tournaments[0].id;
const overall = [{ ...leaderboard[0], tournamentId: cup, finishes: 30, totalPoints: 90 }];
const matchRow = { ...overall[0], finishes: 3, matches: 1, totalPoints: 13 };
function mount(url = `/tournaments/${cup}`) {
 return render(<MemoryRouter initialEntries={[url]}><TournamentResults standings={overall} teams={teams} teamNames={[]} tournamentId={cup} matches={tournamentMatches(cup, matchSchedule, [])} /></MemoryRouter>);
}
it('uses canonical schedule, deduplicates history and preserves repeated maps', () => {
 const history = { ...matchHistory[0], id: matchSchedule[0].id, tournamentId: cup, playedAt: matchSchedule[0].startsAt };
 const rows = tournamentMatches(cup, [...matchSchedule].reverse(), [history, history, matchHistory[0]]);
 expect(rows.map(row => row.id)).toEqual(matchSchedule.map(row => row.id));
 expect(rows[0]).toMatchObject({ day: 1, round: 1, status: 'completed' });
});
it('calculates configured kill multipliers, win bonuses, zero placement and penalties', () => {
 const formula = { ...tournaments[0].pointFormula, placement: [{ placement: 1, points: 10 }], finishPointValue: 2, wwcdBonus: 3 };
 expect(scoreMatch(formula, 1, 8, 2)).toEqual({ placementPoints: 13, finishPoints: 16, totalPoints: 27 });
 expect(scoreMatch(formula, 99, 0)).toEqual({ placementPoints: 0, finishPoints: 0, totalPoints: 0 });
});
it('switches actual results, caches revisits, supports keyboard selection and protects unpublished data', async () => {
 const get = vi.spyOn(services.publicMatches, 'get').mockImplementation(async id => ({ match: matchSchedule.find(row => row.id === id)!, tournament: tournaments[0], published: id === matchSchedule[0].id, standings: [matchRow], teamResults: [] }));
 mount();
 expect(screen.getByRole('tab', { name: 'Ümumi' })).toHaveAttribute('aria-selected', 'true');
 expect(screen.getByText('90 xal')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('tab', { name: 'Matç 1' }));
 await screen.findByText('13 xal');
 expect(screen.queryByText('90 xal')).not.toBeInTheDocument();
 fireEvent.keyDown(screen.getByRole('tab', { name: 'Matç 1' }), { key: 'ArrowRight' });
 await screen.findByRole('heading', { name: 'Bu matçın nəticələri hələ elan edilməyib.' });
 expect(screen.queryByText('13 xal')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('tab', { name: 'Matç 1' }));
 await screen.findByText('13 xal');
 expect(get).toHaveBeenCalledTimes(2);
});
it('honors direct match links and recovers from failures', async () => {
 const get = vi.spyOn(services.publicMatches, 'get').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ match: matchSchedule[0], tournament: tournaments[0], published: true, standings: [matchRow], teamResults: [] });
 mount(`/?match=${matchSchedule[0].id}`);
 await screen.findByRole('heading', { name: 'Nəticələr yüklənmədi' });
 fireEvent.click(screen.getByRole('button', { name: 'Yenidən cəhd et' }));
 await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
 await screen.findByText('13 xal');
});

it('groups only adjacent equal placement rules, including unscored remaining slots', () => {
 expect(placementPointGroups({ ...tournaments[0].pointFormula, placement: [{ placement: 1, points: 10 }, { placement: 2, points: 5 }, { placement: 3, points: 5 }, { placement: 5, points: 2 }] }, 7)).toEqual([
  { first: 1, last: 1, points: 10 }, { first: 2, last: 3, points: 5 }, { first: 4, last: 4, points: 0 }, { first: 5, last: 5, points: 2 }, { first: 6, last: 7, points: 0 },
 ]);
});
