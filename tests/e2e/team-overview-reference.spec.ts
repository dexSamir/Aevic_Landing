import { test, expect } from '@playwright/test';

test('captain console puts the real next action first and preserves operation routes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const [width, height] of [[1440,900],[1024,768],[768,1024],[390,844]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/team');
    await expect(page.getByRole('heading', {name:'Caspian Wolves'})).toBeVisible();
    await expect(page.locator('.overview-status')).toHaveCount(4);
    await expect(page.locator('.overview-recent li')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBeTruthy();
  }
  await page.getByRole('button', {name:'Naviqasiyanı aç'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/team?scenario=check-in-open');
  await page.locator('.overview-next-action').getByRole('link', {name:'Check-in et',exact:true}).click();
  await expect(page).toHaveURL(/\/team\/tournaments\/daily-cup-24/);
  // Demo clock is URL-selected; navigation above verifies the canonical route.
  await page.goto('/team/tournaments/daily-cup-24?scenario=check-in-open');
  await page.getByRole('button', {name:'Check-in et',exact:true}).click();
  await page.getByRole('button', {name:'Bəli, hazırıq'}).click();
  await expect(page.getByText('Check-in tamamlandı')).toBeVisible();
  await page.goto('/team?scenario=room-ready');
  await page.locator('.overview-status--room').click();
  await expect(page).toHaveURL(/\/team\/tournaments\/daily-cup-24.*#room/);
  await expect(page.locator('#room')).toBeVisible();
  await page.goto('/team');
  await page.getByRole('link',{name:'Matç detalı',exact:true}).click();
  await expect(page).not.toHaveURL(/\/team$/);
  await expect(page.getByText('Bu səhifə yarış cədvəlində yoxdur.')).toHaveCount(0);
  await page.goto('/team?scenario=no-active-tournament');
  await expect(page.getByRole('heading', {name:'AKTİV TURNİR YOXDUR'})).toBeVisible();
  await expect(page.locator('.overview-status, .overview-rounds, .overview-standings')).toHaveCount(0);
  expect(errors).toEqual([]);
});
