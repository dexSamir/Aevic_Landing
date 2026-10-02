import { Hono } from 'hono';
import type { Env } from '../types';
import { routeManifest } from '../../src/app/routeManifest';
import { PlatformRepository } from '../platform/repository';
import { ProductionTeams } from '../services/productionTeams';
import { organizations } from '../services/identity';

const app = new Hono<Env>();
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
app.get('/sitemap.xml', async c => {
  const config = c.get('config');
  const paths = new Set<string>();
  if (config.indexableDeployment) {
    for (const route of routeManifest) if (route.indexable && !route.path.includes(':')) paths.add(route.path);
    const platform = c.get('platform');
    // Sitemap visibility never inherits the requesting administrator/captain.
    if (platform) {
      const publicRepo = new PlatformRepository(c.get('db'), platform.sql);
      const [teams, tournaments, orgs] = await Promise.all([publicRepo.teams(), publicRepo.tournaments(), organizations(publicRepo)]);
      for (const team of teams) paths.add(`/teams/${encodeURIComponent(team.slug ?? team.id)}`);
      for (const tournament of tournaments) paths.add(`/tournaments/${encodeURIComponent(tournament.id)}`);
      for (const organization of orgs) paths.add(`/organizations/${encodeURIComponent(organization.slug)}`);
    } else {
      for (const team of await new ProductionTeams(c.get('db')).teams()) paths.add(`/teams/${encodeURIComponent(team.id)}`);
    }
  }
  c.header('Content-Type', 'application/xml; charset=utf-8');
  return c.body('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + [...paths].map(path => `<url><loc>${xml(new URL(path, config.siteUrl).href)}</loc></url>`).join('') + '</urlset>');
});
export default app;
