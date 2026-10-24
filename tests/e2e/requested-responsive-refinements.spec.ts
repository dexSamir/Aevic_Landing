import { fixtureServices } from '../fixtures/component-services';
import { currentTeam, leaderboard, matchHistory } from '../fixtures/platform-data';
import { deriveTeamForm } from '../../src/utils/competitionAnalytics';
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

test('directory filtering and discovery search and compact content remain usable',async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await page.goto('/teams');
 const cards=page.locator('.team-directory-card');await expect(cards.first()).toBeVisible();
 const count=await cards.count();
 await expect(page.getByRole('textbox',{name:'Komanda adı ilə axtar'})).toHaveCount(0);
 await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('approved');
 await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('all');
 await expect(cards).toHaveCount(count);
 await page.getByRole('combobox',{name:'Sırala',exact:true}).selectOption('name');
 await expect(cards).toHaveCount(count);
 await cards.first().locator('.team-logo-tile__label strong').evaluate(e=>e.textContent='Uzun komanda adı — Azərbaycan Esports Çempionları');
 expect(await cards.first().evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await cards.first().locator('.team-logo-tile__destination').click();await expect(page).toHaveURL(/\/teams\/.+/);
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

test('targeted mobile surfaces, carousel controls and result options', async ({page}) => {
 test.setTimeout(180000);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/api/public/context', async route => {
  const snapshot = await fixtureServices.snapshots.public();
  await route.fulfill({json:{...snapshot,teams:snapshot.teams.map(team=>({...team,form:deriveTeamForm(matchHistory)}))}});
 });
 await page.route('**/api/team/tournaments/summer-final-25/result-export', route=>route.fulfill({json:{teamId:currentTeam.id,result:leaderboard.find(row=>row.teamId===currentTeam.id&&row.tournamentId==='summer-final-25')}}));
 const measurements = [];
 for (const [width,height] of [[320,568],[360,740],[375,714],[390,844],[430,932],[768,1024],[1024,768],[1440,900]]) {
  await page.setViewportSize({width,height});
  await page.goto('/');
  await expect(page.locator('.home-ranked-team').first()).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  const rail = page.locator('.home-competition-rail').first();
  await expect(rail).toHaveCSS('border-top-width', '0px');
  if(width > 800) await expect(rail).toHaveCSS('backdrop-filter','none');
  const heading = await page.locator('.home-teams-section h2').boundingBox();
  const controls = await page.locator('.home-team-controls').boundingBox();
  if(width <= 800) expect(Math.abs(heading!.y+heading!.height/2-controls!.y-controls!.height/2)).toBeLessThan(2);
  const maps=page.locator('.home-rotation .map-program > ol');
  await expect(maps.locator(':scope > li')).toHaveCount(4);
  if(width <= 768) {
   await expect(maps).toHaveCSS('scroll-snap-type','x mandatory');
   const frame = await page.locator('.home-rotation .map-program__frame').first().boundingBox();
   const previousWidth = Math.min(width * .78, 320);
   expect(frame!.width / previousWidth).toBeLessThan(.95);
   expect(frame!.width / previousWidth).toBeGreaterThan(.9);
   await maps.evaluate(e=>e.scrollTo({left:e.scrollWidth,behavior:'instant'}));
   expect(await maps.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
  }
  await page.getByRole('button',{name:'Növbəti komandalar'}).click();
  await page.clock.runFor(1000);
  await expect.poll(()=>page.locator('.home-team-stage').evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Əvvəlki komandalar'}).click();
  await page.clock.runFor(1000);
  for(const route of ['/teams','/tournaments/summer-final-25']) {
   await page.goto(route);
   if(route==='/teams') {
    await expect(page.locator('.recent-placement-tile').first()).toBeVisible();
    const values=await page.locator('.team-directory-card').evaluateAll(cards=>cards.map(card=>{
     const tiles=[...card.querySelectorAll<HTMLElement>('.recent-placement-tile')];
     return {fits:card.scrollWidth<=card.clientWidth+1 && tiles.every(t=>t.getBoundingClientRect().right<=card.getBoundingClientRect().right),size:tiles[0]?.getBoundingClientRect().width,font:tiles[0]&&getComputedStyle(tiles[0]).fontSize};
    }));
    expect(values.every(v=>v.fits)).toBe(true);
    const measured=values.find(v=>v.size)!;
    if(width<=800) {
     expect(measured.size!).toBeGreaterThan(Math.max(20,Math.min(width*.05,32)));
     expect(parseFloat(measured.font!)).toBeLessThanOrEqual(21);
    }
    if(width<=430) expect(await page.locator('.team-directory-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(2);
    measurements.push({width,...measured});
   } else {
    await page.getByRole('button',{name:'Nəticələri yüklə'}).click();
    const dialog=page.getByRole('dialog');
    await expect(dialog.getByRole('radio')).toHaveCount(2);
    await expect(dialog.getByRole('radio',{name:'Komanda nəticəsi'})).toBeEnabled();
    await page.clock.runFor(500);
    const boxes=await dialog.getByRole('radio').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
    expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(1);
    if(width<=800)expect(boxes.every(b=>b.width>b.height)).toBe(true);
    expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    await dialog.getByRole('radio',{name:'Turnir cədvəli'}).focus();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('radio',{name:'Komanda nəticəsi'})).toHaveAttribute('aria-checked','true');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
 }
 console.log('Placement dimensions',JSON.stringify(measurements));
});
