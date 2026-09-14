import { test, expect } from '@playwright/test';

test('public team features are responsive and export the displayed card', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/teams/caspian-wolves');
    await expect(page.locator('.public-team-wrapped')).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG-ni yüklə', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.locator('.public-team-wrapped').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('.public-team-wrapped img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: `/tmp/aevic-team-${width}.png`, fullPage: true });
    const card = await page.locator('.public-team-card-preview').boundingBox();
    expect(card!.width / card!.height).toBeCloseTo(1200 / 660, 1);
  }
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG-ni yüklə', exact: true }).click();
  expect((await downloadEvent).suggestedFilename()).toBe('aevic-caspian-wolves-official-team.png');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text; } } });
  });
  await page.locator('.public-team-official').getByRole('button', { name: 'Paylaş', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Profil keçidi kopyalandı');
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toContain('/teams/caspian-wolves');
  await page.getByRole('link', { name: 'İcmala bax' }).click();
  await expect(page).toHaveURL(/\/teams\/caspian-wolves\/wrapped\/\d{4}/);
  expect(errors).toEqual([]);
});
