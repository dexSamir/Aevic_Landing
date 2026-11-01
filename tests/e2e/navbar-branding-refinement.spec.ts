import { test, expect } from '../helpers/api-fixture-test';

test('transparent underlines switch exclusively to matching filled items', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chrome');
  await page.goto('/');
  const header = page.locator('.site-header');
  const active = page.locator('.site-header .public-nav-capsule a[aria-current]');
  const right = page.locator('.site-header .public-rules-link');
  const pseudo = () => active.evaluate(el => getComputedStyle(el, '::after').content);
  await expect(active).toBeVisible();
  await expect(header).toHaveAttribute('data-public-header-state', 'hero-top');
  await expect(active).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect(await pseudo()).not.toBe('none');
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(header).toHaveAttribute('data-public-header-state', 'scrolled');
  await expect(active).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect(await pseudo()).toBe('none');
  await right.hover();
  await expect(right).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect(await right.evaluate(el => getComputedStyle(el, '::after').content)).toBe('none');
  await right.focus();
  expect(await right.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.screenshot({path:'work/branding-refinement/nav-scrolled.png'});
  await page.locator('.cinematic-footer').scrollIntoViewIfNeeded();
  await expect(header).toHaveAttribute('data-public-header-state', 'hero-top');
  await expect(active).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect(await pseudo()).not.toBe('none');
  await page.goto('/privacy');
  await expect(header).toHaveAttribute('data-public-header-state', 'hero-top');
  await page.reload();
  await expect(page.getByRole('heading', {name:'Məxfilik siyasəti',exact:true})).toBeVisible();
  await page.goBack();
  await expect(header).toHaveAttribute('data-public-header-state', 'hero-top');
});

test('hero framing and public policy pages at target widths', async ({ page }, info) => {
  for (const width of info.project.name === 'desktop-chrome' ? [1920,1440,1280,768] : [390,320]) {
    await page.setViewportSize({width,height:width >= 1280 ? 800 : 900});
    await page.goto('/');
    await expect(page.locator('.home-live-hero h1')).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; await (document.querySelector('.home-live-hero img') as HTMLImageElement).decode(); });
    const img = page.locator('.home-live-hero img');
    await expect(img).toHaveCSS('object-position', width <= 640 ? '63% 0%' : '55% 0%');
    await expect(img).toHaveAttribute('fetchpriority','high');
    await expect(img).toHaveAttribute('loading','eager');
    await expect(page.locator('.home-live-hero h1')).toHaveCSS('font-family',/Oswald/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`work/branding-refinement/hero-${width}.png`});
    if(width < 1024) {
      await expect(page.locator('.mobile-nav')).toBeVisible();
      const account = page.locator('.mobile-nav__items button');
      await account.click();
      await expect(account).toHaveAttribute('aria-expanded','true');
      await expect(page.locator('.mobile-profile-panel')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(account).toHaveAttribute('aria-expanded','false');
    }
  }
  await page.route('**/api/me/session',route=>route.fulfill({contentType:'application/json',body:'null'}));
  for(const path of ['/privacy','/terms']) {
    await page.goto(path);
    await expect(page.locator('.information-page h1')).toBeVisible();
    expect(await page.locator('.information-page').innerText()).not.toContain('Hesab girişi və qeydiyyat Supabase Auth');
    await expect(page.locator('.information-page a[href="mailto:aevicesports@gmail.com"]').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`work/branding-refinement/${path.slice(1)}-${info.project.name}.png`,fullPage:true});
  }
});
