import { expect, test } from '@playwright/test';

test('critical workspaces reflow at 320px and 200% text', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Explicit text-size matrix runs once.');
  await page.setViewportSize({ width: 320, height: 568 });
  for (const path of ['/team', '/admin', '/register', '/team/sharecards', '/admin/tournaments/daily-cup-24', '/admin/blacklist']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    if (path.endsWith('sharecards')) await expect(page.getByRole('button', { name: 'PNG yüklə' })).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; document.documentElement.style.fontSize = '200%'; });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { message: path }).toBeLessThanOrEqual(1);
  }
});

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 640, height: 900 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const consistencyRefactorPaths = [
  '/',
  '/tournaments',
  '/leaderboard',
  '/archive',
  '/organizations',
  '/organizations/caspian-vanguard',
  '/team/settings',
];

const refinedTeamExperiencePaths = [
  '/teams/caspian-wolves',
  '/tournaments/daily-cup-24',
  '/team',
  '/team/tournaments/daily-cup-24',
  '/matches',
  '/matches/dc24-r1',
  '/records',
  '/team/sharecards',
];

const teamPanelViewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
];

const teamPanelPaths = [
  '/team',
  '/team/tournaments',
  '/team/tournaments/daily-cup-24',
  '/team/history',
  '/team/comparison',
  '/team/roster',
  '/team/messages',
  '/team/notifications',
  '/team/roster-requests',
  '/team/roster-requests/RC-0021',
  '/team/disputes',
  '/team/disputes/new',
  '/team/disputes/DSP-0007',
  '/team/sharecards',
  '/team/badges',
  '/team/badges/ach-top-four',
  '/team/invitations',
  '/team/settings/managers',
  '/team/verification',
  '/team/organization/caspian-vanguard',
  '/team/settings',
];

test('every Team route stays contained at the requested redesign viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'The complete matrix runs once with explicit viewport sizes.');
  test.setTimeout(180_000);
  const errors: string[] = [];
  const failedResponses: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });

  for (const viewport of teamPanelViewports) {
    await page.setViewportSize(viewport);
    for (const path of teamPanelPaths) {
      await page.goto(path);
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('#main-content h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflowed at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(1);
    }
  }

  expect(errors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test('every Team route retains its primary content at 200% text size', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'The text resize audit runs once.');
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  const overflowed: Array<{ path: string; overflow: number; offenders: string[] }> = [];
  for (const path of teamPanelPaths) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expect(page.locator('#main-content h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) {
      const offenders = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#main-content *')]
        .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.right > window.innerWidth + 1; })
        .slice(0, 6)
        .map((element) => `${element.tagName}.${element.className}:${Math.round(element.getBoundingClientRect().right)}px`));
      overflowed.push({ path, overflow, offenders });
    }
  }
  expect(overflowed).toEqual([]);
});

test('Home tournament facts share strict label and value rows', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Geometry is asserted against the desktop composition.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const geometry = await page.locator('.home-competition-rail dl').evaluate((list) => ({
    labels: [...list.querySelectorAll('dt')].map((node) => Math.round(node.getBoundingClientRect().top)),
    values: [...list.querySelectorAll('dd')].map((node) => Math.round(node.getBoundingClientRect().top)),
  }));
  expect(new Set(geometry.labels).size).toBe(1);
  expect(new Set(geometry.values).size).toBe(1);
});

