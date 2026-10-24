import { test, expect } from '../helpers/api-fixture-test';

test.use({ screenshot: 'off', trace: 'off', video: 'off' });
const widths = [320, 360, 375, 390, 430, 768, 1024, 1440];

test('compact directory preserves two columns, filters, comparison and public search removal', async ({ page }) => {
  const sessionRequests: string[] = [];
  page.on('request', request => { if(new URL(request.url()).pathname === '/api/me/session') sessionRequests.push(request.url()); });
  await page.goto('/teams');
  const cards = page.locator('.team-directory-card');
  await expect(cards.first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(sessionRequests).toHaveLength(1);
  await expect(page.locator('a[href="/search"], .teams-directory__search, .global-search-trigger')).toHaveCount(0);
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const boxes = await cards.evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x:r.x, y:r.y, height:r.height, overflow:node.scrollWidth > node.clientWidth+1 }; }));
    expect(boxes.some(box => box.overflow)).toBe(false);
    if (width < 1024) {
      expect(boxes[0].y).toBe(boxes[1].y);
      expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
      expect(Math.max(...boxes.map(box => box.height))).toBeLessThan(310);
    }
  }
  await page.setViewportSize({width:375,height:714});
  await expect(cards.locator('details')).toHaveCount(0);
  await page.getByRole('combobox', {name:'Sırala',exact:true}).selectOption('name');
  const names = await cards.locator('.team-logo-tile__label strong').allTextContents();
  expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b,'az')));
  await page.getByRole('combobox', {name:'Status',exact:true}).selectOption('pending');
  await page.getByRole('combobox', {name:'Status',exact:true}).selectOption('all');
  await expect(cards).toHaveCount(names.length);
  await page.getByRole('button',{name:'Müqayisə et',exact:true}).click();
  await cards.nth(0).getByRole('checkbox').check();
  await cards.nth(1).getByRole('checkbox').check();
  await expect(page.getByRole('status',{name:'Müqayisə seçimi'})).toContainText('2 / 2');
});

test('team detail retains swipe, compact real results and desktop metrics', async ({page}) => {
  await page.goto('/teams/caspian-wolves');
  const rows = page.locator('.public-match-history > li');
  await expect(rows.first()).toBeVisible();
  const original = await rows.locator('.public-match-identity strong').allTextContents();
  for(const width of widths) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width <= 760) {
      expect(await rows.evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height<100))).toBe(true);
      await expect(rows.first().locator('.public-match-rounds')).toBeVisible();
      await expect(rows.first().locator('.public-match-points')).toBeHidden();
    } else if(width>=1024) await expect(rows.first().locator('.public-match-points')).toBeVisible();
  }
  await page.setViewportSize({width:320,height:568});
  const roster = page.locator('.public-team-roster');
  expect(await roster.evaluate(el=>getComputedStyle(el).scrollbarWidth)).toBe('none');
  await roster.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(()=>roster.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  await expect(page.locator('#form details, #matches details')).toHaveCount(0);
  expect(await rows.locator('.public-match-identity strong').allTextContents()).toEqual(original);
  for(const img of await rows.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  }
});

test('homepage native carousel, integrated promo, glass and bottom-nav history', async ({page}) => {
  await page.route('**/api/me/session', route=>route.fulfill({status:401,json:{code:'UNAUTHENTICATED'}}));
  await page.goto('/');
  const maps = page.locator('.home-rotation .map-program > ol');
  const promo = page.locator('.home-brand-statement');
  await expect(promo).toBeAttached();
  for(const width of widths) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width<=768) {
      expect(await maps.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
      expect(await promo.locator('.media-backdrop').evaluate(el=>getComputedStyle(el).position)).toBe('absolute');
      expect(await promo.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(530);
    }
  }
  await page.setViewportSize({width:390,height:714});
  await maps.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(()=>maps.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  expect(await page.locator('.home-competition-rail').evaluate(el=>getComputedStyle(el).backdropFilter)).toContain('blur(8px)');
  const nav=page.getByRole('navigation',{name:'Mobil əsas naviqasiya'});
  for(const label of ['Komandalar','Turnirlər','Matçlar','Ana səhifə']) {
    await page.evaluate(()=>window.scrollTo({top:700,behavior:'instant'}));
    await nav.getByRole('link',{name:label,exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  }
  await page.evaluate(()=>window.scrollTo({top:650,behavior:'instant'}));
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(650);
  await nav.getByRole('link',{name:'Ana səhifə',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await page.evaluate(()=>window.scrollTo({top:600,behavior:'instant'}));
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(600);
  await nav.getByRole('link',{name:'Komandalar',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await page.goBack();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(600);
  await page.goForward();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
});
