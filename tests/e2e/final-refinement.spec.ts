import {test,expect} from '../helpers/api-fixture-test';
import {teamSnapshotScenario} from '../fixtures/component-services';
const widths=[320,360,390,430,768,1024,1280,1440];
function fixture(count=8,teams=16){
 const data=structuredClone(teamSnapshotScenario('room-ready'));
 const first=data.matchSchedule.find(m=>m.tournamentId==='daily-cup-24')!;
 data.matchSchedule=Array.from({length:count},(_,i)=>({...first,id:`final-${i+1}`,round:i+1,map:['Erangel','Miramar','Rondo'][i%3],status:i<6?'completed' as const:'scheduled' as const}));
 data.leaderboard=Array.from({length:teams},(_,i)=>({...data.leaderboard[0],tournamentId:'daily-cup-24',teamId:i===0?data.currentTeam.id:`final-team-${i}`,placement:i+1}));
 return data;
}
test('compact mobile schedule and switcher, natural card heights with 0/4/8/16 rounds',async({page})=>{
 let data=fixture();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/me/context',r=>r.fulfill({json:{...data,dataSource:'public.teams'}}));
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 for(const width of widths){
  await page.setViewportSize({width,height:900});
  await expect(page.locator('#matches')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`).toBe(true);
  if(width<=430){
   expect((await page.locator('.tournament-switcher-launcher').boundingBox())!.height).toBeLessThanOrEqual(58);
   const row=page.locator('.command-schedule-link').first();
   const boxes=await row.locator(':scope>span,:scope>strong,:scope>time,:scope>svg').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
   expect(Math.max(...boxes.map(b=>b.top))).toBeLessThan(Math.min(...boxes.map(b=>b.bottom)));
   for(let i=1;i<boxes.length;i++)expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i-1].right-1);
   if(width===320)await page.screenshot({path:'test-results/final-mobile-320.png',fullPage:true});
   await page.locator('.tournament-switcher-launcher').click();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.locator('.tournament-switcher-launcher').press('Escape');
  }
 }
 for(const count of [0,4,8,16]){
  data=fixture(count);await page.reload();await expect(page.locator('.command-schedule-link')).toHaveCount(count);
  const blank=await page.locator('#matches').evaluate(n=>{const r=n.getBoundingClientRect(),list=n.querySelector('.command-schedule')!.getBoundingClientRect();return r.bottom-list.bottom;});
  expect(blank).toBeLessThan(32);
 }
 await expect(page.getByRole('heading',{name:'Son matçlar',exact:true})).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('16-team standings fit desktop; larger tables and short windows remain scrollable',async({page})=>{
 let data=fixture(8,16);
 await page.route('**/api/me/context',r=>r.fulfill({json:{...data,dataSource:'public.teams'}}));
 await page.route('**/api/leaderboards/daily-cup-24',r=>r.fulfill({json:data.leaderboard}));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 await page.getByRole('button',{name:'Tam reytinqə bax'}).click();
 const modal=page.getByRole('dialog',{name:'Tam turnir sıralaması'});
 await expect(modal.locator('tbody tr')).toHaveCount(16);
 expect(await modal.evaluate(n=>n.scrollHeight<=n.clientHeight+1)).toBe(true);
 await expect(modal).toHaveCSS('scrollbar-width','none');
 const footer=modal.locator('footer');
 expect(await footer.evaluate(n=>getComputedStyle(n).justifyContent)).toBe('space-between');
 await expect(modal).toHaveCSS('opacity','1');
 await page.screenshot({path:'test-results/final-standings-16.png'});
 await page.keyboard.press('Escape');data=fixture(16,24);await page.reload();await page.getByRole('button',{name:'Tam reytinqə bax'}).click();
 await expect(modal.locator('tbody tr')).toHaveCount(24);
 for(const size of [{width:1280,height:560},{width:320,height:568},{width:720,height:450}]){
  await page.setViewportSize(size);
  await modal.focus();await modal.press('End');
  await expect.poll(()=>modal.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);
  await modal.press('Home');await expect.poll(()=>modal.evaluate(n=>n.scrollTop)).toBeLessThan(2);
  await modal.hover();await page.mouse.wheel(0,400);
  await expect.poll(()=>modal.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);
  await expect(modal.locator('tbody tr').last()).toBeAttached();
  const box=await modal.boundingBox();expect(box!.height).toBeLessThanOrEqual(size.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(modal.locator('.command-table-wrap')).toHaveCSS('scrollbar-width','none');
 }
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Tam reytinqə bax'})).toBeFocused();
});

test('round selection keeps rail position with mouse, drag, keyboard and external selection',async({page})=>{
 const data=fixture(16);
 await page.route('**/api/me/context',r=>r.fulfill({json:{...data,dataSource:'public.teams'}}));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 const rail=page.locator('.room-round-rail');await rail.scrollIntoViewIfNeeded();
 await rail.focus();await rail.press('End');
 await expect.poll(()=>rail.evaluate(n=>n.scrollLeft)).toBeGreaterThan(500);
 const last=rail.locator('button').last();await last.focus();
 const before=await rail.evaluate(n=>n.scrollLeft);await last.click();
 await expect(last).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>rail.evaluate(n=>n.scrollLeft)).toBeCloseTo(before,0);
 await expect(last).toHaveCSS('box-shadow','none');
 await rail.focus();await rail.press('Home');await expect.poll(()=>rail.evaluate(n=>n.scrollLeft)).toBeLessThan(5);
 const box=(await rail.boundingBox())!;
 await page.mouse.move(box.x+box.width-40,box.y+30);await page.mouse.down();await page.mouse.move(box.x+40,box.y+30,{steps:12});await page.mouse.up();
 await expect.poll(()=>rail.evaluate(n=>n.scrollLeft)).toBeGreaterThan(100);
 await expect(last).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Növbəti raundlar',exact:true}).click();
 await last.focus();await page.keyboard.press('Enter');await expect(last).toHaveAttribute('aria-pressed','true');
 await page.getByRole('link',{name:/Raund 7 — Raundu aç/}).click();await expect(rail.locator('[data-round-id="final-7"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('.tournament-switcher-launcher').click();await expect(page.locator('.tournament-switcher-cards [aria-current]')).toHaveCSS('box-shadow','none');
});

test('warm team navigation deduplicates snapshot reads and never prefetches room credentials',async({page})=>{
 const reads:string[]=[];
 page.on('request',r=>{const p=new URL(r.url()).pathname;if(p==='/api/me/context'||/\/room$/.test(p))reads.push(p);});
 await page.goto('/team');await expect(page.locator('.product-shell--team')).toBeVisible();
 await page.getByRole('link',{name:'Turnirlərim',exact:true}).first().click();
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 await expect(page.getByRole('heading',{name:'Matç otağı'})).toBeVisible();
 const baseline=reads.filter(p=>p==='/api/me/context').length;
 await page.getByRole('link',{name:'← Turnirlərim'}).click();await expect(page).toHaveURL(/\/team\/tournaments$/);await page.goBack();
 await expect(page.getByRole('heading',{name:'Matç otağı'})).toBeVisible();
 expect(reads.filter(p=>p==='/api/me/context')).toHaveLength(baseline);
 expect(reads.filter(p=>/\/room$/.test(p))).toHaveLength(0);
});

test('crop dialog keeps controls reachable at short heights and enlarged text',async({page})=>{
 await page.goto('/team/profile');
 await page.getByRole('button',{name:'Loqo və banneri idarə et',exact:true}).click();
 await page.locator('#profile-media input[type=file]').first().setInputFiles('src/assets/maps/erangel-640.webp');
 const dialog=page.getByRole('dialog',{name:'Komanda loqosunu düzəlt'});
 await expect(dialog).toBeVisible();
 for(const size of [{width:1440,height:900},{width:1280,height:560},{width:390,height:640},{width:320,height:480}]){
  await page.setViewportSize(size);
  await expect(dialog).toHaveCSS('scrollbar-width','none');
  const bounds=(await dialog.boundingBox())!;expect(bounds.height).toBeLessThanOrEqual(size.height-20);
  await dialog.getByRole('button',{name:'Tətbiq et',exact:true}).scrollIntoViewIfNeeded();
  const save=(await dialog.getByRole('button',{name:'Tətbiq et',exact:true}).boundingBox())!;
  expect(save.y+save.height).toBeLessThanOrEqual(size.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.setViewportSize({width:720,height:450});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await dialog.getByRole('button',{name:'Tətbiq et',exact:true}).scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>document.documentElement.style.fontSize='');
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
});

test('touch swipe and tap preserve round position with long tournament names',async({page,context})=>{
 const data=fixture(16);data.tournaments=data.tournaments.map(t=>({...t,name:'Azərbaycan Çempionatı — Uzun turnir adı və final mərhələsi'}));
 await page.route('**/api/me/context',r=>r.fulfill({json:{...data,dataSource:'public.teams'}}));
 await page.setViewportSize({width:390,height:844});
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 const rail=page.locator('.room-round-rail');await rail.scrollIntoViewIfNeeded();await rail.focus();await rail.press('Home');
 await expect.poll(()=>rail.evaluate(n=>n.scrollLeft)).toBeLessThan(5);
 const box=(await rail.boundingBox())!;const y=box.y+30,start=box.x+box.width-20;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
 for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start-i*20,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(()=>rail.evaluate(n=>n.scrollLeft)).toBeGreaterThan(50);
 // Stop inertia before comparing selection, as a physical tap would.
 await rail.evaluate(n=>{n.scrollTo({left:n.scrollLeft,behavior:'instant'});});
 const candidate=await rail.locator('button').evaluateAll(ns=>{const parent=ns[0].parentElement!.getBoundingClientRect();return ns.findIndex(n=>{const r=n.getBoundingClientRect();return r.left>=parent.left&&r.right<=parent.right;});});
 expect(candidate).toBeGreaterThanOrEqual(0);const selected=rail.locator('button').nth(candidate),b=(await selected.boundingBox())!;
 const before=await rail.evaluate(n=>n.scrollLeft);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(selected).toHaveAttribute('aria-pressed','true');
 expect(Math.abs(await rail.evaluate(n=>n.scrollLeft)-before)).toBeLessThan(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await cdp.detach();
});
