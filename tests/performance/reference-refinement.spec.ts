import { test, expect } from '../helpers/api-fixture-test';

test('skip link requires intentional keyboard focus and clears after browser focus and viewport changes', async ({ page }) => {
 await page.goto('/tournaments');
 const skip = page.locator('.skip-link');
 await expect(skip).toHaveCSS('opacity', '0');
 await page.reload(); await expect(skip).toHaveCSS('opacity', '0');
 await page.keyboard.press('Tab');
 await expect(skip).toBeFocused(); await expect(skip).toHaveCSS('opacity', '1');
 await page.keyboard.press('Enter'); await expect(page.locator('#main-content')).toBeFocused(); await expect(skip).toHaveCSS('opacity', '0');
 await page.goto('/teams'); await expect(skip).toHaveAttribute('data-keyboard', 'false'); await page.keyboard.press('Tab'); await expect(skip).toHaveCSS('opacity', '1');
 await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await expect(skip).toHaveCSS('opacity', '0');
 await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await expect(skip).toHaveCSS('opacity', '0');
 await page.setViewportSize({ width: 800, height: 700 }); await expect(skip).toHaveCSS('opacity', '0');
 await page.keyboard.press('Escape'); await expect(skip).toHaveCSS('opacity', '0');
 await page.locator('h1').click(); await expect(skip).toHaveCSS('opacity', '0');
 await page.dispatchEvent('body', 'pointerdown', { pointerType: 'touch' }); await expect(skip).toHaveCSS('opacity', '0');
});

test('compact roster and tournament layouts remain usable from 320px through desktop', async ({ page }) => {
 await page.goto('/teams/caspian-wolves');
 await expect(page.locator('.public-team-roster article')).toHaveCount(5);
 for (const width of [320, 390, 1024, 1920]) {
  await page.setViewportSize({ width, height: 900 });
  const roster = await page.locator('.public-team-roster').evaluate(el => ({ columns: getComputedStyle(el).gridTemplateColumns.split(' ').length, overflow: document.documentElement.scrollWidth > innerWidth, cards: [...el.querySelectorAll('article')].map(card => { const rect=card.getBoundingClientRect(); const copy=card.querySelector('.public-team-player-copy')!.getBoundingClientRect();return {ratio:rect.width/rect.height, fits:copy.height<rect.height, silhouette:!!card.querySelector('.anonymous-player')}; }) }));
  expect(roster.overflow).toBe(false); expect(roster.columns).toBeGreaterThanOrEqual(2);
  for (const card of roster.cards) { expect(card.ratio).toBeCloseTo(.71,1); expect(card.fits).toBe(true); expect(card.silhouette).toBe(true); }
 }
 await page.goto('/tournaments');
 for (const width of [320, 390, 1024, 1440, 1920]) {
  await page.setViewportSize({ width, height: 900 });
  await expect(page.locator('.planning-events .tournament-row')).toHaveCount(3);
  const dayRow = page.locator('.tournament-day-list .tournament-row').first();
  const dayGeometry = await dayRow.evaluate(el => ({ columns: getComputedStyle(el).gridTemplateColumns.split(' ').length, height: el.getBoundingClientRect().height, overflow: el.scrollWidth > el.clientWidth }));
  expect(dayGeometry.columns).toBe(width > 600 ? 5 : 3);
  expect(dayGeometry.height).toBeLessThan(240); expect(dayGeometry.overflow).toBe(false);
  const layout = await page.locator('.planning-events').evaluate(el => ({ overflow: document.documentElement.scrollWidth > innerWidth, columns: getComputedStyle(el).gridTemplateColumns.split(' ').length, cards: [...el.children].map(card => {const rect=card.getBoundingClientRect();return {width:rect.width,height:rect.height,overflow:card.scrollWidth>card.clientWidth, children:[...card.children].map(child=>({tag:child.className,width:child.getBoundingClientRect().width,scroll:child.scrollWidth}))};}) }));
  expect(layout.overflow, `${width}px page`).toBe(false);
  expect(layout.columns).toBe(width > 767 ? 2 : 1);
  for (const card of layout.cards) {expect(card.overflow,`${width}px row`).toBe(false);expect(card.height).toBeLessThan(240);}
 }
 await page.getByRole('searchbox', { name: 'Turnir axtar' }).fill('Summer');
 await expect(page.locator('.planning-events .tournament-row')).toHaveCount(1);
 await page.getByRole('searchbox', { name: 'Turnir axtar' }).fill('unfindable');
 await expect(page.getByText('Axtarışa uyğun turnir yoxdur.')).toBeVisible();
 await page.getByRole('button', { name: 'Filtrləri təmizlə' }).click();
 await expect(page.locator('.planning-events .tournament-row')).toHaveCount(3);
 await page.locator('.planning-events .tournament-row__arrow').first().click();
 await expect(page).toHaveURL(/\/tournaments\/[^/]+$/);
});
