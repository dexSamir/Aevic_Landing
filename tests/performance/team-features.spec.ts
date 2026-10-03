import { test, expect } from '../helpers/api-fixture-test';
import { teamSnapshotScenario } from '../fixtures/component-services';
import type { Page } from '@playwright/test';
import sharp from 'sharp';

// Local HTTP fixtures only; no production requests or uploads.
test('overview keeps neutral cards and analytics visible without results', async ({ page }) => {
  for (const unavailable of [false, true]) {
    const data = teamSnapshotScenario('no-active-tournament');
    await page.route('**/api/me/context', route => route.fulfill({ json: { ...data, dataSource: 'public.teams', matchHistory: [], notifications: [], historyAvailable: !unavailable, unavailable: unavailable ? { competition: true, room: true, history: true } : {} } }));
    await page.goto('/team');
    await expect(page.locator('.team-overview > :first-child')).toHaveClass('team-intelligence');
    await expect(page.locator('.intelligence-card')).toHaveCount(4);
    await expect(page.locator('.team-insights .insight-chart--empty')).toHaveCount(4);
    await expect(page.locator('.team-insights svg')).toHaveCount(0);
    await expect(page.locator('.team-insights')).toContainText(unavailable ? 'Məlumat əlçatan deyil' : 'Nəticə gözlənilir');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.unroute('**/api/me/context');
  }
  await page.goto('/team');
  await expect(page.locator('.team-insights svg')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Xəritə üzrə orta kill' })).toBeVisible();
  await page.getByRole('button', { name: 'Xal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Xal dinamikası' })).toBeVisible();
  const rail = page.locator('.intelligence-rail');
  await rail.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const start = await rail.evaluate(el => el.scrollLeft);
  await page.clock.runFor(1200);
  expect(await rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(start);
  await page.getByRole('button', { name: 'Avtomatik hərəkəti dayandır' }).click();
  const paused = await rail.evaluate(el => el.scrollLeft);
  await page.clock.runFor(1200);
  expect(await rail.evaluate(el => el.scrollLeft)).toBe(paused);
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Avtomatik hərəkəti dayandır' })).toHaveCount(0);
  await rail.focus(); await page.keyboard.press('End');
  expect(await rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
});

test('room credentials require the authorized room endpoint', async ({ page }) => {
  await page.route('**/api/team/tournaments/**/room', route => route.fulfill({ status: 403, json: { code: 'FORBIDDEN', message: 'Forbidden' } }));
  await page.goto('/team?scenario=room-ready');
  await expect(page.locator('.intelligence-card').filter({ hasText: 'Giriş icazəsi tələb olunur' })).toBeVisible();
  await expect(page.locator('.intelligence-card').filter({ hasText: 'ID:' })).toHaveCount(0);
  await page.unroute('**/api/team/tournaments/**/room');
  await page.goto('/team?scenario=room-ready');
  await expect(page.locator('.intelligence-card').filter({ hasText: 'ID: 1234567' })).toBeVisible();
});

async function exerciseEditor(page: Page, width: number, height: number) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const canvas = dialog.locator('canvas');
  await expect(canvas).toHaveAttribute('width', String(width));
  await expect(canvas).toHaveAttribute('height', String(height));
  await expect(dialog.getByRole('button', { name: 'Tətbiq et' })).toBeEnabled();
  const pixels = () => canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
  const original = await pixels();
  await dialog.getByRole('button', { name: 'Böyüt', exact: true }).click();
  await expect(dialog.getByRole('slider')).toHaveValue('1.1');
  await dialog.getByRole('button', { name: 'Sağa çək' }).click();
  await dialog.getByRole('button', { name: 'Sağa döndər' }).click();
  expect(await pixels()).not.toBe(original);
  await dialog.getByRole('button', { name: 'Sıfırla' }).click();
  expect(await pixels()).toBe(original);
  await canvas.focus(); await page.keyboard.press('ArrowLeft');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 + 10); await page.mouse.up();
}

test('reachable profile, sharecard and registration editors apply only after confirmation', async ({ page }) => {
  const buffer = await sharp(Buffer.from('<svg width="900" height="600"><rect width="900" height="600" fill="#284038"/><rect width="300" height="600" fill="#d3af53"/><circle cx="600" cy="200" r="120" fill="#f5f0df"/></svg>')).png().toBuffer();
  const file = { name: 'editor-check.png', mimeType: 'image/png', buffer };
  let uploads = 0;
  await page.route('**/api/media/uploads', async route => { uploads++; await route.fulfill({ json: { previewUrl: '/brand/aevic-phoenix.jpg' } }); });
  await page.goto('/team/profile');
  await page.getByRole('button', { name: 'Loqo və banneri idarə et' }).click();
  await expect(page.getByText('Tövsiyə: 1600 × 500 px', { exact: false })).toBeVisible();
  for (const [label, width, height] of [['Komanda banneri', 1600, 500], ['Komanda loqosu', 1024, 1024]] as const) {
    const before = uploads;
    await page.getByLabel(label, { exact: true }).setInputFiles(file);
    await exerciseEditor(page, width, height); expect(uploads).toBe(before);
    await page.getByRole('button', { name: 'Ləğv et', exact: true }).click(); expect(uploads).toBe(before);
    await page.getByLabel(label, { exact: true }).setInputFiles(file);
    await page.getByRole('button', { name: 'Tətbiq et' }).click();
    await expect.poll(() => uploads).toBe(before + 1);
    await expect(page.getByText(label === 'Komanda banneri' ? 'Banner saxlanıldı.' : 'Loqo saxlanıldı.', { exact: true })).toBeVisible();
  }
  await page.goto('/team/sharecards');
  await page.getByLabel('Kart fonu', { exact: true }).setInputFiles(file);
  await expect(page.getByRole('dialog', { name: 'Kartın fonunu düzəlt' })).toBeVisible();
  const before = uploads;
  await page.getByRole('button', { name: 'Tətbiq et' }).click();
  await expect(page.getByText('Xüsusi fon seçilib.', { exact: false })).toBeVisible();
  expect(uploads).toBe(before);
  await page.getByRole('button', { name: 'AEVIC fonuna qayıt' }).click();
  await expect(page.getByText('Rəsmi AEVIC fonu seçilib.', { exact: false })).toBeVisible();
  await page.route('**/api/me/session', route => route.fulfill({ json: null }));
  await page.goto('/register');
  await page.getByLabel('Komanda loqosunu seç', { exact: true }).setInputFiles(file);
  await exerciseEditor(page, 1024, 1024);
  await page.getByRole('button', { name: 'Tətbiq et' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); expect(uploads).toBe(before);
});