test('Team mobile navigation and the overview confirmation dialog are keyboard safe', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'The interaction pass uses explicit desktop and mobile viewports.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/team');
  const menu = page.getByRole('button', { name: 'Naviqasiyanı aç' });
  await menu.focus();
  await menu.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Komanda paneli' })).toBeVisible();
  await page.getByRole('link', { name: 'Turnirlərim' }).press('Enter');
  await expect(page).toHaveURL(/\/team\/tournaments$/);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/team?scenario=check-in-open');
  const checkIn = page.getByRole('button', { name: 'Check-in et' });
  await checkIn.focus();
  await checkIn.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Check-in-i təsdiqlə' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('Home map is informational and team disclosure works with focus, hover, and one-at-a-time taps', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'The interaction matrix runs once with explicit viewport sizes.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const program = page.locator('.map-program');
  await program.scrollIntoViewIfNeeded();
  await expect(program.locator(':scope > ol > li')).toHaveCount(4);
  await expect(program.locator('a, button')).toHaveCount(0);
  expect(await program.evaluate((element) => getComputedStyle(element).cursor)).toBe('default');

  const teams = page.locator('.home-team-stage');
  await teams.scrollIntoViewIfNeeded();
  const teamButtons = teams.getByRole('button');
  await expect(teamButtons).toHaveCount(5);
  await expect(teamButtons.first()).toHaveAttribute('aria-describedby', /home-team-roster-/);
  await expect(teamButtons.first()).not.toHaveAttribute('aria-expanded');
  await teamButtons.first().focus();
  await expect(teams.locator('.team-roster-reveal--names').first()).toHaveCSS('opacity', '1');
  await expect(teams.locator('.team-roster-reveal--names').first()).toContainText('Vega');
  const publicCopy = await teams.locator('.team-roster-reveal--names').first().innerText();
  expect(publicCopy).not.toMatch(/email|telefon|ölkə|country/i);
  await teamButtons.nth(1).hover();
  await expect(teams.locator('.team-roster-reveal--names').nth(1)).toHaveCSS('opacity', '1');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const mobileButtons = page.locator('.home-team-stage').getByRole('button');
  await mobileButtons.nth(1).click();
  await expect(mobileButtons.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await mobileButtons.first().click();
  await expect(mobileButtons.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(mobileButtons.nth(1)).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect(mobileButtons.first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('public reveals are observer-driven and become static under reduced motion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'The motion contract runs once.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.motion-page--editorial')).toHaveClass(/public-reveal-ready/);
  await page.locator('.home-rotation').scrollIntoViewIfNeeded();
  await expect(page.locator('.home-rotation')).toHaveClass(/is-revealed/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const states = await page.locator('[data-reveal]').evaluateAll((items) => items.map((item) => {
    const styles = getComputedStyle(item);
    return { opacity: styles.opacity, transform: styles.transform, animation: styles.animationName };
  }));
  expect(states.every((state) => state.opacity === '1' && state.transform === 'none')).toBe(true);
  expect(await page.locator('.motion-page').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});

test('captain overview answers now, next, changed, and readiness without legacy dashboard structures', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'The overview architecture runs once.');
  for (const viewport of teamPanelViewports) {
    await page.setViewportSize(viewport);
    await page.goto('/team');
    await expect(page.locator('.team-now')).toBeVisible();
    await expect(page.locator('.team-now__quickline')).toContainText('SONRA');
    await expect(page.locator('.team-now__quickline')).toContainText('DƏYİŞƏN');
    await expect(page.locator('.team-competition-anchor')).toBeVisible();
    await expect(page.locator('.team-readiness-ledger')).toBeVisible();
    await expect(page.locator('.team-command-center, .team-dashboard-readiness')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(1);
    if (viewport.width <= 430) {
      const quickline = await page.locator('.team-now__quickline').boundingBox();
      expect(quickline?.y).toBeLessThan(viewport.height);
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/team');
  const active = page.locator('.side-nav a.active');
  const selection = await active.evaluate((element) => {
    const styles = getComputedStyle(element);
    const detail = getComputedStyle(element, '::after');
    return { shadow: styles.boxShadow, borderLeft: styles.borderLeftWidth, detailWidth: detail.width, detailColor: detail.backgroundColor };
  });
  expect(selection.shadow).not.toContain('inset 2px 0px');
  expect(selection.borderLeft).toBe('1px');
  expect(parseFloat(selection.detailWidth)).toBeGreaterThan(0);
  expect(selection.detailColor).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('.sidebar-note--interactive')).toContainText('Növbəti matç');
});

test('requested viewport matrix has no document-level horizontal overflow or console errors', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of ['/', '/teams', '/team/settings/managers', '/admin/verifications']) {
      await page.goto(path);
      await expect(page.locator('main').first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflowed at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(1);
    }
  }
  expect(errors).toEqual([]);
});

test('refined team experience stays contained across the requested viewport matrix', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of refinedTeamExperiencePaths) {
      await page.goto(path);
      await expect(page.locator('main').first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflowed at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(1);
    }
  }
  expect(errors).toEqual([]);
});

test('global consistency and settings surfaces stay contained across the requested viewport matrix', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of consistencyRefactorPaths) {
      await page.goto(path);
      await expect(page.locator('main').first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflowed at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(1);
    }
  }
  expect(errors).toEqual([]);
});

