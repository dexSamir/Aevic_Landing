import { expect, test } from '@playwright/test';

const evidence = 'work/master-remediation-2026-08-30/e2e-product-evidence';
const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
];

test('targeted refinement evidence and behavior', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'One deterministic evidence pass is enough.');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const nav = page.locator('.public-nav-capsule');
  await expect(nav).toBeVisible();
  await expect(nav.locator('a.active')).toHaveCount(1);
  const navChrome = await nav.evaluate((element) => ({
    border: getComputedStyle(element).borderTopWidth,
    shine: getComputedStyle(element, '::after').content,
    underline: getComputedStyle(element.querySelector('.public-nav-indicator')!, '::after').content,
  }));
  expect(navChrome).toEqual({ border: '0px', shine: 'none', underline: 'none' });
  await page.locator('.site-header__inner').screenshot({ path: `${evidence}/01-navbar.png` });

  const map = page.locator('.map-program');
  await map.scrollIntoViewIfNeeded();
  await expect(map.locator(':scope > ol > li')).toHaveCount(4);
  await expect(map.locator('a, button, .map-program__tags')).toHaveCount(0);
  await map.screenshot({ path: `${evidence}/02-home-map-sequence.png` });

  const teams = page.locator('.home-team-stage');
  await teams.scrollIntoViewIfNeeded();
  await expect(teams.getByRole('button')).toHaveCount(5);
  await teams.screenshot({ path: `${evidence}/03-home-teams-default.png` });
  await teams.getByRole('button').first().hover();
  await expect(teams.locator('.team-roster-reveal--names').first()).toHaveCSS('opacity', '1');
  await teams.screenshot({ path: `${evidence}/04-home-team-hover.png` });

  await page.goto('/tournaments/summer-final-25#results');
  const results = page.locator('.tournament-results');
  await expect(results.getByRole('button', { name: 'PNG yüklə' })).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await results.getByRole('button', { name: 'PNG yüklə' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('aevic-leaderboard-poster.png');
  await results.locator(':scope > .section-heading, :scope > .tournament-results__summary, :scope > .sharecard-studio').screenshot({ path: `${evidence}/05-tournament-result-sharecard-cta.png` }).catch(async () => results.screenshot({ path: `${evidence}/05-tournament-result-sharecard-cta.png` }));
  await page.goto('/tournaments/rising-series-26#results');
  await expect(page.locator('.tournament-results').getByRole('button', { name: 'PNG yüklə' })).toHaveCount(0);
  await expect(page.locator('#results')).toContainText('Ümumi sıralama dərc edilməyib');

  await page.goto('/team/sharecards');
  const identityCanvas = page.locator('.profile-card-canvas canvas');
  await expect(identityCanvas).toBeVisible();
  await page.waitForTimeout(500);
  const qrPalette = await identityCanvas.evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(784, 954, 210, 210).data;
    let dark = 0; let gold = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      const [red, green, blue] = [pixels[index], pixels[index + 1], pixels[index + 2]];
      if (red < 35 && green < 35 && blue < 35) dark += 1;
      if (red > 210 && green > 150 && blue < 110) gold += 1;
    }
    return { dark, gold };
  });
  expect(qrPalette.dark).toBeGreaterThan(100);
  expect(qrPalette.gold).toBeGreaterThan(100);
  const identityDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG yüklə' }).click();
  expect((await identityDownloadPromise).suggestedFilename()).toMatch(/^AEVIC_Caspian_Wolves_Profile/);
  await page.locator('.profile-card-canvas').screenshot({ path: `${evidence}/06-team-identity-sharecard.png` });

  await page.goto('/team');
  await expect(page.locator('.team-standing-preview__table')).toHaveCount(0);
  await expect(page.locator('.team-standing-preview__empty')).toContainText('dərc edilmiş cari sıralama yoxdur');
  await page.locator('.team-standing-preview').screenshot({ path: `${evidence}/07-team-overview-standings.png` });
  const sidebarIdentity = page.locator('.product-sidebar > .team-identity');
  await expect(sidebarIdentity).toContainText('Caspian Wolves');
  await expect(sidebarIdentity.getByRole('link', { name: 'İctimai profili aç' })).toHaveAttribute('href', '/teams/caspian-wolves');
  await sidebarIdentity.screenshot({ path: `${evidence}/09-team-sidebar-identity.png` });

  await page.goto('/team?scenario=room-ready');
  const room = page.locator('.team-room-status');
  await expect(room).toContainText('Otaq məlumatları yayımlandı');
  await room.screenshot({ path: `${evidence}/08-team-overview-room.png` });
  await room.getByRole('link', { name: 'Otaq məlumatlarını aç' }).click();
  await expect(page).toHaveURL(/\/team\/tournaments\/daily-cup-24\?scenario=room-ready#room|\/team\/tournaments\/daily-cup-24#room/);
  await expect(page.locator('.credential-panel#room')).toBeVisible();

  expect(errors).toEqual([]);
});

test('targeted surfaces stay contained at all required viewports and 200% text', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Explicit viewport matrix runs once.');
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of ['/', '/tournaments/daily-cup-24#results', '/team', '/team?scenario=room-ready']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${path} at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(1);
    }
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const path of ['/', '/team', '/team?scenario=room-ready']) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${path} at 200% text`).toBeLessThanOrEqual(1);
  }
});
