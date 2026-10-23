import { fixtureServices } from '../fixtures/component-services';
import { routeManifest } from '../../src/app/routeManifest';
import { test, expect } from '../helpers/api-fixture-test';

for (const width of [320,360,375,390,430,768,1024,1440]) {
 test(`navigation geometry and footer clearance ${width}`,async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const nav=page.getByRole('navigation',{name:'Mobil əsas naviqasiya'});
  if(width>=1024){await expect(nav).toBeHidden();await expect(page.locator('.site-header__desktop')).toBeVisible();return;}
  await expect(nav).toBeVisible();
  await expect(nav.locator(':scope > *')).toHaveCount(5);
  for(const el of await nav.locator(':scope > *').all()) {const box=await el.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('.cinematic-footer__bottom').scrollIntoViewIfNeeded();
  // Let the existing content-visibility footer resolve before reaching the true document end.
  await expect.poll(async()=>{
   await page.locator('.cinematic-footer__bottom').evaluate(el=>el.getBoundingClientRect().bottom);
   await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
   await page.clock.runFor(100);
   const footer=await page.locator('.cinematic-footer__bottom').boundingBox();const bar=await nav.boundingBox();
   return footer!.y+footer!.height <= bar!.y;
  }).toBe(true);
  if(width===390) await page.screenshot({path:'/tmp/aevic-mobile-footer.png'});
  if(width<=768)for(const el of await page.locator('.cinematic-footer__top > *').all())await expect(el).toHaveCSS('border-left-width','0px');
 });
}

test('profile disclosure supports touch, outside, Escape, focus and navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Mobil əsas naviqasiya'});const trigger=nav.getByRole('button');
 await expect(trigger).toContainText('Komandam');await trigger.click();
 const panel=page.getByRole('navigation',{name:'Hesab əməliyyatları'});await expect(panel).toBeVisible();
 await page.screenshot({path:'/tmp/aevic-mobile-profile.png'});
 expect((await panel.boundingBox())!.y+(await panel.boundingBox())!.height).toBeLessThan((await nav.boundingBox())!.y);
 await expect(panel.getByRole('link',{name:'Hesabım',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);await expect(trigger).toBeFocused();
 await trigger.click();await page.locator('.site-header .brand-mark').click();await expect(panel).toHaveCount(0);
 for(const [label,path] of [['Turnirlər','/tournaments'],['Komandalar','/teams'],['Matçlar','/matches'],['Ana səhifə','/']]){
  await nav.getByRole('link',{name:label,exact:true}).click();await expect(page).toHaveURL(new RegExp(path==='/'?'/$':`${path}$`));await expect(nav.getByRole('link',{name:label,exact:true})).toHaveAttribute('aria-current','page');
 }
 await trigger.click();await panel.getByRole('link',{name:'Komanda paneli',exact:true}).click();await expect(page).toHaveURL(/\/team$/);await expect(panel).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Naviqasiyanı aç'})).toBeVisible();
 await expect(page.locator('.mobile-nav__items > .is-active')).toHaveCount(1);
 await page.getByRole('navigation',{name:'Mobil əsas naviqasiya'}).getByRole('button').click();
 await page.getByRole('navigation',{name:'Hesab əməliyyatları'}).getByRole('button',{name:'Çıxış',exact:true}).click();
 await expect(page).toHaveURL(/\/$/);
 await nav.getByRole('button').click();await expect(panel.getByRole('link',{name:'Daxil ol'})).toBeVisible();await expect(panel.getByRole('link',{name:'Komanda paneli',exact:true})).toHaveCount(0);
});

test('compact dashboard retains values, destinations and keyboard carousel',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/team');
 const cards=page.locator('.intelligence-card');await expect(cards.first()).toBeVisible();
 await page.screenshot({path:'/tmp/aevic-mobile-dashboard.png'});
 await expect(cards.locator('p')).toHaveCount(0);expect(await cards.count()).toBeGreaterThanOrEqual(4);
 for(const card of await cards.all()){await expect(card.locator('strong')).not.toBeEmpty();await expect(card).toHaveAttribute('href',/^\//);await expect(card).toContainText('Ətraflı');}
 const colors=await cards.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundColor));expect(new Set(colors).size).toBeGreaterThanOrEqual(4);
 const rail=page.locator('.intelligence-rail');await rail.focus();await page.keyboard.press('End');await page.clock.runFor(500);expect(await rail.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await page.keyboard.press('Home');await page.clock.runFor(500);expect(await rail.evaluate(el=>el.scrollLeft)).toBeLessThanOrEqual(2);
});

