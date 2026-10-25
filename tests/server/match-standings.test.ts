import { Hono } from 'hono';
import { expect, it } from 'vitest';
import routes from '../../server/routes/public';
import type { Env } from '../../server/types';
import type { PlatformRepository } from '../../server/platform/repository';
import type { RoundResult } from '../../src/types/domain';
const result = (teamId: string, placement: number, finishes: number, published = true): RoundResult => ({ id: teamId, teamId, roundId: '30000000-0000-4000-8000-000000000001', tournamentId: 'cup', placement, finishes, placementPoints: 10, finishPoints: finishes, penalties: 2, totalPoints: 10 + finishes - 2, published });
function app(publishedAt: string | null) {
 const app = new Hono<Env>();
 const repo = {
  schedule: async () => [{ id: '30000000-0000-4000-8000-000000000001', tournamentId: 'cup' }],
  tournament: async () => ({ id: 'cup', name: 'Cup', shortName: 'Cup' }),
  rows: async () => [{ id: '30000000-0000-4000-8000-000000000001', published_at: publishedAt }],
  results: async () => [result('a', 1, 1), result('b', 2, 8), result('draft', 3, 50, false), { ...result('foreign', 4, 90), tournamentId: 'other' }],
  teams: async () => [{ id: 'a', name: 'Alpha', slug: 'alpha' }, { id: 'b', name: 'Beta', slug: 'beta' }],
 };
 app.use('*', async (c, next) => { c.set('platform', repo as unknown as PlatformRepository); await next(); });
 app.route('/', routes); return app;
}
it('adds official match points ranking while preserving game placement, penalties and identity', async () => {
 const response = await app('2026-10-01').request('/matches/30000000-0000-4000-8000-000000000001');
 expect(response.status).toBe(200);
 const body = await response.json();
 expect(body.standings.map((row: {teamId: string}) => row.teamId)).toEqual(['b', 'a']);
 expect(body.standings[0]).toMatchObject({ placement: 1, finishes: 8, wwcd: 0, placementPoints: 10, penalties: 2, totalPoints: 16 });
 expect(body.teamResults.find((row: {teamId: string}) => row.teamId === 'a')).toMatchObject({ placement: 1, wwcd: true, teamSlug: 'alpha' });
});
it('never exposes rows before the match publication even if individual rows are flagged published', async () => {
 const response = await app(null).request('/matches/30000000-0000-4000-8000-000000000001');
 expect(await response.json()).toMatchObject({ published: false, teamResults: [], standings: [] });
});
