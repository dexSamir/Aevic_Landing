import {test,expect} from '../helpers/api-fixture-test';
import {currentTeam,leaderboard} from '../fixtures/platform-data';
import sharp from 'sharp';
async function inspect(data:Buffer,name:string,width:number,height?:number){
 const meta=await sharp(data).metadata();expect(meta.width).toBe(width);if(height)expect(meta.height).toBe(height);
 const stats=await sharp(data).stats();expect(Math.max(...stats.channels.slice(0,3).map(c=>c.stdev))).toBeGreaterThan(10);
 await sharp(data).toFile(`/tmp/aevic-${name}.png`);
}
test('chart export preserves labels and series pixels',async({page})=>{
 await page.goto('/team/career');
 const chart=page.locator('.insight-charts--single .insight-chart');await expect(chart).toBeVisible();
 await expect(chart.locator('.chart-line')).toHaveAttribute('points',/\d/);
 const url=await chart.evaluate(async node=>{const path='/src/utils/pngExport.ts';const {renderPng}=await import(path);return renderPng(node as HTMLElement,{width:1080});});
 await inspect(Buffer.from(url.split(',')[1],'base64'),'chart-export',1080);
 await page.screenshot({path:'/tmp/aevic-career-refined.png',fullPage:true});
});
test('both tournament downloads contain results, including all table rows',async({page})=>{
 test.setTimeout(60000);
 await page.route('**/api/team/tournaments/summer-final-25/result-export',r=>r.fulfill({json:{teamId:currentTeam.id,result:leaderboard.find(row=>row.teamId===currentTeam.id&&row.tournamentId==='summer-final-25')}}));
 await page.goto('/tournaments/summer-final-25');await page.getByRole('button',{name:'Nəticələri yüklə',exact:true}).click();
 for(const [label,name] of [['Turnir cədvəli','leaderboard-export'],['Komanda nəticəsi','result-export']]){
  await page.getByRole('radio',{name:label}).click();
  const poster=page.locator('.generated-poster');await expect(poster).toContainText('Summer Final 2025');
  if(name==='leaderboard-export')expect(await poster.locator('ol > li').count()).toBe(leaderboard.filter(r=>r.tournamentId==='summer-final-25').length);
  const event=page.waitForEvent('download');await page.getByRole('button',{name:'Yüklə',exact:true}).click();
  const stream=await (await event).createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);
  await inspect(Buffer.concat(chunks),name,2400,2400);
 }
});
test('share formats generate their actual pixel dimensions',async({page})=>{
 test.setTimeout(60000);await page.goto('/team/sharecards');
 await page.locator('.team-share-download').getByRole('button',{name:'Paylaş',exact:true}).click();
 const sheet=page.getByRole('dialog',{name:'Paylaş'});
 for(const [format,height] of [['square',1080],['portrait',1350],['story',1920]] as const){
  await sheet.getByLabel('Şəkil formatı').selectOption(format);await sheet.getByRole('button',{name:'Paylaşım şəklini hazırla'}).click();
  const event=page.waitForEvent('download');await sheet.getByRole('button',{name:'PNG-ni yüklə',exact:true}).click();
  const stream=await(await event).createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);
  await inspect(Buffer.concat(chunks),format,1080,height);
 }
});
test('drawer last link and adjacent regulations remain usable at narrow widths',async({page})=>{
 test.setTimeout(60000);
 for(const width of [320,360,375,390,430,768]){
  await page.setViewportSize({width,height:844});await page.goto('/team/career');
  await expect(page.locator('.career-nav')).toHaveCount(0);
  await expect(page.locator('.product-topbar a[href="/regulations"]')).toBeVisible();
  await page.getByRole('button',{name:'Naviqasiyanı aç'}).click();
  const drawer=page.locator('#team-navigation-drawer');await expect(drawer).toBeVisible();
  await expect(drawer).toHaveCSS('opacity','1');
  if(width===390)await page.screenshot({path:'/tmp/aevic-drawer-refined.png'});
  await expect(page.locator('.mobile-bottom-nav')).toHaveCount(0);
  await drawer.getByRole('link',{name:'Ayarlar',exact:true}).click();await expect(page).toHaveURL(/\/team\/settings$/);
  await expect(drawer).toBeHidden();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }
});

