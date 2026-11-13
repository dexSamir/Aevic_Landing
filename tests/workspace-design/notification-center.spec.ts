import type { Page } from '@playwright/test';
import { test, expect } from '../helpers/api-fixture-test';
import { fixtureServices } from '../fixtures/component-services';

async function inbox(page: Page, width: number) {
  await page.setViewportSize({ width, height: 850 });
  const snapshot = await fixtureServices.snapshots.team();
  const base = { ...snapshot.notifications[0], createdAt: '2026-08-04T20:00:00Z', read: false, senderAlias: 'AEVIC Admin' };
  const rows = [
    { ...base, id: 'champ', title: 'Final çempionluğu', eventType: 'champion', tournamentName: 'AEVIC Final', body: 'Rəsmi yekun nəticələr dərc olundu.', actionHref: '/tournaments', actionLabel: undefined, important: false },
    { ...base, id: 'legacy', title: 'Arxiv məlumatı', eventType: undefined, body: 'Tarixi bildiriş', read: true },
  ];
  await page.route('**/api/me/context', route => route.fulfill({ json: { ...snapshot, notifications: rows, dataSource: 'public.teams' } }));
  await page.route('**/api/me/notifications/champ/important', route => route.fulfill({ status: 204 }));
  await page.goto('/team/notifications');
  return page.locator('.notification-row').filter({ hasText: 'Final çempionluğu' });
}

test('desktop inbox details, search, category fallback and acknowledged stars', async ({ page }) => {
  const row = await inbox(page, 1440);
  const reader = page.getByRole('region', { name: 'Bildirişin məzmunu' });
  await expect(reader.getByRole('heading', { name: 'Final çempionluğu' })).toBeVisible();
  const list = await page.locator('.notification-feed').boundingBox();
  const detail = await reader.boundingBox();
  expect(list!.x + list!.width).toBeLessThan(detail!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);
  await reader.getByRole('button', { name: 'Vacib' }).click();
  await expect(reader.getByRole('button', { name: 'Vacib' })).toHaveAttribute('aria-pressed','true');
  await page.getByRole('group', { name: 'Filtrlər' }).getByRole('button', { name: 'Vacib' }).click();
  await expect(row).toBeVisible();
  await expect(page.locator('.notification-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Hamısı', exact: true }).click();
  await page.getByRole('searchbox').fill('Arxiv');
  await expect(reader).toContainText('Sistem məlumatı');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const width of [320,390]) {
  test(`mobile sheet dismissal, focus and navigation at ${width}px`, async ({ page }) => {
    if (width === 320) await page.emulateMedia({ reducedMotion: 'reduce' });
    const row = await inbox(page,width);
    const slot = page.locator('.mobile-nav-slot').last();
    const dialog = page.getByRole('dialog');
    const header = page.locator('.product-topbar');
    await expect(row).toBeVisible();
    const bounds = await header.boundingBox();
    for (const path of ['close','escape','backdrop','drag','back','link']) {
      await row.focus();
      await row.press('Enter');
      await expect(dialog).toBeVisible();
      await expect(slot).toHaveAttribute('inert','');
      await expect(dialog.getByRole('heading', {name:'Final çempionluğu'}).last()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (width === 320) expect(await dialog.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBeTruthy();
      if (path === 'close') await dialog.getByRole('button',{name:'Pəncərəni bağla'}).click();
      if (path === 'escape') await page.keyboard.press('Escape');
      if (path === 'backdrop') await page.mouse.click(3,4);
      if (path === 'drag') {
        const grip = dialog.locator('.notification-sheet__grip');
        await grip.hover();
        const handle = await grip.boundingBox();
        await page.mouse.move(handle!.x + handle!.width / 2,handle!.y + 16);
        await page.mouse.down();
        await page.mouse.move(handle!.x + handle!.width / 2,handle!.y + 90,{steps:5});
        await page.mouse.up();
      }
      if (path === 'back') await page.goBack();
      if (path === 'link') await dialog.getByRole('link',{name:'Nəticələrə bax'}).click();
      await expect(dialog).toHaveCount(0);
      await expect(slot).not.toHaveAttribute('inert','');
      await expect(page.getByRole('navigation',{name:'Mobil əsas naviqasiya'})).toBeVisible();
      if (path !== 'link') {
        await expect(row).toBeFocused();
        expect(await header.boundingBox()).toEqual(bounds);
      } else await expect(page).toHaveURL(/\/tournaments$/);
    }
  });
}

test('account inbox and champion email preferences work without a team', async ({ page }) => {
  const session = { role: 'visitor', user: { id: 'spectator-notices', firstName: 'Viewer', email: 'viewer@example.invalid' } };
  await page.route('**/api/me/session', route => route.fulfill({ json: session }));
  await page.route('**/api/me/notifications?*', route => route.fulfill({ json: { items: [{
    id: 'welcome', eventType: 'welcome', title: 'Xoş gəldiniz', body: 'Hesabınız hazırdır.', senderAlias: 'AEVIC Admin',
    severity: 'info', createdAt: '2026-08-04T10:00:00Z', read: false,
  }], hasMore: false } }));
  let channels = { 'in-app': true, email: true, push: false };
  await page.route('**/api/me/notification-preferences', route => {
    if (route.request().method() === 'PUT') channels = route.request().postDataJSON().channels;
    return route.fulfill({ json: { channels, events: { checkIn: false } } });
  });
  await page.goto('/account/notifications');
  await expect(page.getByRole('heading',{name:'Xoş gəldiniz'})).toBeVisible();
  await expect(page.getByLabel('Check-in',{exact:true})).not.toBeChecked();
  await page.getByText('Çempionluq məktubları', {exact:true}).click();
  await expect(page.getByLabel('Çempionluq məktubları')).not.toBeChecked();
  await page.getByRole('button',{ name:'Seçimləri saxla' }).click();
  await expect.poll(() => channels.email).toBe(false);
});
