import { test, expect } from '@playwright/test';

test('workspace routes fit all operating viewports and keep the menu on the right', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const routes = ['/team', '/team/tournaments', '/team/tournaments/daily-cup-24', '/team/roster', '/team/sharecards', '/team/settings', '/team/profile', '/team/career', '/teams/caspian-wolves'];
  for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} @ ${width}`).toBeTruthy();
      if (route.startsWith('/team/') || route === '/team') {
        if (width <= 1180) {
          const menu = await page.getByRole('button', { name: 'Naviqasiyanı aç' }).boundingBox();
          const account = await page.getByRole('link', { name: 'Hesab ayarları' }).boundingBox();
          expect(menu!.x, `${route} menu remains right`).toBeGreaterThan(account!.x);
        }
      }
      if (route === '/team' && width === 1440) await page.screenshot({ path: '/tmp/aevic-overview-desktop.png', fullPage: true });
      if (route === '/team/profile' && width === 390) await page.screenshot({ path: '/tmp/aevic-profile-mobile.png', fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});

test('identity preview is local, social saving uses the service, and settings persist preferences', async ({ page }) => {
  await page.goto('/team/profile');
  await page.getByLabel('Komanda adı', { exact: true }).fill('Preview Wolves');
  await expect(page.getByRole('heading', { name: 'Preview Wolves' })).toBeVisible();
  await expect(page.getByText('Kimlik dəyişiklikləri dərc edilməyib')).toBeVisible();
  await page.getByRole('textbox', { name: /Instagram/ }).fill('https://instagram.com/aevic');
  await page.getByRole('button', { name: 'Sosial linkləri saxla' }).click();
  await expect(page.getByText('Sosial linklər nümunə sessiyasında saxlanıldı.')).toBeVisible();
  await page.goto('/team/settings');
  const first = page.getByRole('switch').first();
  await expect(first).toBeVisible();
  await first.click();
  await page.getByRole('button', { name: 'Seçimləri saxla' }).click();
  await expect(page.getByText('Bildiriş seçimləri nümunə sessiyasında saxlanıldı.')).toBeVisible();
  await expect(page.getByLabel('Komanda adı', { exact: true })).toHaveCount(0);
});

test('roster remains visible without a tournament and media export still produces a PNG', async ({ page }) => {
  await page.goto('/team/roster?scenario=no-active-tournament');
  await expect(page.getByRole('heading', { name: 'KAPİTAN', exact: true })).toBeVisible();
  await expect(page.getByText('Vega', { exact: true })).toBeVisible();
  await page.goto('/team/sharecards');
  await expect(page.getByRole('radio', { name: /Komanda kimliyi/ })).toBeChecked();
  const downloadButton = page.getByRole('button', { name: /PNG.*yüklə|PNG-ni yüklə/i }).first();
  await expect(downloadButton).toBeEnabled({ timeout: 20_000 });
  const download = page.waitForEvent('download');
  await downloadButton.click();
  const asset = await download;
  expect(asset.suggestedFilename()).toMatch(/\.png$/);
});

test('clean Team arrival excludes public and auth CSS and heavy generators', async ({ page }) => {
  const loaded: string[] = [];
  page.on('request', request => loaded.push(request.url()));
  await page.goto('/team');
  await expect(page.getByRole('heading', { name: 'Caspian Wolves' })).toBeVisible();
  expect(loaded.filter(url => /public-pages\.css|auth\.css|ProfileCardGenerator|SharecardGenerator|html-to-image|TeamMediaPreview/.test(url))).toEqual([]);
  await page.getByRole('link', { name: 'İctimai profili aç' }).first().click();
  await expect(page.locator('.public-team-hero h1')).toBeVisible();
  await page.goto('/team/profile');
  await expect(page.getByRole('heading', { name: 'Public profil', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('protected room release and roster review retain their real service flows', async ({ page }) => {
  await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
  await page.getByRole('button', { name: 'Otaq statusunu yoxla' }).click();
  await expect(page.locator('.credential-placeholder')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Göstər', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Göstər', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gizlət', exact: true })).toBeVisible();
  await page.goto('/team/roster?scenario=check-in-open');
  await page.getByRole('button', { name: 'Oyunçunu dəyiş', exact: true }).click();
  await page.getByLabel('Yeni oyunçu IGN').fill('RESERVE');
  await page.getByLabel('PUBG UID').fill('5100888999');
  await page.getByLabel('Dəyişiklik səbəbi').fill('Oyunçunun bağlantısı turnir üçün sabit deyil.');
  await page.getByRole('button', { name: 'Yoxlamaya göndər', exact: true }).click();
  await expect(page.getByText('Heyət dəyişikliyi göndərildi')).toBeVisible();
  await page.goto('/team/settings/managers');
  await page.getByRole('button', { name: 'Arxiv qaydalarını yoxla' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dəyişikliyi təsdiqlə' })).toBeDisabled();
});

test('Wrapped and export styles work on a direct route and at 200 percent text', async ({ page }) => {
  await page.goto('/teams/caspian-wolves/wrapped/2025');
  await expect(page.locator('.wrapped-story')).toBeVisible();
  expect(await page.locator('.wrapped-story').evaluate(element => getComputedStyle(element).display)).toBe('grid');
  await page.goto('/team/sharecards');
  await expect(page.locator('.profile-card-studio')).toBeVisible();
  expect(await page.locator('.profile-card-studio').evaluate(element => getComputedStyle(element).display)).toBe('grid');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
