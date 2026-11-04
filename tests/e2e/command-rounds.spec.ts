import {test,expect} from '../helpers/api-fixture-test';
import {teamSnapshotScenario} from '../fixtures/component-services';

test('round list, official detail, prematch and selector remain responsive and secure',async({page})=>{
 const data=structuredClone(teamSnapshotScenario('room-ready'));
 const original=data.matchSchedule.filter(m=>m.tournamentId==='daily-cup-24');
 const rounds=Array.from({length:8},(_,i)=>({...original[i%original.length],id:`round-ux-${i+1}`,round:i+1,startsAt:new Date(Date.parse(original[0].startsAt)+i*3600000).toISOString(),status:i<6?'completed' as const:'scheduled' as const}));
 data.matchSchedule=rounds;
 data.matchHistory=rounds.slice(0,6).map(m=>({...data.matchHistory[0],id:m.id,tournamentId:m.tournamentId,map:m.map,playedAt:m.startsAt,placement:1,points:17,finishes:11,stage:m.stage}));
 await page.route('**/api/me/context',r=>r.fulfill({json:{...data,dataSource:'public.teams'}}));
 await page.route('**/api/leaderboards/daily-cup-24',route=>route.fulfill({json:data.leaderboard.map(row=>({...row,tournamentId:'daily-cup-24'}))}));
 let roomReads=0;page.on('request',r=>{if(r.url().includes('/room'))roomReads++;});
 await page.route('**/api/matches/round-ux-*',route=>{const match=rounds.find(m=>route.request().url().endsWith(m.id))!;return route.fulfill({json:{match,tournament:{id:match.tournamentId,name:'Official tournament',shortName:'Official'},published:match.status==='completed',teamResults:match.status==='completed'?[{teamId:data.currentTeam.id,teamName:data.currentTeam.name,placement:1,finishes:11,placementPoints:6,totalPoints:17,wwcd:true}]:[],standings:match.status==='completed'?[{tournamentId:match.tournamentId,teamId:data.currentTeam.id,placement:1,matches:1,wwcd:1,finishes:11,placementPoints:6,finishPoints:11,penalties:0,totalPoints:17,bestFinish:1}]:[]}});});
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 await expect(page.locator('.command-map-result-action')).toHaveCount(4);
 for(const width of [320,360,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`page overflow ${width}`).toBe(true);
  const badge=await page.locator('.command-table-preview .command-rank-badge').first().evaluate(node=>{const r=node.getBoundingClientRect(),row=node.closest('tr')!.getBoundingClientRect();return {ratio:r.width/r.height,left:r.left-row.left,top:r.top-row.top,bottom:row.bottom-r.bottom};});
  expect(badge.ratio).toBe(1.5);expect(Math.abs(badge.left-badge.top)).toBeLessThan(1);expect(Math.abs(badge.top-badge.bottom)).toBeLessThan(1);
  if(width===1440){const a=await page.locator('#matches').boundingBox(),b=await page.locator('#room').boundingBox();expect(Math.abs(a!.y-b!.y)).toBeLessThan(1);expect(b!.x).toBeGreaterThan(a!.x+a!.width);}
  if(width===1440)await page.screenshot({path:'test-results/round-dashboard-1440.png',fullPage:true});
  await page.getByRole('button',{name:'Bütün raundlar',exact:true}).click();
  await expect(page.locator('.round-list-row')).toHaveCount(8);
  const dialog=page.getByRole('dialog');expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  await expect(dialog).toHaveCSS('opacity','1');
  if(width===1440)await page.screenshot({path:'test-results/round-list-1440.png',animations:'disabled'});
  await page.locator('.round-list-row').nth(3).click();
  await expect(page.locator('.round-statistics')).toContainText('17');
  await expect(page.locator('.round-banner')).toContainText('R4');
  expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  expect(await dialog.locator('.modal__body').evaluate(n=>n.scrollWidth<=n.clientWidth),`modal body overflow ${width}`).toBe(true);
  await page.getByRole('tab',{name:'Komandanın performansı'}).click();await expect(page.locator('.round-performance')).toContainText('11');
  await page.getByRole('tab',{name:/Turnir sıralaması/}).click();
  if([320,1440].includes(width))await page.screenshot({path:`test-results/round-detail-${width}.png`});
  const close=page.getByRole('button',{name:'Pəncərəni bağla'});await expect(close).toBeVisible();
  await page.getByRole('button',{name:'Bütün raundlara qayıt'}).click();await expect(page.locator('.round-list-row')).toHaveCount(8);
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.locator('.modal-backdrop')).toHaveCount(0);
 }
 await page.locator('.command-map-result-action').first().click();await expect(page.locator('.round-banner')).toContainText('R6');await expect(page.getByRole('button',{name:'Bütün raundlara qayıt'})).toHaveCount(0);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:/Raund 1 — Raundu aç/}).click();await expect(page.locator('.round-statistics')).toContainText('17');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:/Raund 7 — Raundu aç/}).click();await expect(page.locator('.round-prematch')).toBeVisible();await expect(page.locator('.round-statistics')).toHaveCount(0);expect(roomReads).toBe(0);await page.getByRole('dialog').getByRole('button',{name:'Matç otağına keç'}).click();await expect(page.locator('#room')).toBeFocused();expect(roomReads).toBe(0);
 await page.getByRole('button',{name:/Raund 8 — Raundu aç/}).click();await expect(page.locator('.round-prematch')).toContainText('Raund məlumatları');await page.keyboard.press('Escape');
 await page.locator('.command-selector-trigger').click();const other=page.locator('.command-selector-options a:not([aria-current])').first();const href=await other.getAttribute('href');await other.click();await expect(page).toHaveURL(new RegExp(href!+'$'));await expect(page.getByRole('dialog')).toHaveCount(0);
});
