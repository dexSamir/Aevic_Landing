// Test-only static hosting: Netlify route files, generated CSP and cache headers.
// The public-context response is an explicit empty fixture. No database is used.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(process.env.AEVIC_TEST_BUILD_ROOT || 'dist');
const port=Number(process.env.AEVIC_TEST_BUILD_PORT || 4176);
const headers = await readFile(resolve(root, '_headers'), 'utf8');
const csp = headers.match(/Content-Security-Policy: (.+)/)[1];
const routes = JSON.parse(await readFile(resolve(root, 'route-manifest.json'), 'utf8'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const emptyContext = Object.fromEntries(['tournaments', 'teams', 'organizations', 'leaderboard', 'leaderboardTeams', 'playerPerformances', 'teamComparisonRecords', 'teamAchievements'].map((key) => [key, []]));

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4176');
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (url.pathname.startsWith('/api/') && process.env.AEVIC_TEST_API_FIXTURES) {
      const fixtures = JSON.parse(await readFile(process.env.AEVIC_TEST_API_FIXTURES, 'utf8'));
      const fixture = fixtures[url.pathname + url.search] ?? fixtures[url.pathname];
      if (fixture) { res.writeHead(fixture.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(fixture.body)); return; }
    }
    if (url.pathname === '/.netlify/images') {
      const source = url.searchParams.get('url');
      if (source?.startsWith('/assets/') && !source.includes('..')) {
        res.writeHead(307, { Location: source }); res.end(); return;
      }
      res.writeHead(400); res.end(); return;
    }
    if (url.pathname === '/api/public/context') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(emptyContext)); return;
    }
    if (url.pathname === '/api/records') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end('[]'); return;
    }
    if (url.pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"code":"API_ROUTE_NOT_FOUND"}'); return;
    }
    // Exercise a previous worker under the real scope without altering dist.
    if (url.pathname === '/sw.js' && url.searchParams.has('previous')) {
      const previous = (await readFile('public/sw.js', 'utf8')).replaceAll('__BUILD_VERSION__', 'test-previous-build');
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' }); res.end(previous); return;
    }
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    let status = 200;
    try { if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html'); await stat(file); }
    catch {
      const known = routes.some(route => route.path !== '*' && route.path.split('/').length === url.pathname.split('/').length && route.path.split('/').every((part,index) => part.startsWith(':') ? Boolean(url.pathname.split('/')[index]) : part === url.pathname.split('/')[index]));
      status = known ? 200 : 404; file = resolve(root, known ? 'index.html' : '404.html');
    }
    res.setHeader('Cache-Control', url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    const type=mime[extname(file)] || 'application/octet-stream';
    let content=await readFile(file);
    if (/gzip/.test(req.headers['accept-encoding'] || '') && /text\/|javascript|json|svg/.test(type)) {
      content=gzipSync(content);res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');
    }
    res.writeHead(status, { 'Content-Type': type });res.end(content);
  } catch { res.writeHead(500); res.end('Test host failed'); }
}).listen(port, '127.0.0.1', () => console.log(`Public build test host: http://127.0.0.1:${port}`));
