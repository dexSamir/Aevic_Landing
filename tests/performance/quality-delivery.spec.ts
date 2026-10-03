import { test, expect } from '../helpers/api-fixture-test';
import { readFileSync } from 'node:fs';
const axeSource = readFileSync('/tmp/aevic-quality-tools/node_modules/axe-core/axe.min.js', 'utf8');

test('home preserves loading geometry and stays accessible across screen sizes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/public/context', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.fallback();
  });
  await page.route('**/api/me/session', route => route.fulfill({ json: null }));
  await page.addInitScript(() => {
    (window as any).qualityShifts = [];
    new PerformanceObserver(list => list.getEntries().forEach((entry: any) => {
      if (!entry.hadRecentInput) (window as any).qualityShifts.push({ value: entry.value, nodes: entry.sources?.map((s: any) => s.node?.className) });
    })).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/');
  await expect(page.locator('.home-competition-slot .loading-skeleton')).toBeVisible();
  const before = await page.locator('.home-competition-slot').boundingBox();
  await expect(page.locator('.home-competition-rail')).toBeVisible();
  const after = await page.locator('.home-competition-slot').boundingBox();
  console.log('rail geometry', { before: before?.height, after: after?.height });
  expect(Math.abs(before!.height - after!.height)).toBeLessThanOrEqual(2);
  await page.waitForLoadState('networkidle');
  const shifts = await page.evaluate(() => (window as any).qualityShifts);
  console.log('home layout shifts', shifts);
  expect(shifts.reduce((sum: number, shift: any) => sum + shift.value, 0)).toBeLessThan(.05);
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.evaluate(axeSource);
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })));
  expect(violations).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.motion-page').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  expect(errors).toEqual([]);
});

test('public destinations retain metadata, keyboard access and accessible content', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/me/session', route => route.fulfill({ json: null }));
  for (const path of ['/teams', '/tournaments', '/regulations', '/login']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.motion-page')).toHaveAttribute('data-route-key', path);
    await expect(page.locator('.motion-page h1').first()).toBeVisible();
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
    if (path === '/login') await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    else await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    if (path === '/teams' || path === '/login') {
      await page.evaluate(axeSource);
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })));
      expect(violations).toEqual([]);
    }
  }
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Əsas məzmuna keç' })).toBeFocused();
  expect(errors).toEqual([]);
});

test('authenticated route styles and workspace contexts load on direct arrival', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/team', '/team/profile', '/team/sharecards', '/admin']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-protected-area] h1').first()).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});
