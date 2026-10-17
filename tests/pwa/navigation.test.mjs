import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

// Isolated browser and origin: never connects to production or loads credentials.
test('navigation failure while online, recovery, and worker update', async () => {
  let failure = false;
  let version = 'previous';
  const worker = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (failure && ['/', '/login', '/api/public/context'].includes(path)) return req.socket.destroy();
    res.setHeader('Cache-Control', 'no-cache');
    if (path === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript');
      return res.end(worker.replaceAll('__BUILD_VERSION__', version));
    }
    if (path === '/offline.html') {
      res.setHeader('Content-Type', 'text/html');
      return res.end(readFileSync(new URL('../../public/offline.html', import.meta.url)));
    }
    if (path === '/unavailable') { res.statusCode = 503; return res.end('Upstream unavailable'); }
    if (path.startsWith('/assets/')) {
      res.setHeader('Content-Type', 'application/javascript');
      return res.end('/* immutable asset */');
    }
    res.setHeader('Content-Type', path === '/' ? 'text/html' : 'text/plain');
    res.end(path === '/' ? '<title>Online shell</title><h1>Online shell</h1>' : 'ok');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.reload();
    assert.equal(await page.title(), 'Online shell');
    await page.evaluate(() => fetch('/assets/old.js'));
    failure = true;
    const fallback = await page.reload();
    assert.equal(fallback.fromServiceWorker(), true);
    assert.equal(await page.evaluate(() => navigator.onLine), true);
    assert.match(await page.title(), /Bağlantı yoxdur/);
    const fresh = await browser.newContext();
    const freshPage = await fresh.newPage();
    await assert.rejects(freshPage.goto(origin), /ERR_EMPTY_RESPONSE/);
    await fresh.close();
    assert.equal(await page.evaluate(async () => {
      try { await fetch('/api/public/context'); return 'unexpected'; } catch { return 'rejected'; }
    }), 'rejected');
    const privatePage = await context.newPage();
    await assert.rejects(privatePage.goto(origin + '/login'), /ERR_EMPTY_RESPONSE/);
    await privatePage.close();
    failure = false;
    await page.goto(origin);
    assert.equal(await page.title(), 'Online shell');
    const unavailable = await page.goto(origin + '/unavailable');
    assert.equal(unavailable.status(), 503);
    assert.equal(await page.locator('body').innerText(), 'Upstream unavailable');
    await page.goto(origin);
    version = 'current';
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
    assert.ok((await page.evaluate(() => caches.keys())).includes('aevic-public-previous'));
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting.postMessage({ type: 'ACTIVATE_UPDATE' }));
    await page.waitForFunction(async () => !(await caches.keys()).includes('aevic-public-previous'));
    await page.reload();
    assert.equal(await page.title(), 'Online shell');
    assert.deepEqual(await page.evaluate(async () => {
      const paths = [];
      for (const key of await caches.keys()) for (const req of await (await caches.open(key)).keys()) paths.push(new URL(req.url).pathname);
      return paths.filter(path => path === '/' || path.startsWith('/api/') || path === '/login');
    }), []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
