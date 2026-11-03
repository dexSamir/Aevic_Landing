import { test, expect } from '../helpers/api-fixture-test';
import { teamSnapshotScenario } from '../fixtures/component-services';

test('command center adapts to all required content widths and enlarged text', async ({page})=>{
 test.setTimeout(120_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 const fixture=teamSnapshotScenario('room-ready');
 await page.route('**/api/leaderboards/daily-cup-24',route=>route.fulfill({json:fixture.leaderboard.map(row=>({...row,tournamentId:'daily-cup-24'}))}));
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 await expect(page.getByRole('heading',{name:'Matç otağı'})).toBeVisible();
 for(const [width,height] of [[320,700],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`).toBe(true);
  await expect(page.getByRole('group',{name:'Raund',exact:true})).toBeVisible();
  await expect(page.locator('.tournament-command select, .tournament-command details, .tournament-command [role=combobox]')).toHaveCount(0);
  const bounds=await page.getByRole('button',{name:'Otaq statusunu yoxla'}).boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(44);
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>document.documentElement.style.fontSize='');
 await page.getByRole('link',{name:'Otaq',exact:true}).click();await expect(page).toHaveURL(/#room$/);
 await expect(page.locator('#room')).toBeFocused();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/command-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'test-results/command-desktop.png',fullPage:true});
 expect(errors).toEqual([]);
});

test('room reads are intentional and per-round, copy/reveal works, navigation clears secrets',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 const requests:string[]=[];
 await page.route('**/api/team/tournaments/*/rounds/*/room',async route=>{
  const round=route.request().url().split('/').at(-2)!;requests.push(round);
  await route.fulfill({json:{roundId:round,releaseAt:'2026-08-04T16:50:00Z',status:'released',roomId:`fixture-${round}`,password:`secret-${round}`}});
 });
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 await expect(page.getByRole('group',{name:'Raund',exact:true})).toBeVisible();expect(requests).toEqual([]);
 const first=await page.locator('.command-rounds [aria-pressed="true"]').getAttribute('data-round-id');
 await page.getByRole('button',{name:'Otaq statusunu yoxla'}).click();
 await expect(page.getByText(`fixture-${first}`,{exact:true})).toBeVisible();await expect(page.getByText(`secret-${first}`,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Göstər',exact:true}).click();await expect(page.getByText(`secret-${first}`,{exact:true})).toBeVisible();
 await page.locator('.credential-placeholder').first().getByRole('button').click();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(`fixture-${first}`);
 await page.locator('.command-rounds button[aria-pressed="false"]').first().click();
 await expect(page.locator('.credential-placeholder')).toHaveCount(0);expect(requests).toHaveLength(1);
 await page.getByRole('button',{name:'Otaq statusunu yoxla'}).click();await expect(page.locator('.credential-placeholder')).toHaveCount(2);expect(requests).toHaveLength(2);
 await page.getByRole('link',{name:'← Turnirlərim'}).click();await page.goBack();await expect(page.locator('.credential-placeholder')).toHaveCount(0);
});

test('check-in confirmation, completed results, cancellation and read-only participation stay truthful',async({page})=>{
 await page.goto('/team/tournaments/daily-cup-24?scenario=check-in-open');
 await page.getByRole('button',{name:'Check-in et',exact:true}).first().click();
 await page.getByRole('button',{name:'Bəli, hazırıq'}).click();
 await expect(page.getByText(/oyunçu · Check-in tamamlanıb/)).toBeVisible();
 const snapshot=structuredClone(teamSnapshotScenario('room-ready'));
 snapshot.tournaments=snapshot.tournaments.map(t=>t.id==='daily-cup-24'?{...t,status:'cancelled'}:t);
 await page.route('**/api/me/context',route=>route.fulfill({json:{...snapshot,dataSource:'public.teams'}}));
 await page.reload();await expect(page.getByRole('heading',{name:'Turnir ləğv edilib',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Otaq statusunu yoxla'})).toHaveCount(0);await expect(page.locator('.command-clock')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Turnir sıralaması'})).toBeVisible();
});

test('withdrawal deep link keeps confirmation and closes room access only after success',async({page})=>{
 let writes=0;
 await page.route('**/api/tournaments/daily-cup-24/withdraw',async route=>{writes++;await route.fulfill({status:204,body:''});});
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready#withdrawal');
 await expect(page.locator('#withdrawal')).toBeFocused();
 await page.getByRole('button',{name:'Turnirdən çıx',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();expect(writes).toBe(0);
 await page.getByRole('button',{name:'Bəli, geri çəkil',exact:true}).click();
 await expect(page.getByRole('heading',{name:'İştirak dayandırılıb',exact:true})).toBeVisible();
 expect(writes).toBe(1);await expect(page.getByRole('button',{name:'Otaq statusunu yoxla'})).toHaveCount(0);
});

test('published performance and map cards render without overflow or failed assets', async ({ page }) => {
 const snapshot=structuredClone(teamSnapshotScenario('room-ready'));
 const original=snapshot.matchSchedule.filter(m=>m.tournamentId==='daily-cup-24');
 const rounds=Array.from({length:8},(_,index)=>({...original[index%original.length],id:`refinement-round-${index+1}`,round:index+1,startsAt:new Date(Date.parse(original[0].startsAt)+index*2400000).toISOString(),status:index<6?'completed' as const:'scheduled' as const}));
 snapshot.matchSchedule=rounds;
 snapshot.matchHistory=rounds.slice(0,6).map((m,index)=>({...snapshot.matchHistory[0],id:m.id,tournamentId:m.tournamentId,map:m.map,playedAt:m.startsAt,placement:index+1,points:18-index,finishes:4,stage:m.stage,stageLabel:'Final'}));
 const failures:string[]=[];
 page.on('pageerror',error=>failures.push(error.message));
 page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${new URL(response.url()).pathname}`);});
 await page.route('**/api/me/context',route=>route.fulfill({json:{...snapshot,dataSource:'public.teams'}}));
 await page.route('**/api/leaderboards/daily-cup-24',route=>route.fulfill({json:snapshot.leaderboard.map(row=>({...row,tournamentId:'daily-cup-24'}))}));
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 await expect(page.locator('.command-result-art')).toHaveCount(4);
 await expect(page.locator('.command-performance-stats')).toBeVisible();
 for (const width of [320,360,390,430,768,1024,1280,1440]) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>document.fonts.ready);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`populated results overflow at ${width}`).toBe(true);
  if ([390,768,1440].includes(width)) {
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await page.screenshot({path:`test-results/command-populated-${width}.png`,fullPage:true});
  }
 }
 await page.locator('#results').scrollIntoViewIfNeeded();
 await expect(page.locator('.command-result-art').first()).toBeVisible();
 expect(await page.locator('.command-result-art').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
 await page.screenshot({path:'test-results/command-map-results.png'});
 const sizes=await page.locator('.command-map-preview').evaluateAll(images=>images.map(image=>({width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height})));
 expect(new Set(sizes.map(size=>`${size.width}:${size.height}`)).size).toBe(1);
 await page.getByRole('button',{name:'Bütün raundlar',exact:true}).click();
 await expect(page.locator('.command-results>li')).toHaveCount(8);
 await page.getByRole('button',{name:'Son 4 nəticə',exact:true}).click();
 await expect(page.locator('.command-results>li')).toHaveCount(4);
 const rule=page.locator('.command-rule-links button').first();
 const ruleText=await rule.innerText();
 await rule.click();
 await expect(page.getByRole('dialog')).toContainText(ruleText);
 await page.keyboard.press('Escape');
 expect(failures).toEqual([]);
});

