// Test-only static hosting: Netlify route files, generated CSP and cache headers.
// The public-context response is an explicit empty fixture. No database is used.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist');
const headers = await readFile(resolve(root, '_headers'), 'utf8');
const csp = headers.match(/Content-Security-Policy: (.+)/)[1];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const emptyContext = Object.fromEntries(['tournaments', 'teams', 'organizations', 'leaderboard', 'leaderboardTeams', 'playerPerformances', 'teamComparisonRecords', 'teamAchievements'].map((key) => [key, []]));

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4176');
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
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
    catch { status = 404; file = resolve(root, '404.html'); }
    res.setHeader('Cache-Control', url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.writeHead(status, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(500); res.end('Test host failed'); }
}).listen(4176, '127.0.0.1', () => console.log('Public build test host: http://127.0.0.1:4176'));
