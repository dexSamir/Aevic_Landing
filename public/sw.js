const CACHE_PREFIX = 'aevic-public-';
const CACHE_NAME = CACHE_PREFIX + '__BUILD_VERSION__';
const OFFLINE_PAGE = '/offline.html';
const STATIC_SHELL = [OFFLINE_PAGE, '/offline.css', '/manifest.webmanifest', '/icons/aevic-192.png', '/icons/aevic-512.png'];
const PRIVATE_ROOTS = ['api', 'auth', 'team', 'account', 'admin', 'login', 'register', 'forgot-password', 'reset-password', 'verify-email', 'session-expired', 'account-locked'];

function privatePath(pathname) {
  let path; try { path = decodeURIComponent(pathname).replace(/\\/g, '/'); } catch { return true; }
  const segments = path.toLowerCase().split('/').filter(Boolean);
  return PRIVATE_ROOTS.includes(segments[0]) || segments.some((part) => ['room', 'rooms', 'credentials', 'messages'].includes(part));
}
function staticAsset(request, url) {
  return !url.search && (STATIC_SHELL.includes(url.pathname) || /^\/assets\/[\w.-]+\.(?:js|css|woff2|png|webp|avif|jpg|svg)$/.test(url.pathname));
}
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(STATIC_SHELL.map(async (path) => {
      const response = await fetch(path, { cache: 'reload' });
      if (!response.ok || /private|no-store/i.test(response.headers.get('cache-control') || '')) throw new Error('Offline shell unavailable');
      await cache.put(path, response);
    }));
  })());
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || privatePath(url.pathname)) return;
  if (request.mode === 'navigate') {
    // Never store HTML navigations. Public and private pages cannot alias '/'.
    event.respondWith(fetch(request).catch(async () => {
      const offline = await (await caches.open(CACHE_NAME)).match(OFFLINE_PAGE);
      return offline || new Response('Offline — reconnect to continue.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
    return;
  }
  if (!staticAsset(request, url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && !response.redirected && !/private|no-store/i.test(response.headers.get('cache-control') || '') && !/text\/html/i.test(response.headers.get('content-type') || '')) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
