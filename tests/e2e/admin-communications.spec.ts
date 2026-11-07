import { test, expect } from '../helpers/api-fixture-test';
import { defaultBranding, type Branding } from '../../src/content/branding';
import { fixtureServices } from '../fixtures/component-services';

test('reviews a specific recipient before sending and publishes the public navigation', async ({ page }) => {
  let branding: Branding = defaultBranding,
    alias = 'Marshal',
    sends = 0,
    publications = 0;
  const snapshot = await fixtureServices.snapshots.admin();
  await page.route('**/api/public/site-content', (route) => route.fulfill({ json: {} }));
  await page.route('**/api/admin/profile/alias', (route) => {
    if (route.request().method() === 'PUT') alias = route.request().postDataJSON().alias;
    return route.fulfill({ json: { alias, displayName: alias, canBrand: true } });
  });
  await page.route('**/api/admin/messages/recipients', (route) =>
    route.fulfill({
      json: [
        { id: '17', name: 'Falcon', tag: 'FCN', logoUrl: null },
        { id: '22', name: 'Phoenix', tag: 'PHX', logoUrl: null },
      ],
    }),
  );
  await page.route('**/api/admin/context', (route) => route.fulfill({ json: snapshot }));
  await page.route('**/api/admin/messages', (route) => {
    const body = route.request().postDataJSON();
    expect(body.teamId).toBe('22');
    expect(body.expectedCount).toBe(1);
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    sends++;
    snapshot.adminMessages.unshift({
      ...body,
      id: 'sent-message',
      createdAt: new Date().toISOString(),
      senderAlias: alias,
      recipientName: 'Phoenix',
      recipientCount: 1,
      deliveryCount: 1,
      read: false,
    });
    return route.fulfill({ json: { id: 'sent-message', recipientCount: 1 } });
  });
  await page.route('**/api/admin/settings/branding', (route) => {
    if (route.request().method() === 'PUT') {
      branding = { ...route.request().postDataJSON(), revision: 1 };
      publications++;
    }
    return route.fulfill({ json: branding });
  });
  await page.route('**/api/public/settings', (route) =>
    route.fulfill({
      json: { supportEmail: 'a@example.invalid', registrationEnabled: true, maintenanceMessage: '', branding },
    }),
  );
  await page.goto('/admin/messages');
  await page.getByRole('button', { name: 'Konkret komanda' }).click();
  await page.getByRole('searchbox', { name: 'Alıcı komanda axtar' }).fill('phx');
  await page.getByRole('button', { name: /Phoenix/ }).click();
  await page.getByLabel('Elan başlığı').fill('Match briefing');
  await page.getByLabel('Elan mətni').fill('Prepare your roster.');
  await page.getByRole('button', { name: 'Önbaxış' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Marshal');
  await expect(dialog).toContainText('Phoenix');
  expect(sends).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Elanı göndər' }).click();
  await expect(page.getByText('Elan 1 komandanın mesaj qutusuna göndərildi.')).toBeVisible();
  await page.locator('.comm-history-item summary').filter({ hasText: 'Match briefing' }).click();
  await expect(page.getByText('1 tətbiqdaxili bildiriş yaradılıb')).toBeVisible();
  expect(sends).toBe(1);
  await page.goto('/admin/settings');
  await page.getByLabel('Görünən ad').fill('Referee');
  await page.getByRole('button', { name: 'İmzanı saxla' }).click();
  await expect(page.getByText(/Cari imza · Referee/)).toBeVisible();
  await page.getByRole('button', { name: 'Brend və keçidlər' }).click();
  await page.getByLabel('Saytın adı').fill('Arena Club');
  await page.getByLabel('Etiket', { exact: true }).first().fill('Arena');
  await page
    .getByRole('combobox', { name: /^Ünvan/ })
    .first()
    .fill('javascript:alert(1)');
  await expect(page.getByRole('button', { name: 'Dəyişiklikləri yayımla' })).toBeDisabled();
  await page
    .getByRole('combobox', { name: /^Ünvan/ })
    .first()
    .fill('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Dəyişiklikləri yayımla' }).click();
  expect(publications).toBe(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Yayımla', exact: true }).click();
  await expect(page.getByText('Brend və keçidlər yayımlandı.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Arena Club ana səhifə' }).first()).toBeAttached();
  const navName = (page.viewportSize()?.width ?? 0) < 800 ? 'Mobil əsas naviqasiya' : 'Əsas naviqasiya';
  await expect(
    page
      .getByRole('navigation', { name: navName, exact: true })
      .getByRole('link', { name: 'Arena', exact: true })
      .first(),
  ).toBeVisible();

  const team = await fixtureServices.snapshots.team();
  const item = {
    ...snapshot.adminMessages[0],
    id: 'team-notification',
    eventType: 'admin-message' as const,
    read: false,
  };
  await page.route('**/api/me/context', (route) =>
    route.fulfill({ json: { ...team, notifications: [item], dataSource: 'public.teams' } }),
  );
  await page.route('**/api/me/notifications/team-notification/read', (route) => {
    item.read = true;
    return route.fulfill({ status: 204 });
  });
  await page.goto('/team/notifications');
  const notification = page.locator('.notification-item').filter({ hasText: 'Match briefing' });
  await expect(notification).toContainText('Marshal');
  await expect(notification).toContainText('Prepare your roster.');
  await expect(notification).toHaveClass(/notification-item--unread/);
  await page.getByRole('button', { name: 'Oxunmuş et', exact: true }).click();
  await expect(notification).not.toHaveClass(/notification-item--unread/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
