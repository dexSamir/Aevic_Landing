import { test, expect } from '../helpers/api-fixture-test';
import { currentTeam } from '../fixtures/platform-data';

for(const width of [375,768,1024,1440]) test(`shared styles and responsive routes at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const paths=['/','/tournaments','/matches','/teams',`/teams/${currentTeam.slug}`,'/login','/register','/account/profile','/team','/team/roster','/team/history','/team/settings','/team/tournaments','/team/messages'];
 let tileStyle:unknown;
 for(const path of paths){
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.route-data-loading')).toHaveCount(0);
  if(['/teams',`/teams/${currentTeam.slug}`,'/team'].includes(path)) {
   const tile=page.locator('.recent-placement-tile').first();await expect(tile).toBeVisible();
   const style=await tile.evaluate(el=>{const s=getComputedStyle(el);return {width:s.width,height:s.height,radius:s.borderRadius,font:s.font,gap:getComputedStyle(el.parentElement!).gap,border:s.borderWidth};});
   if(tileStyle)expect(style).toEqual(tileStyle);else tileStyle=style;
   expect(await tile.textContent()).toMatch(/^\d+$|^—$/);
   await tile.focus();await expect(tile).toBeFocused();
   expect(await tile.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
 }
});
test('delayed verification never shows guest controls; skeletons are rounded and honor reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 let release!:()=>void;
 const blocked=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/me/session',async route=>{await blocked;await route.fulfill({status:401,json:{code:'UNAUTHORIZED'}});});
 await page.goto('/teams');
 const loading=page.getByRole('status',{name:'Sessiya yoxlanılır'});await expect(loading).toBeVisible();
 await expect(page.locator('header').getByRole('link',{name:'Daxil ol'})).toHaveCount(0);
 const block=loading.locator('.loading-skeleton__block').first();
 expect(await block.evaluate(el=>getComputedStyle(el).borderRadius)).not.toBe('0px');
 expect(await block.evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 release();await expect(page.locator('header').getByRole('link',{name:'Daxil ol'})).toBeVisible();
});
test('a transient public profile failure retries once without losing authenticated navigation',async({page})=>{
 let attempts=0;
 await page.route(`**/api/public/teams/${currentTeam.slug}`,async route=>{
  attempts++;
  if(attempts===1)await route.fulfill({status:503,json:{code:'SERVICE_UNAVAILABLE'}});
  else await route.fallback();
 });
 await page.goto(`/teams/${currentTeam.slug}`);
 await expect(page.getByRole('heading',{level:1,name:currentTeam.name})).toBeVisible();
 await expect(page.getByRole('button',{name:/hesab menyusu/})).toBeVisible();
 await expect(page.locator('header').getByRole('link',{name:'Daxil ol'})).toHaveCount(0);
 expect(attempts).toBe(2);
});
test('workspace loading uses the shared rounded, reduced-motion primitive',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 let release!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/me/context',async route=>{await pending;await route.fallback();});
 await page.goto('/team');
 const placeholder=page.locator('.workspace-placeholder.loading-skeleton__block').first();
 await expect(placeholder).toBeVisible();
 expect(await placeholder.evaluate(el=>getComputedStyle(el).borderRadius)).not.toBe('0px');
 expect(await placeholder.evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 release();await expect(page.locator('.team-overview')).toBeVisible();
});
