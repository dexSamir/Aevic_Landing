import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const primary = ['/', '/tournaments', '/teams', '/matches'];
const footer = [...primary, '/regulations', '/leaderboard', '/support', '/privacy', '/terms', '/contact'];
const evidence = 'work/public-shell-fix-2026-08-31';
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((links) => links.map((link) => link.getAttribute('href')));

async function anonymous(page: Page, api: boolean) {
  if (!api) {
    const mobile = (page.viewportSize()?.width ?? 1440) < 1024;
    if (mobile) await page.getByRole('button', { name: 'Menyunu aç' }).click();
    const identity = page.locator(mobile ? '#public-mobile-menu .public-identity-trigger' : '.site-header .public-identity-trigger');
    await expect(identity).toBeVisible();
    await identity.click();
    await page.getByRole('menuitem', { name: /Çıxış/ }).click();
  }
}

test('public navigation and footer contract across modes, session states and viewports', async ({ page }, info) => {
  const api = info.project.name.startsWith('api');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/');
  await anonymous(page, api);
  const mobile = (page.viewportSize()?.width ?? 1440) < 1024;
  if (mobile) await page.getByRole('button', { name: 'Menyunu aç' }).click();
  const scope = mobile ? '#public-mobile-menu' : '.site-header';
  expect(await hrefs(page, `${scope} .public-nav-capsule a`)).toEqual(primary);
  for (const path of ['/login', '/register', '/regulations']) await expect(page.locator(`${scope} a[href="${path}"]`)).toBeVisible();
  if (mobile) await page.keyboard.press('Escape');
  expect(await hrefs(page, '.site-footer nav a')).toEqual(footer);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const targets = await page.locator('.site-footer a').evaluateAll((links) => links.map((link) => ({ width: link.getBoundingClientRect().width, height: link.getBoundingClientRect().height })));
  for (const target of targets) { expect(target.height).toBeGreaterThanOrEqual(44); expect(target.width).toBeGreaterThanOrEqual(44); }
  const height = await page.locator('.site-footer').evaluate((el) => el.getBoundingClientRect().height);
  if (!mobile) { expect(height).toBeGreaterThanOrEqual(250); expect(height).toBeLessThanOrEqual(380); }
  await page.locator('.site-footer__primary a').first().focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).toBe('solid');
  expect(errors).toEqual([]);
});

test('API auth previews stay editable and never request unavailable endpoints', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('api'), 'API-specific release safety');
  const apiCalls: string[] = [];
  page.on('request', (request) => { if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url()); });
  for (const path of ['/login', '/register', '/matches']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('.site-footer')).toHaveCount(1);
    if (path === '/login') {
      await page.getByLabel('E-poçt').fill('captain@example.test');
      await page.getByLabel('Şifrə', { exact: true }).fill('demo-password');
      await page.locator('label.check').filter({ hasText: 'Məni xatırla' }).click();
      await page.getByRole('button', { name: 'Şifrəni göstər' }).click();
      await expect(page.getByLabel('E-poçt')).toHaveValue('captain@example.test');
      await expect(page.getByLabel('Şifrə', { exact: true })).toHaveValue('demo-password');
      await expect(page.getByLabel('Şifrə', { exact: true })).toHaveAttribute('type', 'text');
      await expect(page.getByRole('checkbox', { name: 'Məni xatırla' })).toBeChecked();
      await page.getByRole('button', { name: 'Daxil ol' }).click();
      await expect(page.locator('.auth-availability')).toContainText('serverə giriş sorğusu göndərilmir');
    } else if (path === '/register') {
      await page.getByLabel('Komanda adı').fill('Test team');
      await expect(page.getByLabel('Komanda adı')).toHaveValue('Test team');
      await expect(page.getByRole('button', { name: 'Davam et' })).toBeEnabled();
      await page.getByRole('button', { name: 'Davam et' }).click();
      await expect(page.getByLabel('Ad', { exact: true })).toBeEditable();
    } else await expect(page.getByText('Növbəti raundu buradan izləyin')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(apiCalls).toEqual([]);
});

