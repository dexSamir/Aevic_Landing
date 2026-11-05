import {test,expect} from '../helpers/api-fixture-test';
import {teamSnapshotScenario} from '../fixtures/component-services';
const widths=[320,360,390,430,768,1024,1440];

test('tournament card tray, round slider and result links replace round modals',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const data=structuredClone(teamSnapshotScenario('room-ready'));
 const original=data.matchSchedule.filter(m=>m.tournamentId==='daily-cup-24');
 const rounds=Array.from({length:12},(_,i)=>({...original[i%original.length],id:`refine-${i+1}`,round:i+1,startsAt:new Date(Date.parse(original[0].startsAt)+i*3600000).toISOString(),status:i<6?'completed' as const:'scheduled' as const}));
 data.matchSchedule=rounds;data.matchHistory=rounds.slice(0,6).map(m=>({...data.matchHistory[0],id:m.id,tournamentId:m.tournamentId,map:m.map,playedAt:m.startsAt,placement:1,points:17,finishes:11,stage:m.stage}));
 await page.route('**/api/me/context',r=>r.fulfill({json:{...data,dataSource:'public.teams'}}));
 await page.route('**/api/leaderboards/daily-cup-24',r=>r.fulfill({json:data.leaderboard.map(row=>({...row,tournamentId:'daily-cup-24'}))}));
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 const launcher=page.locator('.tournament-switcher-launcher'),rail=page.locator('.room-round-rail');
 for(const width of widths){
  await page.setViewportSize({width,height:900});
  await expect(launcher).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`page overflow ${width}`).toBe(true);
  expect(await launcher.evaluate(n=>getComputedStyle(n).borderTopColor)).toMatch(/^rgba\(255, 255, 255,/);
  await expect(rail).toHaveCSS('scrollbar-width','none');
  const sizes=await page.locator('.command-rank-badge').first().evaluate(node=>{const a=node.getBoundingClientRect(),r=node.closest('tr')!.getBoundingClientRect();return{width:a.width,ratio:a.width/a.height,left:a.left-r.left,top:a.top-r.top};});
  expect(sizes.width).toBeGreaterThan(width<=600?36:45);expect(sizes.ratio).toBe(1.5);expect(sizes.left).toBeLessThanOrEqual(4.1);
  await launcher.click();await expect(page.locator('.tournament-switcher-cards a')).toHaveCount(data.participations.length);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if([320,1440].includes(width))await page.screenshot({path:`test-results/tournament-tray-${width}.png`,fullPage:true});
  await launcher.press('Escape');await expect(launcher).toBeFocused();await expect(page.getByRole('dialog')).toHaveCount(0);
 }
 await rail.focus();await rail.press('Home');await expect.poll(()=>rail.evaluate(n=>n.scrollLeft)).toBeLessThanOrEqual(3);
 await page.getByRole('button',{name:'Növbəti raundlar',exact:true}).click();await expect.poll(()=>rail.evaluate(n=>n.scrollLeft)).toBeGreaterThan(0);
 const last=rail.locator('button').last();await last.focus();await page.keyboard.press('Enter');await expect(last).toHaveAttribute('aria-pressed','true');
 await page.getByRole('link',{name:/Raund 7 — Raundu aç/}).click();await expect(page).toHaveURL(/#room$/);await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('link',{name:'Bütün raundlar',exact:true}).click();await expect(page).toHaveURL(/#matches$/);await expect(page.getByRole('dialog')).toHaveCount(0);
 const map=page.locator('.command-map-result-action').first();const mapHref=await map.getAttribute('href');await map.click();await expect(page).toHaveURL(new RegExp(mapHref!+'$'));await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');await page.getByRole('link',{name:/Raund 1 — Raundu aç/}).click();await expect(page).toHaveURL(/\/matches\/refine-1$/);await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');await launcher.click();const other=page.locator('.tournament-switcher-cards a:not([aria-current])').first();const href=await other.getAttribute('href');await other.click();await expect(page).toHaveURL(new RegExp(href!+'$'));await expect(page.locator('.tournament-switcher-tray')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('profile studio is responsive and retains identity, social and media controls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/team/profile');
 await expect(page.getByRole('heading',{name:'Komanda profili',exact:true})).toBeVisible();
 for(const width of widths){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`profile overflow ${width}`).toBe(true);
  await expect(page.getByLabel('Komanda adı',{exact:true})).toBeVisible();
  if([320,1440].includes(width))await page.screenshot({path:`test-results/profile-studio-${width}.png`,fullPage:true});
 }
 const original=await page.getByLabel('Komanda adı',{exact:true}).inputValue();
 let identity:any;
 await page.route('**/api/teams/*',async route=>{if(route.request().method()!=='PATCH')return route.fallback();identity=route.request().postDataJSON();const snapshot=teamSnapshotScenario('room-ready');await route.fulfill({json:{...snapshot.currentTeam,...identity}});});
 await page.getByLabel('Komanda adı',{exact:true}).fill('Studio test team');await expect(page.getByRole('heading',{name:'Studio test team',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Profili saxla',exact:true}).click();await expect(page.getByText('Komanda profili saxlanıldı.',{exact:true})).toBeVisible();expect(identity.name).toBe('Studio test team');expect(original).toBeTruthy();
 let social:any;
 await page.route('**/api/teams/*/social-links',async route=>{social=route.request().postDataJSON();await route.fulfill({json:{...teamSnapshotScenario('room-ready').currentTeam,socialLinks:social}});});
 await page.getByRole('textbox',{name:/Instagram/}).fill('https://instagram.com/aevic_test');await page.getByRole('button',{name:'Sosial linkləri saxla',exact:true}).click();await expect(page.getByText('Sosial linklər saxlanıldı.',{exact:true})).toBeVisible();expect(social.instagram).toBe('https://instagram.com/aevic_test');
 await page.getByRole('button',{name:'Loqo və banneri idarə et',exact:true}).click();await expect(page.getByText('Komanda loqosu',{exact:true}).last()).toBeVisible();await expect(page.getByText('Komanda banneri',{exact:true})).toBeVisible();
 await page.setViewportSize({width:320,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 let uploadCount=0;
 await page.route('**/api/media/uploads',async route=>{uploadCount++;expect(route.request().postDataBuffer()!.length).toBeGreaterThan(100);await route.fulfill({json:{status:'uploaded',previewUrl:'/src/assets/maps/erangel-640.webp'}});});
 await page.locator('#profile-media input[type=file]').first().setInputFiles('src/assets/maps/erangel-640.webp');
 await expect(page.getByRole('dialog',{name:'Komanda loqosunu düzəlt'})).toBeVisible();
 await page.getByRole('button',{name:'Tətbiq et',exact:true}).click();
 await expect(page.getByText('Loqo saxlanıldı.',{exact:true})).toBeVisible();expect(uploadCount).toBe(1);
 expect(errors).toEqual([]);
});
