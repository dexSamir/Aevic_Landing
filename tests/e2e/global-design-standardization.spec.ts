import { test, expect } from '../helpers/api-fixture-test';
import { currentTeam } from '../fixtures/platform-data';

const widths = [320,360,375,390,430,768,1024,1280,1440,1920];
test('public grid and Inter align across routes and breakpoints', async ({page}) => {
 test.setTimeout(240000);
 await page.route('**/api/me/session', r=>r.fulfill({contentType:'application/json',body:'null'}));
 for (const width of widths) {
  await page.setViewportSize({width,height:900});
  let referenceEdges: number[] = [];
  for (const route of ['/','/tournaments','/teams',`/teams/${currentTeam.slug}`,'/tournaments/summer-final-25','/matches','/matches/summer-final-r4','/regulations','/login','/register','/forgot-password','/reset-password']) {
   await page.goto(route); await expect(page.locator('.site-header__inner')).toBeAttached(); await expect(page.locator('main h1').first()).toBeVisible();
   await page.evaluate(()=>document.fonts.ready);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`${route} ${width}`).toBeLessThanOrEqual(1);
   const result=await page.evaluate(()=>{
    const edge=(e:Element)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return [r.left+parseFloat(s.paddingLeft),r.right-parseFloat(s.paddingRight)];};
    const header=document.querySelector('.site-header__inner')!;
    return {font:getComputedStyle(document.body).fontFamily,loaded:document.fonts.check('500 16px Inter','Əəİışçğ'),header:edge(header),containers:[...document.querySelectorAll('main .container, .tournament-detail-width')].filter(e=>e.getBoundingClientRect().width>0).map(edge)};
   });
   if(route==='/') referenceEdges=result.header;
   result.header=referenceEdges;
   expect(result.font).toContain('Inter');expect(result.loaded).toBe(true);
   for(const edges of result.containers)expect(edges.map((v,i)=>Math.abs(v-result.header[i])).every(v=>v<2),`${route} ${width}: ${edges} vs ${result.header}`).toBe(true);
   const footer=page.locator('.cinematic-footer__scene');
   if(await footer.count()) { await footer.scrollIntoViewIfNeeded(); const edges=await footer.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return [r.left+parseFloat(s.paddingLeft),r.right-parseFloat(s.paddingRight)];});expect(edges).toEqual(result.header); }
  }
 }
});

test('MFA focus, paste, recovery and viewport centering',async({page,context})=>{
 await page.route('**/api/me/session',r=>r.fulfill({contentType:'application/json',body:'null'}));
 await page.route('**/api/auth/google/status',r=>r.fulfill({json:{enabled:true}}));
 await page.route('**/api/auth/google/continuation',r=>r.fulfill({json:{mode:'login',email:'test@example.test'}}));
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,568],[1280,500],[640,450]]){
  await page.setViewportSize({width,height}); await page.goto('/login?google=continue&mfa=required');
  const input=page.getByRole('textbox',{name:'Authenticator kodu'});await expect(input).toBeVisible();await input.focus();
  const slot=page.locator('.otp-slots span[data-active=true]');
  expect(await slot.evaluate(e=>getComputedStyle(e).boxShadow)).toBe('none');
  expect(await slot.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('solid');
  await input.fill('123456');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Backspace');await expect(input).toHaveValue('12346');
  await page.getByRole('button',{name:'Bərpa kodundan istifadə et'}).click();await expect(page.getByLabel('Bərpa kodu')).toHaveValue('');
  await page.getByRole('button',{name:'Authenticator koduna qayıt'}).click();await expect(input).toHaveValue('');
  await expect(page.getByLabel('Bu cihazda məni xatırla (30 gün)')).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  if(width===1440){const bounds=await page.locator('.google-auth > form').boundingBox();const main=await page.locator('main').evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {top:r.top+parseFloat(s.paddingTop),bottom:r.bottom-parseFloat(s.paddingBottom)};});expect(Math.abs(bounds!.y+bounds!.height/2-(main.top+main.bottom)/2)).toBeLessThan(3);await page.screenshot({path:'/tmp/aevic-mfa-desktop.png'});}
  if(width===390){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/aevic-mfa-mobile.png'});}
 }
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.evaluate(()=>navigator.clipboard.writeText('654321'));await page.getByRole('textbox',{name:'Authenticator kodu'}).focus();await page.keyboard.press(process.platform==='darwin'?'Meta+V':'Control+V');await expect(page.getByRole('textbox',{name:'Authenticator kodu'})).toHaveValue('654321');
});

test('dashboard groups share graphite and keep readable responsive statistics',async({page})=>{
 for(const width of widths){await page.setViewportSize({width,height:1000});await page.goto('/team');await expect(page.locator('.intelligence-card').first()).toBeVisible();await expect(page.locator('.insight-metrics > div').first()).toBeVisible();
 const colors=await page.locator('.intelligence-card,.insight-metrics > div').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).backgroundColor));expect(new Set(colors).size).toBe(1);expect(colors[0]).toBe('rgb(22, 23, 27)');
 const cards=await page.locator('.team-stat-ledger > div').evaluateAll(nodes=>nodes.map(e=>({height:e.getBoundingClientRect().height,overflow:e.scrollWidth>e.clientWidth+1})));expect(cards).toHaveLength(5);expect(cards.every(c=>!c.overflow)).toBe(true);expect(new Set(cards.map(c=>c.height)).size).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 if(width===1440)await page.screenshot({path:'/tmp/aevic-dashboard-desktop.png'});
 }
});

test('navigation uses one scrolled material without geometry changes',async({page})=>{
 await page.route('**/api/me/session',r=>r.fulfill({contentType:'application/json',body:'null'}));
 await page.setViewportSize({width:1440,height:900});
 for(const route of ['/','/tournaments','/teams','/matches','/matches/summer-final-r4','/regulations','/login']){
  await page.goto(route);const header=page.locator('.site-header');await expect(page.locator('.nav-login')).toBeVisible(); await expect(page.locator('main h1').first()).toBeVisible();
  const before=await header.boundingBox();
  for(const selector of ['.public-nav-capsule','.nav-login','.public-rules-link'])expect(await page.locator('.site-header '+selector).evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await page.evaluate(()=>scrollTo({top:80,behavior:'instant'}));await page.clock.runFor(350);const footerVisible=await page.locator('.cinematic-footer').evaluate(e=>e.getBoundingClientRect().top<innerHeight-24);
  if(!footerVisible){await expect(header).toHaveClass(/site-header--scrolled/);await expect(header).toHaveCSS('background-color','rgba(43, 43, 49, 0.82)');}
  else {await expect(header).toHaveAttribute('data-public-header-state','hero-top');}
  const after=await header.boundingBox();expect(after!.height).toBe(before!.height);
 }
});
