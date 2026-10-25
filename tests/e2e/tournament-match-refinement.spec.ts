import { test, expect } from '../helpers/api-fixture-test';
import { matchSchedule, leaderboard, tournaments } from '../fixtures/platform-data';
test('responsive cards, native carousel, match navigation and guest modal', async ({ page }) => {
 const cup = tournaments[0];
 const matches = Array.from({ length: 15 }, (_, i) => ({ ...matchSchedule[i % 4], id: `match-${i}`, round: i + 1, startsAt: new Date(Date.UTC(2026, 7, 4, 17, i * 30)).toISOString() }));
 const overall = [{ ...leaderboard[0], tournamentId: cup.id, totalPoints: 90, finishes: 30 }];
 await page.route('**/api/me/session', route => route.fulfill({ json: null }));
 await page.route('**/api/matches?*', route => route.fulfill({ json: route.request().url().includes('completed') ? [] : matches.slice().reverse() }));
 await page.route(`**/api/leaderboards/${cup.id}`, route => route.fulfill({ json: overall }));
 let reads = 0;
 await page.route('**/api/matches/match-*', route => {
  reads++;
  const id = route.request().url().split('/').pop();
  const match = matches.find(m => m.id === id)!;
  return route.fulfill({ json: { match, tournament: cup, published: id === 'match-0', standings: id === 'match-0' ? [{ ...overall[0], matches: 1, finishes: 3, totalPoints: 13 }] : [], teamResults: [] } });
 });
 for (const width of [320, 360, 375, 390, 430, 768, 1440]) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`/tournaments/${cup.id}`);
  await expect(page.getByRole('tab')).toHaveCount(16);
  const grid = await page.locator('.tournament-detail-format').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(grid).toBe(width > 1100 ? 4 : 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width <= 600) {
   const carousel = page.locator('#matches > ol');
   expect(await carousel.evaluate(el => getComputedStyle(el).scrollbarWidth)).toBe('none');
   await carousel.focus();
   await page.keyboard.press('ArrowRight');
   await expect.poll(() => carousel.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
   await carousel.locator('a').last().focus();
   await expect.poll(() => carousel.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  }
  await page.getByRole('button', { name: 'Nəticələri yüklə' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Yüklə', exact: true })).toBeVisible();
  await expect(dialog.getByRole('radio', { name: 'Komanda nəticəsi' })).toBeDisabled();
  const boxes = await dialog.getByRole('radio').evaluateAll(elements => elements.map(el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }));
  expect(boxes[0].y).toBe(boxes[1].y);
  if (width <= 600) expect(boxes[0].width).toBeGreaterThan(boxes[0].height);
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
 }
 await page.getByRole('tab', { name: 'Matç 1', exact: true }).click();
 await expect(page.getByRole('tabpanel')).toContainText('13');
 await expect(page).toHaveURL(/match=match-0/);
 await page.getByRole('tab', { name: 'Matç 1', exact: true }).press('ArrowRight');
 await expect(page.getByRole('heading', { name: 'Bu matçın nəticələri hələ elan edilməyib.' })).toBeVisible();
 await page.goBack();
 await expect(page.getByRole('tab', { name: 'Matç 1', exact: true })).toHaveAttribute('aria-selected', 'true');
 await expect(page.getByRole('tabpanel')).toContainText('13');
 expect(reads).toBe(2);
 await page.reload();
 await expect(page.getByRole('tabpanel')).toContainText('13');
});

test('short mobile viewport keeps the modal close control visible and download scrollable', async ({ page }) => {
 await page.setViewportSize({ width: 320, height: 360 });
 await page.route('**/api/me/session', route => route.fulfill({ json: null }));
 await page.goto('/tournaments/summer-final-25');
 await page.getByRole('button', { name: 'Nəticələri yüklə' }).click();
 const dialog = page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 const box = await dialog.boundingBox();
 expect(box!.y).toBeGreaterThanOrEqual(0);
 expect(box!.y + box!.height).toBeLessThanOrEqual(360);
 await dialog.getByRole('button', { name: 'Yüklə', exact: true }).scrollIntoViewIfNeeded();
 await expect(dialog.locator('header button')).toBeInViewport();
 expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
 await dialog.locator('header button').click();
 await expect(dialog).toHaveCount(0);
});
