import { expect, test } from '@playwright/test';

test('production login preserves editable inputs during and after an API outage', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('api-'), 'Requires the production build host');
  let attempts = 0;
  await page.route('**/api/auth/login', async route => {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"AUTH_UNAVAILABLE"}' });
  });
  await page.goto('/login');
  const email = page.getByLabel('E-poçt');
  const password = page.getByLabel('Şifrə', { exact: true });
  await email.fill('captain@example.test');
  await password.fill('ExamplePassword123');
  await page.getByRole('button', { name: 'Daxil ol' }).click();
  await expect(email).toBeEditable();
  await expect(password).toBeEditable();
  await expect(page.getByText(/Giriş xidməti hazırda əlçatan deyil/)).toBeVisible();
  await expect(email).toHaveValue('captain@example.test');
  await expect(password).toHaveValue('ExamplePassword123');
  await expect(page.getByRole('button', { name: 'Daxil ol' })).toBeEnabled();
  await page.getByRole('button', { name: 'Şifrəni göstər' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  expect(attempts).toBe(1);
  await expect(page).toHaveURL(/\/login$/);
});

test('production unavailable data stays explicit and never becomes fixture content', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('api-'), 'Requires the production build host');
  const scripts: string[] = [];
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()); });
  await page.route('**/api/public/context', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"SERVICE_UNAVAILABLE"}' }));
  await page.goto('/teams');
  await expect(page.getByRole('heading', { name: 'Platform məlumatı yüklənmədi' })).toBeVisible();
  await expect(page.getByText('Caspian Wolves', { exact: true })).toHaveCount(0);
  expect(scripts.some(url => /mockAdapter|mocks\/data/.test(url))).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
