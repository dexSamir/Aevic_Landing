import { appendFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { test, expect } from '../helpers/api-fixture-test';
import { routeManifest } from '../../src/app/routeManifest';

const parameters: Record<string, string> = { teamSlug: 'caspian-wolves', tournamentId: 'daily-cup-24', matchId: 'dc24-r1', organizationSlug: 'caspian-vanguard', requestId: 'RC-0021', disputeId: 'DSP-0007', badgeId: 'ach-top-four', ticketId: 'SUP-1042', year: '2026', teamId: 'team-01', resultId: 'result-1', playerId: 'p1', recordId: 'record-1', verificationId: 'verification-1' };
for (const definition of routeManifest) {
  test(`${definition.id}: ${definition.path}`, async ({ page }, info) => {
    // The existing HTTP fixtures contain synthetic identities only. No live writes.
    const path = definition.path === '*' ? '/not-a-route' : definition.path.replace(/:([A-Za-z]+)/g, (_, key) => parameters[key] || 'unknown');
    const errors: string[] = [], requests: string[] = [];
    const assets: Array<{ url: string; type: string; bytes: number; gzipBytes: number }> = [];
    const bodies: Promise<void>[] = [];
    page.on('response', response => {
      const type = response.request().resourceType();
      if (['script', 'stylesheet', 'image', 'font'].includes(type)) bodies.push(response.body().then(body => { assets.push({ url: new URL(response.url()).pathname, type, bytes: body.length, gzipBytes: gzipSync(body).length }); }).catch(() => {}));
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(new URL(request.url()).pathname); });
    await page.addInitScript(() => {
      const metrics = { lcp: 0, cls: 0 }; (window as any).__perf = metrics;
      new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries() as any) if (!entry.hadRecentInput) metrics.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.locator('h1,h2').first().waitFor();
    await page.waitForTimeout(300);
    await Promise.all(bodies);
    const metrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return { ...(window as any).__perf, jsBytes: resources.filter(r => /\.js(?:$|\?)/.test(r.name)).reduce((n, r) => n + r.encodedBodySize, 0), cssBytes: resources.filter(r => /\.css(?:$|\?)/.test(r.name)).reduce((n, r) => n + r.encodedBodySize, 0), scripts: resources.filter(r => /\.js(?:$|\?)/.test(r.name)).map(r => r.name.split('/').pop()), overflow: document.documentElement.scrollWidth > innerWidth + 1, heading: document.querySelector('h1,h2')?.textContent, images: [...document.images].filter(i => i.complete && i.currentSrc && !i.naturalWidth).map(i => i.currentSrc) };
    });
    // HTTP responses remain measurable when the fixture clock replaces Performance APIs.
    const sum = (type: string, field: 'bytes' | 'gzipBytes' = 'bytes') => assets.filter(a => a.type === type).reduce((n, a) => n + a[field], 0);
    appendFileSync(process.env.PERF_OUTPUT || '/tmp/aevic-performance-after.jsonl', JSON.stringify({ id: definition.id, path, device: info.project.name, ...metrics, jsBytes: sum('script'), jsGzipBytes: sum('script', 'gzipBytes'), cssBytes: sum('stylesheet'), cssGzipBytes: sum('stylesheet', 'gzipBytes'), imageBytes: sum('image'), assets, scripts: assets.filter(a => a.type === 'script').map(a => a.url), requests, errors }) + '\n');
    expect(errors).toEqual([]);
    // Record existing overflow/broken fixture assets separately from regressions.
    expect(metrics.heading).toBeTruthy();
  });
}
