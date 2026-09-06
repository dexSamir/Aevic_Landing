import { expect, test } from '@playwright/test';

const evidence = '.artifacts/public-shell-redesign-2026-08-30';

test('captures the approved public shell and auth redesign', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'A single controlled viewport sequence produces the release evidence.');
  test.setTimeout(90_000);
  const errors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText ?? 'failed'}`));
  page.on('response', (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.site-header__auth').locator('.public-identity-trigger, .nav-login')).toBeVisible();
  await page.waitForTimeout(120);
  const identity = page.locator('.public-identity-trigger');
  if (await identity.isVisible()) {
    await identity.click();
    await page.getByRole('menuitem', { name: /çıxış/i }).click();
    await expect(page.locator('.site-header__auth .nav-login')).toBeVisible();
    await page.locator('.site-header .public-nav-capsule').getByRole('link', { name: 'Turnirlər' }).click();
    await page.locator('.site-header .public-nav-capsule').getByRole('link', { name: 'Ana səhifə' }).click();
  }

  await expect(page.locator('.site-header')).toHaveAttribute('data-public-header-state', 'hero-top');
  await expect(page.getByRole('heading', { name: /rəqabətin rəsmi səhnəsi/i })).toBeVisible();
  await page.screenshot({ path: `${evidence}/home-desktop-top.png` });

  await page.evaluate(() => window.scrollTo({ top: 160, behavior: 'auto' }));
  await expect(page.locator('.site-header')).toHaveAttribute('data-public-header-state', 'scrolled');
  await page.screenshot({ path: `${evidence}/home-desktop-scrolled.png` });

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.site-header')).toHaveAttribute('data-public-header-state', 'hero-top');
  await page.screenshot({ path: `${evidence}/home-mobile.png` });

  await page.getByRole('button', { name: 'Menyunu aç' }).click();
  await page.locator('#public-mobile-menu').getByRole('link', { name: 'Daxil ol' }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.site-header')).toHaveAttribute('data-public-header-state', 'standard-top');
  await expect(page.getByRole('heading', { name: /komanda panelinə giriş/i })).toBeVisible();
  await page.screenshot({ path: `${evidence}/login-desktop.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${evidence}/login-mobile.png` });

  await page.locator('.auth-switch').getByRole('link', { name: /komanda yaradın/i }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('heading', { name: /komandanı yarışa hazırla/i })).toBeVisible();
  await page.screenshot({ path: `${evidence}/register-desktop.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${evidence}/register-mobile.png` });

  const brokenImages = await page.locator('img:visible').evaluateAll((images) => images.filter((image) => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0).map((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src));
  expect(errors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
  expect(brokenImages).toEqual([]);
});

test('standalone player routes use the normal not-found experience', async ({ page }) => {
  await page.goto('/players');
  await expect(page.getByRole('heading', { name: /bu səhifə yarış cədvəlində yoxdur/i })).toBeVisible();
});

test('registration keeps its page heading at short and zoom-equivalent viewports', async ({ page }) => {
  await page.goto('/register');
  for (const viewport of [{ width: 768, height: 480 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('heading', { name: /komandanı yarışa hazırla/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test('public logo remains contained when the image source is portrait-shaped', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.site-header .brand-emblem img')).toBeVisible();
  await page.locator('.site-header .brand-emblem img').evaluate(async (image: HTMLImageElement) => {
    // A portrait intrinsic ratio reproduces the production CDN source locally.
    image.closest('picture')?.querySelectorAll('source').forEach((source) => source.remove());
    image.removeAttribute('srcset');
    image.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="350"><rect width="100" height="350" fill="gold"/></svg>');
    await image.decode();
  });
  const geometry = await page.locator('.site-header .brand-emblem').evaluate((mark) => ({
    box: mark.getBoundingClientRect().toJSON(),
    image: mark.querySelector('img')!.getBoundingClientRect().toJSON(),
  }));
  expect(geometry.image.height).toBeLessThanOrEqual(geometry.box.height);
  expect(geometry.image.bottom).toBeLessThanOrEqual(geometry.box.bottom);
});
