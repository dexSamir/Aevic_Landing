import { test, expect } from '../helpers/api-fixture-test';

test('public profile retains loading, missing and error states', async ({ page }) => {
  await page.route('**/api/public/teams/caspian-wolves', async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"NOT_FOUND"}' });
  });
  await page.goto('/teams/caspian-wolves');
  await expect(page.locator('.loading-skeleton').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Komanda tapılmadı' })).toBeVisible();
  await page.route('**/api/public/teams/caspian-wolves', route => route.fulfill({ status: 403, contentType: 'application/json', body: '{"code":"FORBIDDEN"}' }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Profil yüklənmədi' })).toBeVisible();
});

test('guest private routes keep authentication guards', async ({ page }) => {
  await page.route('**/api/me/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await page.goto('/team/profile');
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/account/security');
  await expect(page).toHaveURL(/\/login$/);
});

test('navigation keeps public data cached and never loads workspace layouts on Home', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(requests.some(url => /\/(WorkspaceLayouts|AdminRoute|TeamRoute|AdminCompletionPages)-/.test(url))).toBe(false);
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  if (mobile) await page.getByRole('button', { name: 'Menyunu aç', exact: true }).click();
  const navigation = mobile ? page.getByRole('dialog', { name: 'AEVIC menyu' }) : page.locator('.site-header__desktop');
  await navigation.getByRole('link', { name: 'Komandalar', exact: true }).click();
  await expect(page).toHaveURL(/\/teams$/);
  await page.waitForLoadState('networkidle');
  expect(requests.filter(url => url.endsWith('/api/public/context'))).toHaveLength(1);
});

test('capture public and captain layouts', async ({ page }, info) => {
  for (const path of ['/', '/teams', '/login', '/team', '/team/profile', '/team/roster']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `/tmp/aevic-perf-${info.project.name}-${path.replaceAll('/', '_') || 'home'}.png`, fullPage: true });
  }
});
