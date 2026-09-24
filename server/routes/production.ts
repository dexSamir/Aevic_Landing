import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, ApiContext } from '../types';
import { ServiceError } from '../errors';
import { ProductionTeams } from '../services/productionTeams';

const app = new Hono<Env>();
const repo = (c: ApiContext) => new ProductionTeams(c.get('db'));
export const unavailable = {
  tournaments: 'TOURNAMENT_STATE_CONTRACT_UNAVAILABLE',
  standings: 'TOURNAMENT_STATE_CONTRACT_UNAVAILABLE',
  matches: 'TOURNAMENT_STATE_CONTRACT_UNAVAILABLE',
  organizations: 'ORIGINAL_CONTRACT_UNAVAILABLE',
  achievements: 'ORIGINAL_CONTRACT_UNAVAILABLE',
};
app.get('/public/context', async c => c.json({
  teams: await repo(c).summaries(),
  // Compatibility containers, explicitly unavailable, never represented as verified zero counts.
  tournaments: [], organizations: [], leaderboard: [], leaderboardTeams: [], playerPerformances: [], teamComparisonRecords: [], teamAchievements: [],
  dataSource: 'public.teams', unavailable,
}));
app.get('/public/teams', async c => {
  const q = z.string().max(100).parse(c.req.query('search') ?? '').toLocaleLowerCase('az-AZ');
  return c.json((await repo(c).summaries()).filter(t => t.name.toLocaleLowerCase('az-AZ').includes(q)));
});
app.get('/public/teams/:id', async c => c.json(await repo(c).profile(c.req.param('id'))));
app.get('/public/teams/:id/matches', async c => {
  c.header('X-History-Scope', 'public.teams.match_results');
  return c.json(await repo(c).history(c.req.param('id')));
});
app.get('/public/teams/:id/form', async c => { const r = repo(c); await r.history(c.req.param('id')); return c.json((await r.profile(c.req.param('id'))).form); });
app.get('/public/teams/:id/map-specialization', async c => { const r = repo(c); await r.history(c.req.param('id')); return c.json((await r.profile(c.req.param('id'))).mapSpecialization); });
for (const suffix of ['seasons','map-performance']) app.get(`/public/teams/:id/${suffix}`, async c => { await repo(c).history(c.req.param('id')); return c.json([]); });
app.get('/public/teams/:id/upcoming-match', async c => { await repo(c).team(c.req.param('id')); throw new ServiceError(501, unavailable.matches); });
app.get('/search', async c => {
  const q = z.string().max(100).parse(c.req.query('q') ?? '');
  const teams = await repo(c).teams();
  return c.json({ query: q, groups: { team: teams.filter(t => t.name.toLocaleLowerCase('az-AZ').includes(q.toLocaleLowerCase('az-AZ'))).slice(0,30).map(t => ({id:t.id,type:'team',title:t.name,href:`/teams/${t.id}`})), tournament: [] }, unavailable: {tournament: unavailable.tournaments} });
});
app.get('/registrations/team-name', async c => {
  const name = z.string().trim().min(2).max(60).parse(c.req.query('name'));
  return c.json({ available: !(await repo(c).teams()).some(t => t.name.toLocaleLowerCase('az-AZ') === name.toLocaleLowerCase('az-AZ')), normalizedName: name, scope:'platform', source:'backend' });
});
// No normalized-schema routers are mounted. Never submit credentials to a different
// authentication system or fall through to aevic.command/claiming/service-role access.
app.all('*', c => {
  const path = c.req.path.replace(/^\/api/, '');
  const code = /^(\/auth|\/me|\/admin|\/registrations|\/teams\/[^/]+$)/.test(path)
    ? 'ORIGINAL_AUTH_CONTRACT_UNAVAILABLE' : /^(\/tournaments|\/matches|\/leaderboards|\/archive)/.test(path)
      ? unavailable.tournaments : 'ORIGINAL_CONTRACT_UNAVAILABLE';
  c.header('X-Retryable','false');
  throw new ServiceError(501, code);
});
export default app;
