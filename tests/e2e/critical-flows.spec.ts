import { expect, test } from '@playwright/test';

test('auth lifecycle: login, recovery, verification, and security', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /komanda panelinə giriş/i })).toBeVisible();
  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: /şifrəni bərpa et/i })).toBeVisible();
  await page.goto('/reset-password?token=valid');
  await expect(page.getByRole('heading', { name: /yeni şifrə yarat/i })).toBeVisible();
  await page.goto('/verify-email?token=verified');
  await expect(page.getByRole('heading', { name: /email təsdiqləndi/i })).toBeVisible();
  await page.goto('/account/security');
  await expect(page.getByRole('heading', { name: 'Təhlükəsizlik' })).toBeVisible();
});

test('captain lifecycle: registration, tournament, check-in, room, dispute, and support', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: /komandanı yarışa hazırla/i })).toBeVisible();
  await page.goto('/tournaments/daily-cup-24');
  await expect(page.getByRole('heading', { name: /daily cup #24/i })).toBeVisible();
  await page.goto('/team/tournaments/daily-cup-24');
  await expect(page.getByText(/otaq məlumatları/i).first()).toBeVisible();
  await page.goto('/team/disputes/new');
  await expect(page.getByRole('heading', { name: /nəticəyə etiraz et/i })).toBeVisible();
  await page.goto('/account/support/tickets/new');
  await expect(page.getByRole('heading', { name: /problemi izah edin/i })).toBeVisible();
});

test('public competition graph: tournament, participant team, results, match center, and search stay connected', async ({ page }) => {
  await page.goto('/tournaments/daily-cup-24');
  await expect(page.getByRole('heading', { name: /daily cup #24/i })).toBeVisible();
  await expect(page.getByRole('list', { name: /6 təsdiqlənmiş iştirakçı komanda/i })).toBeVisible();

  await page.getByRole('button', { name: /caspian wolves heyətini göstər/i }).click();
  await page.locator('a[href="/teams/caspian-wolves"]:visible').first().click();
  await expect(page).toHaveURL(/\/teams\//);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

  await page.goto('/tournaments/daily-cup-24');
  await page.locator('.competition-round-program li a').first().click();
  await expect(page).toHaveURL(/\/tournaments\/daily-cup-24#results/);
  await expect(page.getByRole('heading', { name: 'Rəsmi nəticələr' })).toBeVisible();

  await page.goto('/matches');
  await expect(page.getByRole('heading', { name: 'İndi', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Növbəti' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Son nəticələr' })).toBeVisible();

  await expect(page.locator('.public-rules-link')).toHaveAttribute('href', '/regulations');
  await expect(page.locator('.global-search-trigger')).toHaveCount(0);
  await page.goto('/search?q=Caspian');
  const searchResult = page.locator('.search-results-ledger').getByRole('link', { name: /Caspian Wolves/i }).first();
  await expect(searchResult).toBeVisible();
  await searchResult.click();
  await expect(page).toHaveURL(/\/teams\/caspian-wolves/);
});

test('identity lifecycle: profile, share card, removed player route, invitations, and organization', async ({ page }) => {
  await page.goto('/teams/caspian-wolves');
  await expect(page.getByRole('heading', { name: /caspian wolves/i }).first()).toBeVisible();
  await page.goto('/teams/caspian-wolves/share-card');
  await expect(page.getByRole('heading', { name: /caspian wolves kart studiyası/i })).toBeVisible();
  await page.goto('/players');
  await expect(page.getByRole('heading', { name: /bu səhifə yarış cədvəlində yoxdur/i })).toBeVisible();
  await page.goto('/team/invitations');
  await expect(page.getByRole('heading', { name: /komanda dəvətləri/i })).toBeVisible();
  await page.goto('/team/organization/caspian-vanguard');
  await expect(page.getByRole('heading', { name: /caspian vanguard/i })).toBeVisible();
});

test('team overview exposes canonical public identity and an unambiguous tournament context link', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/team');

  const publicProfile = page.getByRole('link', { name: /İctimai profili aç/i }).first();
  await expect(publicProfile).toHaveAttribute('href', '/teams/caspian-wolves');
  await publicProfile.focus();
  await expect(publicProfile).toBeFocused();
  await publicProfile.press('Enter');
  await expect(page).toHaveURL(/\/teams\/caspian-wolves$/);
  await expect(page.getByRole('heading', { level: 1, name: /caspian wolves/i })).toBeVisible();

  await page.goto('/team');
  const tournamentContext = page.getByRole('link', { name: /Erangel, Raund 1 turnir əməliyyatlarını aç/i });
  await expect(tournamentContext).toHaveAttribute('href', '/team/tournaments/daily-cup-24');
  await tournamentContext.focus();
  await expect(tournamentContext).toBeFocused();
  await tournamentContext.press('Enter');
  await expect(page).toHaveURL(/\/team\/tournaments\/daily-cup-24$/);
});

test('admin lifecycle: team, roster, disputes, verification, results, support, and audit', async ({ page }) => {
  await page.goto('/admin/teams');
  await page.locator('a[href="/admin/teams/team-02"]:visible').click();
  await expect(page.getByRole('heading', { level: 1, name: /north flame/i })).toBeVisible();
  await page.goto('/admin/roster-requests');
  await expect(page.getByRole('heading', { name: /heyət sorğuları/i })).toBeVisible();
  await page.goto('/admin/disputes');
  await expect(page.getByRole('heading', { name: /nəticə etirazları/i })).toBeVisible();
  await page.goto('/admin/verifications');
  await expect(page.getByRole('heading', { name: /təsdiq sorğuları/i })).toBeVisible();
  await page.goto('/admin/verifications/missing-verification');
  await expect(page.getByRole('heading', { level: 1, name: /verification tapılmadı/i })).toBeVisible();
  await page.getByRole('link', { name: /verification növbəsinə qayıt/i }).click();
  await page.goto('/admin/tournaments/daily-cup-24');
  await page.getByRole('link', { name: 'Həyat dövrü' }).click();
  await expect(page.getByRole('heading', { name: /daily cup #24/i })).toBeVisible();
  await page.getByRole('link', { name: /turnir əməliyyatlarına qayıt/i }).click();
  await page.goto('/admin/results');
  await expect(page.getByRole('heading', { name: /nəticə nəşri hələ əlçatan deyil/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /turnir əməliyyatlarına bax/i })).toBeVisible();
  await page.goto('/admin/support');
  await expect(page.getByRole('heading', { name: /dəstək sorğuları/i })).toBeVisible();
  await page.goto('/admin/audit');
  await expect(page.getByRole('heading', { name: /audit jurnalı/i })).toBeVisible();
  await page.goto('/admin/blacklist');
  await page.getByRole('textbox', { name: 'Qara siyahıda axtar' }).fill('Crimson');
  await expect(page.locator('.blacklist-list article')).toHaveCount(1);
  await expect(page.locator('.blacklist-list')).toContainText('Crimson Steppe');
  await page.getByRole('textbox', { name: 'Qara siyahıda axtar' }).fill('');
  await page.getByRole('combobox').selectOption('expired');
  await expect(page.locator('.blacklist-list article')).toHaveCount(1);
  await expect(page.locator('.blacklist-list')).toContainText('Old Guard');
  await page.getByRole('textbox', { name: 'Qara siyahıda axtar' }).fill('no-matching-record');
  await expect(page.getByRole('heading', { name: 'Uyğun qeyd tapılmadı' })).toBeVisible();
});
