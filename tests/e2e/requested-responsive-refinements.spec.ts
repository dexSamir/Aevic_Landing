import {test, expect} from '../helpers/api-fixture-test';

test.use({screenshot:'off',trace:'off',video:'off'});
test('requested responsive compositions across public routes', async({page})=>{
 test.setTimeout(180000);
 for(const width of [320,360,375,390,414,430,480,768,1024,1440]){
  await page.setViewportSize({width,height:844});
  for(const route of ['/','/teams','/tournaments','/matches','/login','/register']){
   await page.goto(route);
   await expect(page.locator('main')).toBeVisible();
   await page.evaluate(()=>document.fonts.ready);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`${route} at ${width}`).toBeLessThanOrEqual(1);
   const footer=page.locator('.cinematic-footer');
   if(await footer.count()){
    await footer.scrollIntoViewIfNeeded();
    if(width<=768){
     expect(await footer.locator('.cinematic-footer__information').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(2);
     const links=await footer.locator('.cinematic-footer__information').boundingBox(),mark=await footer.locator('.cinematic-footer__wordmark').boundingBox();
     expect(mark!.y).toBeGreaterThanOrEqual(links!.y+links!.height);
    }
   }
   if(route==='/teams'){
    await expect(page.locator('.team-directory-card').first()).toBeVisible();
    if(width<=600)expect(await page.locator('.team-directory-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(2);
    expect(await page.locator('.team-directory-card').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1))).toBe(true);
   }
   if(route==='/tournaments'&&width<=767){
    await expect(page.locator('.tournament-row--discovery').first()).toBeVisible();
    await expect(page.locator('.tournament-row--discovery .tournament-row__thumbnail').first()).toBeVisible();
    expect(await page.locator('.tournament-row--discovery').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1))).toBe(true);
   }
   if(route==='/'&&width>=1024){
    const cards=page.locator('.home-rotation .map-program > ol');
    const right=await cards.evaluate(e=>({cards:e.getBoundingClientRect().right,parent:e.parentElement!.getBoundingClientRect().right}));
    expect(Math.abs(right.cards-right.parent)).toBeLessThanOrEqual(1);
   }
   if(width>=1024)await expect(page.locator('.site-header')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  }
 }
});

test('directory and discovery search, filtering and compact content remain usable',async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await page.goto('/teams');
 const cards=page.locator('.team-directory-card');await expect(cards.first()).toBeVisible();
 const count=await cards.count();
 await page.getByRole('textbox',{name:'Komanda adı ilə axtar'}).fill('no-matching-team-xyz');
 await expect(cards).toHaveCount(0);
 await page.getByRole('textbox',{name:'Komanda adı ilə axtar'}).fill('');
 await expect(cards).toHaveCount(count);
 await page.getByRole('combobox',{name:'Sırala',exact:true}).selectOption('name');
 await expect(cards).toHaveCount(count);
 await cards.first().locator('.team-logo-tile__label strong').evaluate(e=>e.textContent='Uzun komanda adı — Azərbaycan Esports Çempionları');
 expect(await cards.first().evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await cards.first().locator('.directory-profile-link').click();await expect(page).toHaveURL(/\/teams\/.+/);
 await page.goto('/tournaments');
 const search=page.locator('.planning-search input');await search.fill('no-matching-tournament-xyz');
 await expect(page.locator('.tournament-row--discovery')).toHaveCount(0);await search.fill('');
 await expect(page.locator('.tournament-row--discovery').first()).toBeVisible();
 const filters=page.locator('.planning-filters button');
 for(let i=0;i<await filters.count();i++){await filters.nth(i).click();await expect(filters.nth(i)).toHaveAttribute('aria-pressed','true');}
 await filters.first().click();
 await page.locator('.tournament-row--discovery .tournament-row__arrow').first().click();await expect(page).toHaveURL(/\/tournaments\/.+/);
});

test('Google controls have no divider and mobile navigation stays operable',async({page})=>{
 await page.route('**/api/auth/google/status',route=>route.fulfill({json:{enabled:true}}));
 for(const path of ['/login','/register']){
  await page.goto(path);
  await expect(page.getByRole('button',{name:'Google ilə davam et'})).toBeVisible();
  await expect(page.locator('.google-auth')).toHaveCSS('border-bottom-width','0px');
 }
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:'Menyunu aç'}).click();
 await expect(page.locator('#public-mobile-menu')).toBeVisible();
 await page.locator('#public-mobile-menu .public-nav-capsule a[href="/teams"]').click();
 await expect(page).toHaveURL(/\/teams$/);
});