test('keyboard entry, labeled controls, and 200% text scaling retain access to primary content', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/support');
  const skipLink = page.locator('a.skip-link');
  await expect(skipLink).toHaveAttribute('href', '#main-content');
  await expect(page.locator('#main-content')).toBeFocused();
  await skipLink.focus();
  await skipLink.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('textbox', { name: /dəstək mövzularında axtar/i })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole('link', { name: /ticket yarat/i })).toBeVisible();
});

test('public navbar groups navigation beside the logo and keeps utilities separate', async ({ page }) => {
  for (const width of [1024, 1280, 1366, 1440, 1600, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/teams/caspian-wolves');
    const capsule = page.locator('.site-header .public-nav-capsule');
    await expect(capsule).toBeVisible();
    await expect(capsule.locator('a')).toHaveText(['Ana səhifə', 'Turnirlər', 'Komandalar', 'Matçlar']);
    await expect(capsule.locator('a.active')).toHaveText('Komandalar');
    await expect(capsule.locator('.nav-login, .nav-cta')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /hesab menyusu/i })).toBeVisible();
    const geometry = await page.evaluate(() => {
      const capsule = document.querySelector('.site-header .public-nav-capsule')!;
      const links = [...capsule.querySelectorAll('a')];
      const capsuleRect = capsule.getBoundingClientRect();
      const capsuleStyles = getComputedStyle(capsule);
      const linkStyles = getComputedStyle(links[0]);
      const activeStyles = getComputedStyle(capsule.querySelector('a.active')!);
      const headerStyles = getComputedStyle(document.querySelector('.site-header')!);
      const logoRect = document.querySelector('.site-header .brand-mark--navigation')!.getBoundingClientRect();
      const identityRect = document.querySelector('.site-header .public-identity-trigger')!.getBoundingClientRect();
      return {
        logoNavGap: capsuleRect.left - logoRect.right,
        navToolsGap: document.querySelector('.site-header__tools')!.getBoundingClientRect().left - capsuleRect.right,
        linkTargets: links.map((link) => ({ width: link.getBoundingClientRect().width, height: link.getBoundingClientRect().height })),
        capsuleWidth: capsuleRect.width,
        capsuleHeight: capsuleRect.height,
        headerHeight: document.querySelector('.site-header')!.getBoundingClientRect().height,
        capsuleDisplay: capsuleStyles.display,
        capsuleGap: parseFloat(capsuleStyles.gap),
        capsulePadding: [parseFloat(capsuleStyles.paddingTop), parseFloat(capsuleStyles.paddingRight)],
        capsuleRadius: parseFloat(capsuleStyles.borderRadius),
        capsuleBorder: parseFloat(capsuleStyles.borderTopWidth),
        linkPadding: [parseFloat(linkStyles.paddingTop), parseFloat(linkStyles.paddingRight)],
        linkFontSize: parseFloat(linkStyles.fontSize),
        logoWidth: logoRect.width,
        linkRadius: parseFloat(linkStyles.borderRadius),
        linkBorder: parseFloat(linkStyles.borderTopWidth),
        activeBorder: parseFloat(activeStyles.borderTopWidth),
        headerBackground: headerStyles.backgroundColor,
        headerBorder: parseFloat(headerStyles.borderBottomWidth),
        headerBackdrop: headerStyles.backdropFilter,
        mainTop: document.querySelector('main')!.getBoundingClientRect().top,
        demoClockVisible: document.querySelector('.mock-banner--public')?.getBoundingClientRect().height ?? 0,
        linkWidths: links.map((link) => Math.round(link.getBoundingClientRect().width)),
        identityWidth: identityRect.width,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(geometry.logoNavGap).toBeGreaterThanOrEqual(12);
    expect(geometry.logoNavGap).toBeLessThanOrEqual(40);
    expect(geometry.navToolsGap).toBeGreaterThanOrEqual(12);
    for (const target of geometry.linkTargets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    expect(geometry.capsuleWidth).toBeLessThan(500);
    expect(geometry.capsuleHeight).toBe(56);
    expect(geometry.headerHeight).toBeGreaterThanOrEqual(geometry.logoWidth);
    expect(['flex', 'inline-flex']).toContain(geometry.capsuleDisplay);
    expect(geometry.capsuleGap).toBe(7);
    expect(geometry.capsulePadding).toEqual([6, 8]);
    expect(geometry.capsuleRadius).toBeLessThanOrEqual(20);
    expect(geometry.capsuleBorder).toBe(0);
    expect(geometry.linkPadding[0]).toBeGreaterThanOrEqual(12);
    expect(geometry.linkPadding[1]).toBeGreaterThanOrEqual(10);
    expect(geometry.linkFontSize).toBe(15);
    expect(geometry.logoWidth).toBe(72);
    expect(geometry.linkRadius).toBe(15);
    expect(geometry.linkBorder).toBe(0);
    expect(geometry.activeBorder).toBe(0);
    expect(geometry.headerBackground).toBe('rgba(0, 0, 0, 0)');
    expect(geometry.headerBorder).toBe(0);
    expect(geometry.headerBackdrop).toBe('none');
    expect(geometry.demoClockVisible).toBe(0);
    expect(geometry.mainTop).toBeLessThanOrEqual(geometry.headerHeight);
    expect(geometry.mainTop).toBeLessThanOrEqual(80);
    expect(new Set(geometry.linkWidths).size).toBeGreaterThan(1);
    expect(geometry.identityWidth).toBeGreaterThanOrEqual(44);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.site-header .public-nav-capsule a.active')).toHaveText('Ana səhifə');

  for (const width of [390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/matches/dc24-r1');
    await expect(page).toHaveURL(/\/tournaments\/daily-cup-24#matches$/);
    await expect(page.locator('.site-header .public-nav-capsule')).toBeHidden();
    await page.getByRole('button', { name: 'Menyunu aç' }).click();
    const drawerNav = page.locator('.drawer .public-nav-capsule');
    await expect(drawerNav.locator('a')).toHaveText(['Ana səhifə', 'Turnirlər', 'Komandalar', 'Matçlar']);
    await expect(drawerNav.locator('a.active')).toHaveText('Turnirlər');
    const identity = page.locator('.drawer .public-identity-trigger');
    await expect(identity).toBeVisible();
    await identity.click();
    await expect(page.locator('.drawer .public-identity-menu')).toContainText('Komanda paneli');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Menyunu bağla' }).click();
  }
});

test('public navbar indicator travels as one layer and page arrivals respect motion preference', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const capsule = page.locator('.site-header .public-nav-capsule');
  const indicator = capsule.locator('.public-nav-indicator');
  await expect(indicator).toHaveCount(1);
  await expect(capsule).toHaveAttribute('data-indicator-ready', 'true');
  const startX = (await indicator.boundingBox())?.x ?? 0;
  await capsule.getByRole('link', { name: 'Matçlar' }).click();
  await expect(page).toHaveURL(/\/matches$/);
  await expect(capsule.locator('a.active')).toHaveText('Matçlar');
  const endX = (await indicator.boundingBox())?.x ?? 0;
  expect(endX).toBeGreaterThan(startX);
  await expect(page.locator('.motion-page')).toHaveAttribute('data-page-family', 'competition');
  const timing = await indicator.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { duration: styles.transitionDuration, easing: styles.transitionTimingFunction };
  });
  expect(timing.duration).toContain('0.24s');
  expect(timing.easing).not.toContain('linear');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.locator('.motion-page').evaluate((element) => ({
    animation: getComputedStyle(element).animationName,
    duration: getComputedStyle(element).animationDuration,
  }));
  expect(reduced.animation).toBe('none');
  expect(parseFloat(reduced.duration)).toBeLessThanOrEqual(0.00001);
});

test('authenticated account menu is keyboard-safe and logout restores public actions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/teams/caspian-wolves');
  const trigger = page.getByRole('button', { name: /hesab menyusu/i });
  await trigger.click();
  const firstItem = page.getByRole('menuitem', { name: 'Komanda paneli' });
  await expect(firstItem).toBeFocused();
  await firstItem.press('Escape');
  await expect(page.getByRole('menu', { name: 'Hesab əməliyyatları' })).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole('menuitem', { name: 'Çıxış' }).click();
  await expect(page).toHaveURL(/\/$/);
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: 'Daxil ol', exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Komanda yarat', exact: true })).toBeVisible();
});

test('desktop auth content clears the overlay header and public teams keep editorial rhythm', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/register');
  const header = await page.locator('.site-header').boundingBox();
  const title = await page.getByRole('heading', { level: 1, name: /komandanı yarışa hazırla/i }).boundingBox();
  expect(header).not.toBeNull();
  expect(title).not.toBeNull();
  expect(title!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
  await expect(page.locator('.auth-shell--register .auth-shell__message')).toHaveCount(0);
  await expect(page.locator('.registration-team-preview')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await page.goto('/teams');
  await expect(page.locator('.motion-page')).toHaveAttribute('data-page-family', 'editorial');
});

test('register reflows at 200% and calendar day targets stay at least 44px at 1024px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('button', { name: /davam et/i })).toBeVisible();
  const activeStep = page.locator('.registration-step[aria-current="step"]');
  await expect(activeStep).toContainText('Komanda');

  await page.goto('/team');
  await expect(page.locator('.team-now')).toBeVisible();
  await expect(page.locator('.team-change-ledger')).toBeVisible();
  await expect(page.locator('.team-readiness-ledger')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/tournaments');
  await expect(page.locator('.tournament-calendar__strip button').first()).toBeVisible();
  const dayTargets = await page.locator('.tournament-calendar__strip button').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
  expect(dayTargets.length).toBeGreaterThan(0);
  expect(Math.min(...dayTargets)).toBeGreaterThanOrEqual(44);
});

test('redesigned route families remain contained at every requested breakpoint', async ({ page }) => {
  test.setTimeout(150_000);
  const routes = ['/teams', '/login', '/register', '/team', '/team/sharecards', '/admin', '/admin/teams'];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of routes) {
      await page.goto(path);
      await expect(page.locator('main').first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflowed at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(1);
    }
  }
});

test('Wrapped behaves as an automatic, hold-to-pause story and stops on its summary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/teams/caspian-wolves/wrapped/2025');
  const story = page.locator('.wrapped-story');
  const progress = page.locator('.wrapped-progress');
  await expect(story).toBeVisible();
  await expect(progress).toHaveAttribute('aria-valuetext', /1 \/ \d+/);
  const total = Number((await progress.getAttribute('aria-valuetext'))?.split('/')[1].trim());
  await expect(page.locator('body')).toHaveClass(/wrapped-active/);
  expect(await page.evaluate(() => ({ scrollY, overflow: getComputedStyle(document.body).overflow }))).toEqual({ scrollY: 0, overflow: 'hidden' });

  const bounds = await page.locator('.wrapped-story__content').boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.click(bounds!.x + bounds!.width * .8, bounds!.y + bounds!.height * .5);
  await expect(progress).toHaveAttribute('aria-valuetext', new RegExp(`2 / ${total}`));
  await page.mouse.click(bounds!.x + bounds!.width * .2, bounds!.y + bounds!.height * .5);
  await expect(progress).toHaveAttribute('aria-valuetext', new RegExp(`1 / ${total}`));

  await page.keyboard.press('ArrowRight');
  await expect(progress).toHaveAttribute('aria-valuetext', new RegExp(`2 / ${total}`));
  await page.keyboard.press('Space');
  await expect(page.locator('.wrapped-shell')).toHaveClass(/is-paused/);
  await page.keyboard.press('Space');
  await expect(page.locator('.wrapped-shell')).not.toHaveClass(/is-paused/);

  for (let index = 2; index < total; index += 1) await page.keyboard.press('ArrowRight');
  await expect(progress).toHaveAttribute('aria-valuetext', new RegExp(`${total} / ${total}`));
  await expect(page.getByRole('button', { name: 'Paylaş' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yenidən bax' })).toBeVisible();
  await page.getByRole('button', { name: '1:1' }).click();
  await expect(progress).toHaveAttribute('aria-valuetext', new RegExp(`${total} / ${total}`));
  await page.locator('.wrapped-story__content').click();
  await expect(progress).toHaveAttribute('aria-valuetext', new RegExp(`${total} / ${total}`));
  await page.getByRole('button', { name: 'Əvvəlki' }).click();
  await expect(progress).toHaveAttribute('aria-valuetext', new RegExp(`${total - 1} / ${total}`));
  await page.keyboard.press('ArrowRight');
  await expect(progress).toHaveAttribute('aria-valuetext', new RegExp(`${total} / ${total}`));
  await page.getByRole('link', { name: 'Wrapped-dən çıx' }).click();
  await expect(page).toHaveURL(/\/teams\/caspian-wolves$/);
  await expect(page.locator('body')).not.toHaveClass(/wrapped-active/);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
});
