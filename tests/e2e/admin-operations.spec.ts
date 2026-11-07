import { test, expect } from '../helpers/api-fixture-test';
import { fixtureServices } from '../fixtures/component-services';

test('results selection, round workspace and review adapt at 320, 390, 768 and desktop',async({page})=>{
 await page.route('**/api/public/site-content',route=>route.fulfill({json:{}}));
 await page.route('**/api/admin/tournaments/daily-cup-24/entries',route=>route.fulfill({json:[{teamId:'team-01',status:'confirmed'},{teamId:'team-02',status:'confirmed'}]}));
 await page.goto('/admin/results');
 await page.getByRole('button',{name:'Turnir seçin',exact:true}).click();
 await page.getByRole('combobox',{name:'Turnir axtar'}).fill('Daily');
 await page.getByRole('combobox',{name:'Turnir axtar'}).press('Enter');
 await page.getByRole('navigation',{name:'Raundlar'}).getByRole('button').first().click();
 await expect(page.getByRole('heading',{name:'Komanda nəticələri'})).toBeVisible();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('button',{name:'Raundu dərc et'})).toBeDisabled();
  if(width===1440)await page.screenshot({path:'/tmp/aevic-results-desktop.png',fullPage:true});
 }
 await page.getByRole('button',{name:'Şəkilləri əlavə et'}).click();
 await page.getByRole('button',{name:'Çatışmayan komandaları əlavə et'}).click();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const region=page.getByRole('region',{name:'OCR nəticələrinin yoxlaması'});await expect(region).toBeVisible();
  if(width===390)await page.screenshot({path:'/tmp/aevic-results-mobile.png',fullPage:true});
 }
 await page.getByLabel('Yerləşmə, sətir 1',{exact:true}).fill('1');await page.getByLabel('Kill, sətir 1',{exact:true}).fill('0');
 await page.getByLabel('Yerləşmə, sətir 2',{exact:true}).fill('1');await page.getByLabel('Kill, sətir 2',{exact:true}).fill('2');
 await expect(page.getByRole('checkbox')).toBeDisabled();
 await page.getByLabel('Yerləşmə, sətir 2',{exact:true}).fill('2');await expect(page.getByRole('checkbox')).toBeEnabled();
 await page.getByRole('button',{name:'Saxlamadan bağla'}).click();
 await page.getByRole('button',{name:'Əllə daxil et'}).click();
 await expect(page.getByRole('button',{name:/Turnir:/})).toBeDisabled();
 await page.getByRole('button',{name:'Bağla',exact:true}).click();await expect(page.getByRole('button',{name:/Turnir:/})).toBeEnabled();
});