test('production auth supports keyboard login and a complete local registration draft', async ({ page }, info) => {
  test.skip(info.project.name !== 'api-desktop', 'One production interaction contract');
  const apiCalls: string[] = [];
  page.on('request', (request) => { if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url()); });

  await page.goto('/login');
  const email = page.getByLabel('E-poçt');
  await email.focus();
  await page.keyboard.type('captain@example.test');
  await page.keyboard.press('Tab');
  await page.keyboard.type('demo-password');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Şifrəni gizlət' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(page.getByRole('checkbox', { name: 'Məni xatırla' })).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Şifrəni unutmusunuz?' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.auth-availability')).toContainText('serverə giriş sorğusu göndərilmir');
  await expect(email).toHaveValue('captain@example.test');
  await expect(page.getByLabel('Şifrə', { exact: true })).toHaveValue('demo-password');

  await page.goto('/register');
  await page.getByLabel('Komanda adı').fill('Keyboard Wolves');
  await page.getByLabel('Qısa tag').fill('KBW');
  await page.getByRole('button', { name: 'Davam et' }).click();
  await page.getByLabel('Ad', { exact: true }).fill('Murad');
  await page.getByLabel('Soyad').fill('Məmmədov');
  await page.getByLabel('WhatsApp nömrəsi').fill('505550107');
  await page.getByLabel('E-poçt').fill('murad@example.test');
  await page.getByLabel('Şifrə', { exact: true }).fill('Secure123');
  await page.getByLabel('Şifrəni təsdiqlə').fill('Secure123');
  await page.getByRole('button', { name: 'Davam et' }).click();
  for (let index = 0; index < 4; index += 1) {
    if (index > 0) await page.locator(`#roster-player-${index}-trigger`).click();
    await page.locator(`#player-${index}-ign`).fill(`Player${index + 1}`);
    await page.locator(`#player-${index}-uid`).fill(`5123456789${index}`);
  }
  await page.getByRole('button', { name: 'Davam et' }).click();
  await page.locator('label.check').filter({ hasText: 'Məlumatların düzgün olduğunu' }).click();
  await page.getByRole('button', { name: 'Göndərişi yoxla' }).click();
  await expect(page.locator('.auth-availability')).toContainText('serverə ötürülmür');
  await expect(page.getByRole('alert')).toContainText('serverə göndərilmir');
  expect(apiCalls).toEqual([]);
});

test('production auth and footer stay contained across the required responsive matrix', async ({ page }, info) => {
  test.skip(info.project.name !== 'api-desktop', 'One production responsive contract');
  test.setTimeout(90_000);
  const viewports = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of ['/login', '/register']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path} at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(1);
    }
    await page.goto('/');
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `footer at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(1);
    const footerTargets = await page.locator('.site-footer a').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
    expect(footerTargets.every((height) => height >= 44)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/login', '/register', '/']) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    if (path === '/') await page.locator('.site-footer').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path} at 200% text`).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test('production Home prerender and hydrated shell have identical links', async ({ page }, info) => {
  test.skip(info.project.name !== 'api-desktop', 'One built Home contract');
  const html = readFileSync('dist/index.html', 'utf8');
  await page.goto('/');
  const before = await page.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return [...doc.querySelectorAll('.site-header a, .site-footer a')].map((a) => [a.getAttribute('href'), a.textContent]);
  }, html);
  const after = await page.locator('.site-header a, .site-footer a').evaluateAll((links) => links.map((a) => [a.getAttribute('href'), a.textContent]));
  expect(after).toEqual(before);
});

