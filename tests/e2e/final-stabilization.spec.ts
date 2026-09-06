import { expect, test } from '@playwright/test';

test.describe('cold component style ownership', () => {
  test('public Support owns its layout and 44px search input on cold entry', async ({page}) => {
    await page.goto('/support');
    await expect(page.locator('.support-layout')).toHaveCSS('display','grid');
    await expect(page.locator('.support-search')).toHaveCSS('display','flex');
    expect(await page.getByRole('textbox',{name:'Dəstək mövzularında axtar'}).evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await page.getByRole('textbox',{name:'Dəstək mövzularında axtar'}).fill('PUBG');
    await expect(page.locator('.faq-list details')).toHaveCount(1);
  });
  test('system-state pages import their own layout on a cold request', async ({page}) => {
    await page.goto('/500');
    await expect(page.locator('.system-state')).toHaveCSS('display','grid');
    await expect(page.locator('.system-state > div')).toHaveCSS('display','flex');
    expect(await page.locator('.system-state h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThan(24);
  });
  test('Home calendar is independently styled at eight widths and 200% text', async ({ browser },testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome','Explicit matrix is run once');
    test.setTimeout(90000);
    for(const width of [320,360,390,412,768,1024,1440,1920]) for(const scale of [1,2]) {
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      const page=await context.newPage(); await page.goto('http://127.0.0.1:4173/');
      const calendar=page.locator('.tournament-calendar'); await expect(calendar).toBeVisible();
      await page.evaluate(scale=>{document.documentElement.style.fontSize=`${scale*100}%`;},scale);
      await expect(calendar).toHaveCSS('display','grid');
      const metrics=await calendar.evaluate(element=>({overflow:document.documentElement.scrollWidth-innerWidth,columns:getComputedStyle(element).gridTemplateColumns,buttons:[...element.querySelectorAll('button')].filter(x=>x.getClientRects().length).map(x=>({label:x.getAttribute('aria-label'),width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})),selected:[...element.querySelectorAll('[aria-pressed="true"]')].filter(x=>x.getClientRects().length).map(x=>({background:getComputedStyle(x).backgroundColor,color:getComputedStyle(x).color,tabindex:x.getAttribute('tabindex')}))}));
      expect(metrics.overflow,`${width} at ${scale}x`).toBeLessThanOrEqual(1);
      expect(metrics.buttons.filter(x=>x.width<43.9||x.height<43.9),`${width} targets`).toEqual([]);
      expect(metrics.selected).toHaveLength(1); expect(metrics.selected[0].tabindex).toBe('0');
      expect(metrics.selected[0].background).not.toBe('rgba(0, 0, 0, 0)');
      const clipped=await calendar.evaluate(root=>{const bounds=root.getBoundingClientRect();return [...root.querySelectorAll('button,dt,dd,h3,.calendar-team-state,.calendar-authority-note')].filter(e=>e.getClientRects().length).flatMap(e=>{const r=e.getBoundingClientRect();return r.right>bounds.right+1||r.left<bounds.left-1?[e.textContent]:[];});});
      expect(clipped,`${width} at ${scale}x internal clipping`).toEqual([]);
      const selected=calendar.locator('[data-calendar-date][aria-pressed="true"]:visible');
      const previous=await selected.getAttribute('data-calendar-date'); await selected.focus(); await page.keyboard.press('ArrowRight');
      await expect(selected).toBeFocused(); expect(await selected.getAttribute('data-calendar-date')).not.toBe(previous);
      await expect(calendar.locator('.tournament-calendar__empty')).toBeVisible();
      await page.keyboard.press('Space'); await expect(selected).toBeFocused();
      await calendar.getByRole('button',{name:'Növbəti ay'}).focus(); await page.keyboard.press('Enter');
      await expect(calendar.locator('.tournament-calendar__agenda time')).toContainText('sentyabr');
      await context.close();
    }
  });
  test('Calendar, Tabs, FileUpload, PublicNavbar, EmptyState and both workspace navs render without route CSS', async ({page}) => {
    await page.goto('/tests/fixtures/style-ownership.html');
    await expect(page.locator('.tournament-calendar')).toHaveCSS('display','grid');
    await expect(page.locator('.tabs')).toHaveCSS('display','flex');
    await expect(page.locator('.file-upload')).toHaveCSS('display','flex');
    await expect(page.locator('.empty-state')).toHaveCSS('display','grid');
    expect(await page.locator('.site-header').evaluate(e=>getComputedStyle(e).position)).toMatch(/^(sticky|fixed)$/);
    for(const label of ['Komanda naviqasiyası','Admin naviqasiyası']) await expect(page.getByRole('navigation',{name:label})).toHaveCSS('display','grid');
    expect(await page.evaluate(()=>[...document.querySelectorAll('style')].map(x=>x.getAttribute('data-vite-dev-id')).filter(Boolean))).not.toContain(expect.stringContaining('/public-pages.css'));
    const tab=page.getByRole('tab',{name:'İcmal',exact:true}); await tab.focus(); await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab',{name:'Yarış təqvimi'})).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  });
});
