import { test, expect } from '../helpers/api-fixture-test';
import { fixtureServices } from '../fixtures/component-services';
test.use({ screenshot: 'off', trace: 'off', video: 'off' });

import { currentTeam } from '../fixtures/platform-data';

test('desktop and touch roster states preserve navigation without hover requests', async ({ page, browser }) => {
  await page.goto('/tournaments/daily-cup-24');
  const card = page.locator('.tournament-detail-teams .roster-team-card').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.roster-team-card__players')).toBeHidden();
  let requests = 0;
  page.on('request', request => { if (request.url().includes('/api/')) requests++; });
  await card.hover();
  await expect(card.locator('.roster-team-card__players')).toBeVisible();
  await expect(card.locator('.team-mark')).toHaveCSS('opacity', '0.25');
  await expect(card).toHaveCSS('border-top-width', '0px');
  expect(requests).toBe(0);
  await page.route('**/api/public/context', async route => {
    const snapshot = await fixtureServices.snapshots.public();
    await route.fulfill({ json: { ...snapshot, teams: snapshot.teams.map(team => ({ ...team, roster: team.id === currentTeam.id ? currentTeam.roster : [] })) } });
  });
  await page.goto('/');
  const topCard = page.locator('.home-ranked-team').filter({ hasText: currentTeam.name });
  await topCard.hover();
  await expect(topCard.locator('.roster-team-card__players')).toBeVisible();
  await expect(topCard.locator('.team-mark')).toHaveCSS('opacity', '0.25');
  await expect(page.locator('.home-brand-statement')).toHaveCount(0);
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touchPage = await mobile.newPage();
  const { installApiFixtures } = await import('../helpers/api-fixture-test');
  await installApiFixtures(touchPage);
  await touchPage.goto(new URL('/tournaments/daily-cup-24', page.url()).href);
  const touchCard = touchPage.locator('.roster-team-card').first();
  await expect(touchCard).toBeVisible();
  await expect(touchCard.locator('.roster-team-card__players')).toBeHidden();
  await expect(touchCard.locator('.roster-team-card__info')).toHaveCSS('opacity', '1');
  expect(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mobile.close();
});

test('downloads actual PNG bytes for both result options without saving images', async ({ page }) => {
  await page.goto('/tournaments/summer-final-25');
  await page.getByRole('button', { name: 'Nəticələri yüklə' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (const [option, filename] of [['Turnir cədvəli', 'leaderboard'], ['Komanda nəticəsi', 'result']]) {
    await dialog.getByRole('radio', { name: option }).click();
    const pending = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Yüklə', exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(`aevic-${filename}-poster.png`);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const png = Buffer.concat(chunks);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(2400);
    expect(png.length).toBeGreaterThan(10000);
    await download.delete();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