test('fresh, existing-worker, normal and hard refresh keep the current shell', async ({ page }, info) => {
  test.skip(info.project.name !== 'api-desktop', 'One service worker update lifecycle');
  await page.goto('/');
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    const old = await navigator.serviceWorker.register('/sw.js?previous=1');
    await navigator.serviceWorker.ready;
    if (old.waiting) old.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
  });
  await page.reload();
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await registration.update();
  });
  await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' }));
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter((key) => key.includes('test-previous-build')))).toEqual([]);
  await page.reload();
  expect(await hrefs(page, '.site-header .public-nav-capsule a')).toEqual(primary);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.reload();
  expect(await hrefs(page, '.site-header .public-nav-capsule a')).toEqual(primary);
  expect(await hrefs(page, '.site-footer nav a')).toEqual(footer);
  await cdp.detach();
  expect(await page.evaluate(async () => {
    const paths: string[] = [];
    for (const key of await caches.keys()) for (const request of await (await caches.open(key)).keys()) paths.push(new URL(request.url).pathname);
    return paths.filter((path) => path === '/' || /^\/(api|login|register)(\/|$)/.test(path));
  })).toEqual([]);
});

test('captures required production shell screenshots with console/network/layout evidence', async ({ page }, info) => {
  test.skip(info.project.name !== 'api-desktop', 'One controlled screenshot matrix');
  mkdirSync(`${evidence}/screenshots`, { recursive: true });
  const errors: string[] = [];
  const measurements: unknown[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const cases = [
    { name: 'home-desktop-top', path: '/', width: 1536, height: 960 },
    { name: 'home-desktop-scrolled', path: '/', width: 1536, height: 960, scroll: 180 },
    { name: 'home-mobile', path: '/', width: 390, height: 844 },
    { name: 'footer-desktop', path: '/', width: 1440, height: 900, bottom: true },
    { name: 'footer-mobile', path: '/', width: 390, height: 844, bottom: true },
    { name: 'login-desktop', path: '/login', width: 1440, height: 900 },
    { name: 'login-mobile', path: '/login', width: 390, height: 844 },
    { name: 'login-filled-desktop', path: '/login', width: 1440, height: 900, filled: true },
    { name: 'register-desktop', path: '/register', width: 1440, height: 900 },
    { name: 'register-mobile', path: '/register', width: 390, height: 844 },
    { name: 'tournaments-footer', path: '/tournaments', width: 1440, height: 900, bottom: true },
  ];
  for (const entry of cases) {
    await page.setViewportSize({ width: entry.width, height: entry.height });
    await page.goto(entry.path);
    await expect(page.locator('main h1')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    if (entry.filled) {
      await page.getByLabel('E-poçt').fill('captain@example.test');
      await page.getByLabel('Şifrə', { exact: true }).fill('demo-password');
      await page.locator('label.check').filter({ hasText: 'Məni xatırla' }).click();
      await expect(page.getByLabel('Şifrə', { exact: true })).toHaveAttribute('type', 'password');
      await page.evaluate(() => scrollTo(0, 0));
    }
    if (entry.bottom) await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    else if (entry.scroll) await page.evaluate((top) => scrollTo(0, top), entry.scroll);
    await page.waitForTimeout(350);
    await expect.poll(() => page.locator('img').evaluateAll((images) => images.filter((img) => { const box = img.getBoundingClientRect(); return box.width && box.height && box.bottom > 0 && box.top < innerHeight; }).every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const result = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, footerHeight: document.querySelector('.site-footer')!.getBoundingClientRect().height, brokenImages: [...document.images].filter((img) => { const box = img.getBoundingClientRect(); return box.width && box.height && box.bottom > 0 && box.top < innerHeight && (!img.complete || !img.naturalWidth); }).map((img) => img.src) }));
    expect(result.overflow).toBe(false); expect(result.brokenImages).toEqual([]);
    measurements.push({ ...entry, ...result });
    await page.screenshot({ path: `${evidence}/screenshots/${entry.name}.png` });
  }
  writeFileSync(`${evidence}/browser-evidence.json`, JSON.stringify({ environment: 'Built API adapter; test host empty public-context fixture; generated production CSP', errors, measurements }, null, 2));
  expect(errors).toEqual([]);
});
