import {test,expect} from '../helpers/api-fixture-test';
test('profile surfaces, data layout, menu keys and responsive routes',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/teams/caspian-wolves');
 await expect(page.locator('.public-team-stats')).toBeVisible();
 const tops=await page.locator('.public-team-stats > div').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));
 expect(new Set(tops).size).toBe(1);
 const overview=await page.locator('#overview').boundingBox(),form=await page.locator('#form').boundingBox();
 expect(form!.x).toBeGreaterThan(overview!.x);
 for(const tile of await page.locator('.public-team-form > div').all()){
  expect(await tile.textContent()).toMatch(/^\d+$/);
  expect(await tile.evaluate(n=>getComputedStyle(n).borderTopWidth)).toBe('0px');
  expect((await tile.boundingBox())!.width).toBe(44);
 }
 await expect(page.getByRole('button',{name:/linki kopyala/i})).toHaveCount(0);
 const trigger=page.locator('.site-header .public-identity-trigger');await trigger.click();
 await expect(page.getByRole('menu')).toBeVisible();
 await page.keyboard.press('End');await expect(page.getByRole('menuitem',{name:'Çıxış'})).toBeFocused();
 await page.keyboard.press('Home');await expect(page.getByRole('menuitem',{name:'Komanda paneli'})).toBeFocused();
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await trigger.click();await page.locator('h1').click();await expect(page.getByRole('menu')).toHaveCount(0);
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['/teams/caspian-wolves','/tournaments','/matches','/account/profile','/team']){
   await page.goto(route);await expect(page.locator('main')).toBeVisible();
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 }
});
test('loading placeholders are square, borderless and static with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/api/public/teams/caspian-wolves',async route=>{await new Promise(r=>setTimeout(r,2000));await route.fallback();});
 await page.goto('/teams/caspian-wolves');
 await expect(page.locator('.loading-skeleton').first()).toBeVisible();
 const styles=await page.locator('.loading-skeleton__block,.loading-skeleton__panel').evaluateAll(nodes=>nodes.map(n=>{const s=getComputedStyle(n);return [s.borderRadius,s.borderTopWidth,s.animationName]}));
 expect(styles.length).toBeGreaterThan(0);for(const style of styles)expect(style).toEqual(['0px','0px','none']);
});