test('desktop sidebar collapses persistently and leaves the mobile controls unchanged', async ({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 await expect(page.getByRole('heading',{name:'Matç otağı'})).toBeVisible();
 const expanded=await page.locator('.tournament-command').boundingBox();
 await page.getByRole('button',{name:'Yan paneli yığ',exact:true}).click();
 await expect(page.locator('#team-desktop-sidebar')).toBeHidden();
 await expect.poll(async()=>(await page.locator('.tournament-command').boundingBox())!.width).toBeGreaterThan(expanded!.width+200);
 await page.screenshot({path:'test-results/command-collapsed.png'});
 await page.reload();
 await expect(page.getByRole('button',{name:'Yan paneli genişləndir'})).toHaveAttribute('aria-expanded','false');
 for(const width of [1280,1440]) {
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.setViewportSize({width:390,height:844});
 await expect(page.locator('.workspace-desktop-toggle')).toBeHidden();
 const mobileToggle=page.getByRole('button',{name:'Naviqasiyanı aç',exact:true});
 const before=await mobileToggle.boundingBox();
 const account=await page.getByRole('link',{name:'Hesab ayarları',exact:true}).boundingBox();
 expect(before!.x).toBeGreaterThan(account!.x);
 await mobileToggle.click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toBeHidden();
 await page.setViewportSize({width:1440,height:900});
 await page.getByRole('button',{name:'Yan paneli genişləndir'}).click();
 await expect(page.locator('#team-desktop-sidebar')).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 expect(await mobileToggle.boundingBox()).toEqual(before);
});

test('standings preview centers on the current team, exposes movement and opens the full table',async({page})=>{
 const snapshot=teamSnapshotScenario('room-ready');
 const base=snapshot.leaderboard[0];
 const rows=Array.from({length:12},(_,index)=>({...base,tournamentId:'daily-cup-24',teamId:index===6?snapshot.currentTeam.id:`opponent-${index}`,placement:index+1,totalPoints:120-index*5}));
 await page.route('**/api/leaderboards/daily-cup-24',route=>route.fulfill({json:rows}));
 await page.route('**/api/leaderboards/daily-cup-24/movement',route=>route.fulfill({json:[{teamId:snapshot.currentTeam.id,currentRank:7,previousRank:9,delta:2,kind:'up',previousSnapshotId:'previous-round'}]}));
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 const preview=page.locator('#standings .command-table');
 await expect(preview.locator('tbody tr')).toHaveCount(5);
 expect(await preview.locator('.command-rank').allTextContents()).toEqual(['5','6','7','8','9']);
 await expect(preview.locator('.is-own-team')).toHaveCount(1);
 await expect(preview.getByLabel('2 pillə yuxarı')).toBeVisible();
 const open=page.getByRole('button',{name:'Tam reytinqə bax'});
 await open.click();
 const dialog=page.getByRole('dialog',{name:'Tam turnir sıralaması'});
 await expect(dialog.locator('tbody tr')).toHaveCount(12);
 await page.keyboard.press('Escape');
 await expect(dialog).toBeHidden();
 await expect(open).toBeFocused();
 await page.setViewportSize({width:320,height:700});
 await open.click();
 await expect(dialog).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('tournament skeleton follows all nine dashboard cells on desktop and mobile',async({page})=>{
 let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 const snapshot=teamSnapshotScenario('room-ready');
 await page.route('**/api/me/context',async route=>{await gate;await route.fulfill({json:{...snapshot,dataSource:'public.teams'}});});
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 try {
  await expect(page.getByRole('status',{name:'Turnir mərkəzi yüklənir'})).toBeVisible();
  await expect(page.locator('.command-loading [data-panel]')).toHaveCount(9);
  for(const width of [320,360,390,430,768,1024,1280,1440]) {
   await page.setViewportSize({width,height:900});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`skeleton overflow at ${width}`).toBe(true);
   if(width===390||width===1440)await page.screenshot({path:`test-results/command-skeleton-${width}.png`});
  }
 } finally {release();}
 await expect(page.getByRole('heading',{name:'Matç otağı'})).toBeVisible();
 await expect(page.locator('.command-loading')).toHaveCount(0);
});