test('long standings include the final row without shrinking it into a viewport',async({page})=>{
 await page.route('**/api/team/tournaments/summer-final-25/result-export',r=>r.fulfill({json:{teamId:currentTeam.id,reason:'not-participant'}}));
 const rows=Array.from({length:32},(_,i)=>({...leaderboard[0],tournamentId:'summer-final-25',teamId:`export-${i}`,placement:i+1,totalPoints:100-i}));
 await page.route('**/api/leaderboards/summer-final-25',r=>r.fulfill({json:rows}));
 await page.goto('/tournaments/summer-final-25');await page.getByRole('button',{name:'Nəticələri yüklə',exact:true}).click();
 const poster=page.locator('.generated-poster--long');await expect(poster.locator('ol > li')).toHaveCount(32);
 const bounds=await poster.evaluate(n=>{const root=n.getBoundingClientRect(),last=n.querySelector('ol > li:last-child')!.getBoundingClientRect(),footer=n.querySelector('footer')!.getBoundingClientRect();return {last:last.bottom-root.top,footer:footer.top-root.top,height:root.height,row:last.height};});
 expect(bounds.last).toBeLessThan(bounds.footer);expect(bounds.row).toBeGreaterThan(20);
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Yüklə',exact:true}).click();
 const stream=await(await event).createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);
 await inspect(Buffer.concat(chunks),'long-leaderboard',2400);
});

test('MFA paste, caret navigation, error recovery and completion',async({page,context})=>{
 let authenticated=false,attempts=0;
 await page.route('**/api/me/session',async r=>authenticated?r.fallback():r.fulfill({contentType:'application/json',body:'null'}));
 await page.route('**/api/auth/google/status',r=>r.fulfill({json:{enabled:true}}));
 await page.route('**/api/auth/google/continuation',r=>r.fulfill({json:{mode:'login',email:'fixture@example.test',remember:true}}));
 await page.route('**/api/auth/google/complete',r=>{attempts++;if(attempts===1)return r.fulfill({status:401,json:{code:'MFA_INVALID'}});authenticated=true;return r.fulfill({json:{redirectTo:'/'}});});
 await page.setViewportSize({width:390,height:844});await page.goto('/login?google=continue&mfa=required');
 const input=page.getByRole('textbox',{name:'Authenticator kodu'});await expect(input).toBeFocused();
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.evaluate(()=>navigator.clipboard.writeText('123456'));
 await input.press('ControlOrMeta+V');await expect(input).toHaveValue('123456');
 await input.press('ArrowLeft');await expect(page.locator('.otp-slots span').nth(5)).toHaveAttribute('data-active','true');
 await input.press('ArrowLeft');await expect(page.locator('.otp-slots span').nth(4)).toHaveAttribute('data-active','true');
 await page.screenshot({path:'/tmp/aevic-mfa-refined.png'});
 await page.getByRole('button',{name:'Girişi tamamla',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Kod yanlışdır');
 await input.fill('654321');await page.getByRole('button',{name:'Girişi tamamla',exact:true}).click();await expect(page).toHaveURL(/\/$/);expect(attempts).toBe(2);
});
test('workspace layouts stay within every required viewport',async({page})=>{
 test.setTimeout(120000);
 for(const width of [320,375,390,430,768,1024,1440,1920]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/team','/team/career','/team/sharecards']){
   await page.goto(path);await expect(page.locator('.product-page h1')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`${path} at ${width}`).toBeLessThanOrEqual(1);
  }
 }
});
