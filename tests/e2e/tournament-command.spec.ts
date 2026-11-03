import { test, expect } from '../helpers/api-fixture-test';
import { teamSnapshotScenario } from '../fixtures/component-services';

test('command center adapts to all required content widths and enlarged text', async ({page})=>{
 test.setTimeout(120_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const fixture=teamSnapshotScenario('room-ready');
 await page.route('**/api/leaderboards/daily-cup-24',route=>route.fulfill({json:fixture.leaderboard.map(row=>({...row,tournamentId:'daily-cup-24'}))}));
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 await expect(page.getByRole('heading',{name:'Matç otağı'})).toBeVisible();
 for(const [width,height] of [[320,700],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`).toBe(true);
  await expect(page.getByLabel('Raund',{exact:true})).toBeVisible();
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
 await expect(page.getByLabel('Raund',{exact:true})).toBeVisible();expect(requests).toEqual([]);
 const first=await page.getByLabel('Raund',{exact:true}).inputValue();
 await page.getByRole('button',{name:'Otaq statusunu yoxla'}).click();
 await expect(page.getByText(`fixture-${first}`,{exact:true})).toBeVisible();await expect(page.getByText(`secret-${first}`,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Göstər',exact:true}).click();await expect(page.getByText(`secret-${first}`,{exact:true})).toBeVisible();
 await page.locator('.credential-placeholder').first().getByRole('button').click();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(`fixture-${first}`);
 const other=await page.getByLabel('Raund',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));
 await page.getByLabel('Raund',{exact:true}).selectOption(other.find(id=>id!==first)!);
 await expect(page.locator('.credential-placeholder')).toHaveCount(0);expect(requests).toHaveLength(1);
 await page.getByRole('button',{name:'Otaq statusunu yoxla'}).click();await expect(page.locator('.credential-placeholder')).toHaveCount(2);expect(requests).toHaveLength(2);
 await page.getByRole('link',{name:'← Turnirlərim'}).click();await page.goBack();await expect(page.locator('.credential-placeholder')).toHaveCount(0);
});

test('check-in confirmation, completed results, cancellation and read-only participation stay truthful',async({page})=>{
 await page.goto('/team/tournaments/daily-cup-24?scenario=check-in-open');
 await page.getByRole('button',{name:'Check-in et',exact:true}).first().click();
 await page.getByRole('button',{name:'Bəli, hazırıq'}).click();
 await page.getByText('İştirak məlumatları',{exact:true}).click();
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
 const rounds=snapshot.matchSchedule.filter(m=>m.tournamentId==='daily-cup-24');
 snapshot.matchHistory=rounds.map((m,index)=>({...snapshot.matchHistory[0],id:m.id,tournamentId:m.tournamentId,map:m.map,playedAt:m.startsAt,placement:index+1,points:18-index,finishes:4,stage:m.stage,stageLabel:'Final'}));
 const failures:string[]=[];
 page.on('pageerror',error=>failures.push(error.message));
 page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${new URL(response.url()).pathname}`);});
 await page.route('**/api/me/context',route=>route.fulfill({json:{...snapshot,dataSource:'public.teams'}}));
 await page.route('**/api/leaderboards/daily-cup-24',route=>route.fulfill({json:snapshot.leaderboard.map(row=>({...row,tournamentId:'daily-cup-24'}))}));
 await page.goto('/team/tournaments/daily-cup-24?scenario=room-ready');
 await expect(page.locator('.command-result-art')).toHaveCount(rounds.length);
 await expect(page.locator('.command-performance-stats')).toBeVisible();
 for (const width of [320,360,390,430,768,1024,1280,1440]) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`populated results overflow at ${width}`).toBe(true);
  if ([390,768,1440].includes(width)) {
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await page.screenshot({path:`test-results/command-populated-${width}.png`});
  }
 }
 await page.locator('#results').scrollIntoViewIfNeeded();
 await expect(page.locator('.command-result-art').first()).toBeVisible();
 expect(await page.locator('.command-result-art').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
 await page.screenshot({path:'test-results/command-map-results.png'});
 expect(failures).toEqual([]);
});
