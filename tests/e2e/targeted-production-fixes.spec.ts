import { test, expect } from '../helpers/api-fixture-test';

test('hero and independent navigation surfaces across scroll and viewports', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('.home-live-hero h1')).toBeVisible();
  await expect(page.locator('.home-live-hero h1')).toHaveCSS('font-family', /Oswald/);
  await expect(page.locator('.home-live-hero__copy > p')).toHaveCSS('font-family', /Raleway/);
  await expect(page.locator('.site-header')).toHaveAttribute('data-public-header-state', 'hero-top');
  const image = page.locator('.home-live-hero__media img');
  await expect(image).toHaveAttribute('fetchpriority', 'high');
  await expect(image).toHaveAttribute('loading', 'eager');
  await page.evaluate(() => window.scrollTo(0, 650));
  await expect(page.locator('.site-header')).toHaveAttribute('data-public-header-state', 'scrolled');
  if (info.project.name === 'desktop-chrome') {
    await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const surfaces = await page.locator('.site-header .public-nav-capsule, .site-header__tools').evaluateAll(els => els.map(el => ({ bg: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderRadius })));
    expect(surfaces[0]).toEqual(surfaces[1]);
    expect(surfaces[0].bg).not.toBe('rgba(0, 0, 0, 0)');
    await page.screenshot({ path: 'work/targeted-production/navbar-middle.png' });
  }
  await page.locator('.cinematic-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.site-header')).toHaveAttribute('data-public-header-state', 'hero-top');
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.home-live-hero h1')).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.querySelectorAll('.home-live-hero img')).map(img => (img as HTMLImageElement).decode())); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `work/targeted-production/hero-${info.project.name}-${width}.png` });
  }
});

test('login alert shares form width and five statistics are outlined', async ({ page }, info) => {
  await page.route('**/api/me/session', route => route.fulfill({ contentType: 'application/json', body: 'null' }));
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }));
  await page.goto('/login');
  await page.getByLabel('E-poçt', { exact: true }).fill('fixture@example.test');
  await page.getByLabel('Şifrə', { exact: true }).fill('InvalidPass123');
  await page.locator('form').getByRole('button', { name: 'Daxil ol' }).click();
  await expect(page.locator('.login-card [role=alert]')).toBeVisible();
  const alert = await page.locator('.login-card [role=alert]').boundingBox();
  const form = await page.locator('.login-card form').boundingBox();
  expect(alert!.x).toBe(form!.x); expect(alert!.width).toBe(form!.width);
  await page.screenshot({ path: `work/targeted-production/login-${info.project.name}.png` });
  await page.unroute('**/api/me/session');
  await page.goto('/team');
  const cards = page.locator('.team-stat-ledger > div');
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) {
    await expect(card).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(card).toHaveCSS('border-top-width', '1px');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.team-stat-ledger').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `work/targeted-production/dashboard-${info.project.name}.png` });
});