test('calendar reuses actual dates, creates no record on clicks, and prefills existing Baku wizard',async({page})=>{
 const snapshot=await fixtureServices.snapshots.admin();
 const t=snapshot.tournaments[0];
 const writes:string[]=[];
 page.on('request',request=>{if(request.url().includes('/api/admin/')&&request.method()!=='GET')writes.push(request.url());});
 await page.route('**/api/public/site-content',route=>route.fulfill({json:{}}));
 await page.clock.setFixedTime(new Date(t.startsAt));
 await page.goto('/admin/tournaments?view=calendar');
 await expect(page.getByRole('region',{name:'Turnir təqvimi'})).toBeVisible();
 await expect(page.locator('.admin-calendar-event').filter({hasText:t.name}).first()).toBeVisible();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width===1440)await page.screenshot({path:'/tmp/aevic-calendar-desktop.png',fullPage:true});
 }
 await page.getByRole('button',{name:'Həftə',exact:true}).click();await expect(page.locator('.admin-calendar-day')).toHaveCount(7);
 await page.getByRole('button',{name:'Ay',exact:true}).click();await expect(page.locator('.admin-calendar-day')).toHaveCount(42);
 const day=page.locator('[data-admin-day]').filter({hasText:'15'}).first();const key=await day.getAttribute('data-admin-day');await day.click();
 await expect(page.getByRole('dialog')).toBeVisible();expect(writes).toEqual([]);
 await page.getByRole('dialog').getByRole('link',{name:'Turnir yarat',exact:true}).click();
 await page.getByLabel('Turnir adı',{exact:true}).fill('Calendar Cup');await page.getByLabel('Qısa ad',{exact:true}).fill('CC');
 await page.getByRole('button',{name:'Davam et',exact:true}).click();await page.getByRole('button',{name:'Davam et',exact:true}).click();
 await expect(page.locator('input[name=startsAt]')).toHaveValue(`${key}T20:00`);
 await expect(page.getByLabel('2. raund başlayır · vaxt')).toHaveValue('20:50');
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});const trigger=page.getByRole('button',{name:'Turnirin başlanğıcı',exact:true});await trigger.click();const dialog=page.getByRole('dialog',{name:'Turnirin başlanğıcı',exact:true});
  await expect(dialog.locator(`[data-day="${key}"] button`)).toBeFocused();
  const bounds=await dialog.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(901);
  await page.keyboard.press('Escape');await page.getByLabel('Turnirin başlanğıcı · vaxt').fill('20:17');await expect(page.getByLabel('Turnirin başlanğıcı · vaxt')).toHaveValue('20:17');
  await trigger.click();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
  if(width===390)await page.screenshot({path:'/tmp/aevic-picker-mobile.png',fullPage:true});
 }
 expect(writes).toEqual([]);
 // Finish the same wizard through its existing creation endpoint.
 const previous=new Date(`${key}T12:00:00Z`);previous.setUTCDate(previous.getUTCDate()-1);
 for(const [label,date,hour] of [['Qeydiyyat açılır',previous.toISOString().slice(0,10),'20'],['Qeydiyyat bağlanır',key!,'19']]){
  await page.getByRole('button',{name:label,exact:true}).click();const picker=page.getByRole('dialog',{name:label,exact:true});
  await picker.locator(`[data-day="${date}"] button`).click();await page.getByLabel(`${label} · vaxt`).fill(hour+':00');
 }
 let created:any;
 await page.route('**/api/admin/context',r=>r.fulfill({json:snapshot}));
 await page.route('**/api/admin/tournaments',async r=>{created=r.request().postDataJSON();const tournament={...t,...created,id:'calendar-cup',status:'draft'};snapshot.tournaments.push(tournament);await r.fulfill({status:201,json:tournament});});
 await page.getByRole('button',{name:'Davam et',exact:true}).click();await page.getByRole('button',{name:'Davam et',exact:true}).click();
 expect(writes).toEqual([]);await page.getByRole('button',{name:'Qaralama turnir yarat'}).click();
 await expect.poll(()=>created?.startsAt).toBe(new Date(`${key}T20:17:00+04:00`).toISOString());expect(created.rounds).toHaveLength(4);
 expect(writes).toHaveLength(1);await page.goto('/admin/tournaments?view=calendar');await expect(page.locator('.admin-calendar-event').filter({hasText:'Calendar Cup'}).first()).toBeVisible();
});

test('publication reflects backend rejection and success, prevents repeated writes and exposes corrections',async({page})=>{
 const snapshot=await fixtureServices.snapshots.admin();snapshot.publishedRoundIds={};snapshot.matchSchedule=snapshot.matchSchedule?.map(m=>({...m,publishedAt:undefined}));
 let published=false,calls=0;
 const row={id:'result-1',tournamentId:'daily-cup-24',roundId:'dc24-r1',teamId:'team-01',placement:1,finishes:5,penalties:0,placementPoints:10,finishPoints:5,totalPoints:15};
 await page.route('**/api/public/site-content',r=>r.fulfill({json:{}}));await page.route('**/api/admin/context',r=>r.fulfill({json:snapshot}));
 await page.route('**/api/admin/tournaments/daily-cup-24/entries',r=>r.fulfill({json:[{teamId:'team-01',status:'confirmed'}]}));
 await page.route('**/api/admin/results?*',r=>r.fulfill({json:[{...row,published,version:published?2:1}]}));
 await page.route('**/api/admin/matches/dc24-r1/publication',async r=>{calls++;if(calls===1)return r.fulfill({status:409,json:{code:'INCOMPLETE_RESULTS',message:'Nəticələr təsdiqlənmədi.'}});published=true;await r.fulfill({status:204});});
 await page.goto('/admin/results?tournament=daily-cup-24&round=dc24-r1');
 await page.getByRole('button',{name:'Raundu dərc et'}).click();await page.getByRole('button',{name:'Nəticələri dərc et',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Hər təsdiqlənmiş komandanın nəticəsini daxil edin.');expect(published).toBe(false);
 await page.getByRole('button',{name:'Nəticələri dərc et',exact:true}).dblclick();
 await expect(page.getByRole('link',{name:'Düzəliş et',exact:true})).toHaveAttribute('href','/admin/results/result-1/correct');
 await expect(page.getByRole('cell',{name:'Düzəliş edilib',exact:true})).toBeVisible();expect(calls).toBe(2);
 await expect(page.getByRole('button',{name:'Raundu dərc et'})).toBeDisabled();
});
