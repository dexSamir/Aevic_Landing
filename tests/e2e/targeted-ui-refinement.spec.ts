import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];

async function documentOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe('targeted UI refinement', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'The explicit viewport matrix runs once.');
  });

  test('navbar moves from a transparent hero state to dark glass with a solid reduced-transparency fallback', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    for (const viewport of viewports.slice(0, 3)) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.locator('.site-header .public-nav-capsule')).toBeVisible();
      await expect(page.locator('.site-header .public-nav-capsule a.active')).toHaveText('Ana səhifə');
      expect(await documentOverflow(page), `${viewport.width}×${viewport.height} navbar overflow`).toBeLessThanOrEqual(1);
    }

    await page.setViewportSize(viewports[0]);
    await page.goto('/');

    const nav = page.locator('.site-header .public-nav-capsule');
    const indicator = nav.locator('.public-nav-indicator');
    const rules = page.locator('.site-header .public-rules-link');
    const account = page.locator('.site-header .public-identity-trigger');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a.active')).toHaveText('Ana səhifə');
    await expect(rules).toBeVisible();
    await expect(rules).toHaveAttribute('href', '/regulations');
    expect(await rules.evaluate(e => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await expect(account).toBeVisible();

    const topMaterial = await nav.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      backdrop: getComputedStyle(element).backdropFilter,
      shadow: getComputedStyle(element).boxShadow,
      indicatorOpacity: getComputedStyle(element.querySelector('.public-nav-indicator')!).opacity,
    }));
    expect(topMaterial.background).toBe('rgba(0, 0, 0, 0)');
    expect(topMaterial.backdrop).toBe('none');
    expect(topMaterial.shadow).toBe('none');
    expect(topMaterial.indicatorOpacity).toBe('0');

    await page.locator('.home-calendar-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.site-header')).toHaveAttribute('data-public-header-state', 'scrolled');

    const material = await nav.evaluate((element) => {
      const styles = getComputedStyle(element);
      const active = getComputedStyle(element.querySelector('.public-nav-indicator')!);
      const controls = [...document.querySelectorAll('.site-header .public-identity-trigger')].map((control) => {
        const controlStyles = getComputedStyle(control);
        return { border: controlStyles.borderTopWidth, backdrop: controlStyles.backdropFilter, background: controlStyles.backgroundColor };
      });
      return {
        background: styles.backgroundColor,
        border: styles.borderTopWidth,
        backdrop: styles.backdropFilter,
        shadow: styles.boxShadow,
        activeBackground: active.backgroundColor,
        controls,
      };
    });
    expect(material.border).toBe('0px');
    expect(material.backdrop).toContain('blur(16px)');
    expect(material.backdrop).toContain('saturate(1.08)');
    expect(material.background).toMatch(/rgba\(.+, 0\.78\)/);
    expect(material.shadow).not.toBe('none');
    expect(material.activeBackground).not.toBe(material.background);
    expect(material.controls.every((control) => control.border === '0px' && control.backdrop.includes('blur(16px)'))).toBe(true);

    await nav.getByRole('link', { name: 'Turnirlər' }).focus();
    const focus = await nav.getByRole('link', { name: 'Turnirlər' }).evaluate((element) => ({
      outline: getComputedStyle(element).outlineStyle,
      width: getComputedStyle(element).outlineWidth,
    }));
    expect(focus.outline).toBe('solid');
    expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reducedMotionDuration = await indicator.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration));
    expect(reducedMotionDuration).toBeLessThanOrEqual(0.00001);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
    });
    await page.reload();
    await page.locator('.home-calendar-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.site-header')).toHaveAttribute('data-public-header-state', 'scrolled');
    const fallback = await page.locator('.site-header .public-nav-capsule').evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      backdrop: getComputedStyle(element).backdropFilter,
    }));
    expect(fallback.background).toBe('rgb(36, 35, 41)');
    expect(fallback.backdrop).toBe('none');
    expect(errors).toEqual([]);
  });

  test('Start xətti is a compact five-part readiness rail with intentional actions', async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/team?scenario=room-ready');
      const rail = page.locator('.team-readiness-ledger');
      await rail.scrollIntoViewIfNeeded();
      await expect(rail).toBeVisible();
      await expect(rail.locator(':scope > ul > li')).toHaveCount(5);
      await expect(rail.locator(':scope > header > nav a')).toHaveText(['Heyəti idarə et', 'Nəticə tarixçəsi', 'Kapitan mesajları']);
      await expect(rail.locator('li.is-next')).toContainText('Növbəti əməliyyat');
      await expect(rail).toContainText('Məlumatlar hazırdır');

      const bounds = await rail.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.height, `${viewport.width}×${viewport.height} readiness height`).toBeLessThanOrEqual(viewport.width <= 430 ? 330 : 160);
      expect(await documentOverflow(page), `${viewport.width}×${viewport.height} readiness overflow`).toBeLessThanOrEqual(1);
    }
    expect(errors).toEqual([]);
  });

  test('Share Studio reaches the selector and workspace in the first viewport', async ({ page }) => {
    test.setTimeout(90_000);
    // Force the base sheet to arrive last: family overrides must not depend on network timing.
    await page.route('**/src/styles/workspace.css', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.continue();
    });
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/team/sharecards');
      const header = page.locator('.share-studio-header');
      const selector = page.locator('.asset-type-selector');
      const workspace = page.locator('.share-studio-panel');
      await expect(header).toBeVisible();
      await expect(header.getByRole('heading', { level: 1 })).toHaveText('Paylaşım növünü seçin');
      await expect(selector.getByRole('radio')).toHaveCount(3);
      await expect(workspace).toBeVisible();
      await expect(page.locator('.profile-card-studio')).toBeVisible();

      const geometry = await page.evaluate(() => {
        const header = document.querySelector('.share-studio-header')!.getBoundingClientRect();
        const selector = document.querySelector('.asset-type-selector')!.getBoundingClientRect();
        const workspace = document.querySelector('.share-studio-panel')!.getBoundingClientRect();
        const preview = document.querySelector('.profile-card-studio')?.getBoundingClientRect();
        return { headerHeight: header.height, selectorBottom: selector.bottom, workspaceTop: workspace.top, previewTop: preview?.top ?? Number.POSITIVE_INFINITY };
      });
      expect(geometry.headerHeight, `${viewport.width}×${viewport.height} header height`).toBeLessThanOrEqual(viewport.width <= 430 ? 92 : 104);
      expect(geometry.workspaceTop).toBeLessThan(viewport.height);
      expect(geometry.previewTop).toBeLessThan(viewport.height);
      expect(geometry.workspaceTop - geometry.selectorBottom).toBeLessThanOrEqual(16);
      expect(await documentOverflow(page), `${viewport.width}×${viewport.height} studio overflow`).toBeLessThanOrEqual(1);
    }
    expect(errors).toEqual([]);
  });

  test('mobile navigation preserves active containment without an accent edge', async ({ page }) => {
    await page.setViewportSize(viewports[3]);
    await page.goto('/tournaments');
    await page.getByRole('button', { name: 'Menyunu aç' }).click();
    const active = page.locator('.drawer .public-nav-capsule a.active');
    await expect(active).toHaveText('Turnirlər');
    const styles = await active.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      shadow: getComputedStyle(element).boxShadow,
      border: getComputedStyle(element).borderLeftWidth,
    }));
    expect(styles.background).toBe('rgba(8, 8, 10, 0.9)');
    expect(styles.shadow).not.toContain('243, 196, 80');
    expect(styles.border).toBe('0px');
    expect(await documentOverflow(page)).toBeLessThanOrEqual(1);
  });
});
