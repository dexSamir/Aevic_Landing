import { test, expect } from '@playwright/test';

test('tournament dossier follows the reference at desktop, tablet and mobile widths', async ({ page }) => {
 const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 for (const width of [1440,1024,768,390]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/tournaments/daily-cup-24');
  await expect(page.getByRole('heading', { name: 'AEVIC Daily Cup #24', exact: true })).toBeVisible();
  await expect(page.locator('.tournament-detail-teams > li > a')).toHaveCount(6);
  await expect(page.locator('.tournament-map-copy h3')).toHaveText(['Erangel','Miramar','Rondo','Erangel']);
  await expect(page.getByText(/sanhok/i)).toHaveCount(0);
  await expect(page.locator('.tournament-registration .countdown strong')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const schedule = await page.locator('#matches').boundingBox();
  const lastCard = await page.locator('.tournament-detail-schedule li > a').last().boundingBox();
  expect(lastCard!.x + lastCard!.width).toBeLessThanOrEqual(schedule!.x + schedule!.width + 1);
  await page.locator('#matches').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.tournament-detail-schedule img').evaluateAll((images: HTMLImageElement[]) => images.every(image => image.complete && image.naturalWidth > 0))).toBeTruthy();
  await page.evaluate(() => { window.scrollTo(0,0); (document.activeElement as HTMLElement)?.blur(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/aevic-tournament-${width}.png`, fullPage: true });
 }
 await page.getByRole('navigation', { name: 'Daily Cup #24 bölmələri' }).getByRole('link', { name: 'Qaydalar' }).click();
 await expect(page).toHaveURL(/#rules$/);
 await expect(page.getByRole('link', { name: 'Tam qaydaları oxu' })).toHaveAttribute('href','/regulations');
 await page.getByRole('link', { name: 'Matç Mərkəzində aç' }).click();
 await expect(page).toHaveURL(/\/matches$/);
 expect(errors).toEqual([]);
});