test('no-team account remains usable',async({page})=>{
 await page.setViewportSize({width:360,height:740});
 await page.route('**/api/me/team',route=>route.fulfill({status:403,json:{code:'TEAM_WORKSPACE_REQUIRED'}}));
 await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Mobil əsas naviqasiya'});await expect(nav.getByRole('button')).toContainText('Hesab');await nav.getByRole('button').click();
 const panel=page.getByRole('navigation',{name:'Hesab əməliyyatları'});
 await expect(panel.getByRole('link',{name:'Hesabım'})).toBeVisible();await expect(panel.getByRole('link',{name:'Komanda yarat'})).toBeVisible();await expect(panel.getByRole('link',{name:'Komanda paneli',exact:true})).toHaveCount(0);
 await panel.getByRole('link',{name:'Hesabım'}).click();await expect(page).toHaveURL(/\/account\/profile$/);await expect(page.locator('.mobile-nav__items > .is-active')).toHaveCount(1);
});

test('shared footer stays clear across public and auth route families',async({page})=>{
 test.setTimeout(90000);
 const records=await fixtureServices.records.list(), matches=await fixtureServices.publicMatches.schedule(), organizations=await fixtureServices.organizations.list();
 const replacements:Record<string,string>={tournamentId:'daily-cup-24',teamSlug:'caspian-wolves',recordId:records[0].id,matchId:matches[0].id,organizationSlug:organizations[0].slug};
 const paths=routeManifest.filter(route=>['PUBLIC','AUTH','SYSTEM'].includes(route.family)&&!route.path.includes('/wrapped/')).map(route=>route.path==='*'?'/unknown-footer-test':route.path.replace(/:([A-Za-z]+)/g,(_,key)=>replacements[key]));
 await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});
 for(const path of paths){
  await page.goto(path);const footer=page.locator('.cinematic-footer__bottom');await expect(footer).toBeAttached();await footer.scrollIntoViewIfNeeded();
  await expect.poll(async()=>{await footer.evaluate(el=>el.getBoundingClientRect());await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.clock.runFor(100);const f=await footer.boundingBox(),n=await page.locator('.mobile-nav').count()?await page.locator('.mobile-nav').boundingBox():null;return f!.y+f!.height<=(n?.y ?? 813);}, {message:path}).toBe(true);
  for(const el of await page.locator('.cinematic-footer__top > *').all())await expect(el).toHaveCSS('border-left-width','0px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),path).toBeLessThanOrEqual(1);
 }
});

test('desktop nested radius and dedicated admin navigation',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');
 const capsule=page.locator('.site-header__desktop .public-nav-capsule');
 const radii=await capsule.evaluate(el=>({outer:parseFloat(getComputedStyle(el).borderRadius),padding:parseFloat(getComputedStyle(el).paddingLeft),inner:parseFloat(getComputedStyle(el.querySelector('a')!).borderRadius),indicator:parseFloat(getComputedStyle(el.querySelector('.public-nav-indicator')!).borderRadius)}));
 expect(radii.inner).toBe(radii.outer-radii.padding);expect(radii.indicator).toBe(radii.inner);
 await page.setViewportSize({width:390,height:844});await page.goto('/admin');await expect(page.locator('.product-shell--admin')).toBeVisible();await expect(page.locator('.mobile-nav')).toHaveCount(0);await page.getByRole('button',{name:'Naviqasiyanı aç'}).click();await expect(page.getByRole('dialog',{name:'Admin naviqasiyası'})).toBeVisible();
 await page.goto('/admin/login');await expect(page.locator('.mobile-nav')).toHaveCount(0);await expect(page.getByRole('button',{name:'Menyunu aç',exact:true})).toBeVisible();
});
