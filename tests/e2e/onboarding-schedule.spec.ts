import {test,expect} from '../helpers/api-fixture-test';
import {currentTeam} from '../fixtures/platform-data';

test('three Baku dates, optional banner and wizard persistence work on mobile and desktop',async({page})=>{
 let payload:any;
 await page.route('**/api/public/site-content',route=>route.fulfill({json:{}}));
 await page.route('**/api/admin/tournament-banners',route=>route.fulfill({json:{id:'11111111-1111-4111-8111-111111111111',url:'/api/media/tournament-banners/11111111-1111-4111-8111-111111111111'}}));
 await page.route('**/api/media/tournament-banners/*',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="500"><rect width="1600" height="500" fill="#343438"/></svg>'}));
 await page.route('**/api/admin/tournaments',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:201,json:{id:'created-cup',...payload}});});
 await page.goto('/admin/tournaments/new');
 await page.getByLabel('Turnir adı',{exact:true}).fill('AEVIC Schedule Cup');await page.getByLabel('Qısa ad',{exact:true}).fill('ASC');
 await page.locator('input[type=file]').setInputFiles({name:'banner.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=','base64')});
 await expect(page.getByRole('button',{name:'Banneri sil',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Davam et',exact:true}).click();await page.getByRole('button',{name:'Davam et',exact:true}).click();
 await expect(page.locator('.schedule-editor__essential .schedule-date-trigger')).toHaveCount(3);
 await expect(page.locator('input[type=datetime-local],input[type=date],input[type=time]')).toHaveCount(0);
 await page.clock.setFixedTime(new Date('2026-12-01T16:00:00Z'));
 async function pick(label:string,day:string,hour:string,previous=false){await page.getByRole('button',{name:label,exact:true}).click();const dialog=page.getByRole('dialog',{name:label,exact:true});if(previous)await dialog.getByRole('button',{name:'Əvvəlki ay'}).click();await dialog.locator(`[data-day="${day}"] button`).click();await page.getByLabel(`${label} · vaxt`).fill(hour+':00');await expect(dialog).not.toBeVisible();}
 await pick('Turnirin başlanğıcı','2026-12-01','20');await pick('Qeydiyyat açılır','2026-11-30','20',true);await pick('Qeydiyyat bağlanır','2026-12-01','19');
 await expect(page.locator('.schedule-editor__zone').getByText('Asia/Baku · UTC+4')).toBeVisible();
 for(const [width,height] of [[1440,900],[390,844],[320,640]]){await page.setViewportSize({width,height});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 for(const [width,height] of [[1440,900],[390,844],[320,640]]){
  await page.setViewportSize({width,height});
  const trigger=page.getByRole('button',{name:'Turnirin başlanğıcı',exact:true});await trigger.click();const dialog=page.getByRole('dialog',{name:'Turnirin başlanğıcı',exact:true});
  await expect(dialog.locator('[data-day="2026-12-01"] button')).toBeFocused();
  await dialog.locator('[data-day="2026-12-01"] button').press('ArrowRight');await expect(dialog.locator('[data-day="2026-12-02"] button')).toBeFocused();
  await dialog.locator('[data-day="2026-12-02"] button').press('PageDown');await expect(dialog.locator('[data-day="2027-01-02"] button')).toBeFocused();
  const box=await dialog.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.y+box!.height).toBeLessThanOrEqual(height+1);
  await page.screenshot({path:`/tmp/aevic-picker-open-${width}.png`,animations:'disabled'});
  expect(await dialog.locator('.rdp-root').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth,root:el.clientWidth,table:el.querySelector('table')?.clientWidth,month:el.querySelector('.rdp-months')?.clientWidth}))).toMatchObject({overflow:false});
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();await expect(page.getByLabel('Turnirin başlanğıcı · vaxt')).toHaveValue('20:00');
 }
 await page.setViewportSize({width:1440,height:900});const trigger=page.getByRole('button',{name:'Turnirin başlanğıcı',exact:true});await trigger.click();await expect(page.locator('.schedule-picker-popover')).toBeVisible();await page.mouse.click(2,2);await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('button',{name:'Geri',exact:true}).click();await page.getByRole('button',{name:'Davam et',exact:true}).click();
 await expect(page.getByLabel('Turnirin başlanğıcı · vaxt')).toHaveValue('20:00');
 await expect(page.getByLabel('2. raund başlayır · vaxt')).toHaveValue('20:50');
 await page.getByRole('button',{name:'Davam et',exact:true}).click();
 for(const [width,height] of [[1440,900],[390,844],[320,640]]){await page.setViewportSize({width,height});const scoring=page.getByRole('region',{name:'Yerləşmə xalları'});await expect(scoring.locator('dt')).toHaveCount(16);await expect(scoring.locator('dd')).toHaveCount(16);expect(await scoring.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('button',{name:'Davam et',exact:true}).click();await page.getByRole('button',{name:'Qaralama turnir yarat'}).click();
 await expect.poll(()=>payload?.name).toBe('AEVIC Schedule Cup');expect(payload.startsAt).toBe('2026-12-01T16:00:00.000Z');expect(payload.checkInOpensAt).toBe(payload.registrationDeadline);expect(payload.checkInClosesAt).toBe(payload.startsAt);expect(payload.bannerMediaId).toBe('11111111-1111-4111-8111-111111111111');expect(payload.rounds).toHaveLength(4);
});

test('team setup resumes from backend progress and clears its persistent action after completion',async({page})=>{
 let state:any={purpose:'team',status:'team',revision:0,draft:{}},complete=false;
 const user={...currentTeam.captain,id:'onboarding-account',teamId:undefined,role:'visitor',onboarding:{purpose:'team',status:'team'}};
 await page.route('**/api/me/session',route=>route.fulfill({json:{role:complete?'captain':'visitor',user:{...user,teamId:complete?currentTeam.id:undefined,onboarding:{purpose:'team',status:complete?'complete':'team'}}}}));
 await page.route('**/api/me/onboarding',async route=>{if(route.request().method()==='PUT'){const body=route.request().postDataJSON();state={...state,...body,revision:state.revision+1};}await route.fulfill({json:state});});
 await page.route('**/api/me/onboarding/team',async route=>{expect(route.request().postDataJSON().teamName).toBe('New Real Team');complete=true;state={...state,status:'complete',draft:{},teamId:currentTeam.id};await route.fulfill({status:201,json:{teamId:currentTeam.id}});});
 await page.goto('/tournaments');await expect(page.getByRole('link',{name:'Komanda quruluşunu tamamla'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});const reminder=await page.getByRole('link',{name:'Komanda quruluşunu tamamla'}).boundingBox();expect(reminder!.y+reminder!.height).toBeLessThan(780);
 await page.getByRole('link',{name:'Komanda quruluşunu tamamla'}).click();
 await page.getByLabel('Komanda adı',{exact:true}).fill('New Real Team');await page.getByRole('button',{name:'Davam et',exact:true}).click();
 expect(state.draft.teamName).toBe('New Real Team');await page.reload();await expect(page.getByRole('heading',{name:'Əsas heyət',exact:true})).toBeVisible();
 await page.getByLabel('Ad',{exact:true}).fill('Captain');await page.getByLabel('Soyad',{exact:true}).fill('Name');await page.getByLabel('Əlaqə telefonu',{exact:true}).fill('+994500000000');
 for(let i=0;i<4;i++){await page.getByLabel(i===0?'Kapitan IGN':`${i+1}. oyunçu IGN`,{exact:true}).fill(`Player ${i+1}`);await page.getByLabel(`${i+1}. oyunçu PUBG ID`,{exact:true}).fill(`123456${i}`);}
 for(const [width,height] of [[1440,900],[390,844],[812,375]]){await page.setViewportSize({width,height});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/aevic-team-setup-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Davam et',exact:true}).click();await page.getByText('Məlumatların düzgünlüyünü və yarış qaydalarını təsdiqləyirəm',{exact:true}).click();await page.getByRole('button',{name:'Komandanı yarat',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Komandanın quruluşu tamamlandı'})).toBeVisible();await expect(page.locator('.onboarding-reminder')).toHaveCount(0);
 await page.reload();await expect(page.getByRole('heading',{name:'Komandanın quruluşu tamamlandı'})).toBeVisible();
});

test('email spectator registration is compact and Google account choice needs no duplicate identity',async({page})=>{
 let session:any=null,payload:any,state:any={purpose:null,status:'choice',revision:0,draft:{}};
 await page.route('**/api/me/session',route=>route.fulfill({headers:{'X-Aevic-Session-Mode':'legacy'},contentType:'application/json',body:JSON.stringify(session)}));await page.route('**/api/auth/google/status',route=>route.fulfill({json:{enabled:true}}));
 await page.route('**/api/auth/register',async route=>{payload=route.request().postDataJSON();session={role:'visitor',user:{...currentTeam.captain,id:'spectator-account',teamId:undefined,role:'visitor',onboarding:{purpose:'spectator',status:'complete'}}};await route.fulfill({status:201,json:{...session,sessionMode:'legacy'}});});
 await page.goto('/register');await expect(page.getByRole('heading',{name:'AEVIC-ə qoşul'})).toBeVisible();
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[375,812]]){await page.setViewportSize({width,height});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>document.documentElement.style.fontSize='');
 await page.screenshot({path:'/tmp/aevic-register-mobile.png',fullPage:true});
 await page.getByText('İzləyici kimi davam et',{exact:true}).click();for(const [label,value] of [['Ad','Viewer'],['Soyad','Name'],['E-poçt','viewer@example.invalid'],['Şifrə','ValidPassword1'],['Şifrəni təkrarla','ValidPassword1']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByText('İstifadə şərtlərini və məxfilik qaydalarını qəbul edirəm',{exact:true}).click();await page.getByRole('button',{name:'Hesab yarat',exact:true}).click();await expect.poll(()=>payload?.purpose).toBe('spectator');expect(payload).not.toHaveProperty('teamName');await expect(page.locator('.onboarding-reminder')).toHaveCount(0);
 session={...session,user:{...session.user,onboarding:{purpose:null,status:'choice'}}};
 await page.route('**/api/me/onboarding',async route=>{if(route.request().method()==='PUT'){state={...state,...route.request().postDataJSON(),status:'complete'};session.user.onboarding={purpose:'spectator',status:'complete'};}await route.fulfill({json:state});});
 await page.goto('/account/onboarding');await expect(page.getByRole('heading',{name:'Öz yolunu seç'})).toBeVisible();await expect(page.getByLabel('E-poçt',{exact:true})).toHaveCount(0);await page.getByText('İzləyici kimi davam et',{exact:true}).click();await page.getByRole('button',{name:'Davam et',exact:true}).click();await expect(page).toHaveURL('/');expect(state.purpose).toBe('spectator');
});

test('the existing tournament editor saves presentation changes without losing locked schedule or round identities',async({page})=>{
 const {fixtureServices}=await import('../fixtures/component-services');
 const snapshot=await fixtureServices.snapshots.admin();
 const original={...snapshot.tournaments[0],updatedAt:'2026-08-01T12:00:00Z',bannerMediaId:'11111111-1111-4111-8111-111111111111',bannerUrl:'/api/media/tournament-banners/11111111-1111-4111-8111-111111111111'};
 snapshot.tournaments[0]=original;let payload:any;
 await page.route('**/api/admin/context',route=>route.fulfill({json:snapshot}));
 await page.route('**/api/media/tournament-banners/*',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="500"/>'}));
 await page.route(`**/api/admin/tournaments/${original.id}`,async route=>{payload=route.request().postDataJSON();snapshot.tournaments[0]={...original,...payload};await route.fulfill({json:snapshot.tournaments[0]});});
 await page.clock.setFixedTime(new Date('2026-08-04T20:55:00+04:00'));
 await page.goto(`/admin/tournaments/${original.id}`);await page.getByRole('button',{name:'Konfiqurasiya',exact:true}).click();await page.getByText('Turniri redaktə et',{exact:true}).click();
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('Turnir adı',{exact:true}).fill('Updated AEVIC Cup');await page.getByRole('button',{name:'Banneri sil',exact:true}).click();
 await page.getByRole('button',{name:'Dəyişiklikləri saxla',exact:true}).click();
 await expect.poll(()=>payload?.name).toBe('Updated AEVIC Cup');expect(payload.bannerMediaId).toBeNull();expect(payload.expectedUpdatedAt).toBe(original.updatedAt);
 expect(payload.startsAt).toBe(original.startsAt);
 expect(payload.rounds.map((r:any)=>r.id)).toEqual(snapshot.matchSchedule!.filter(m=>m.tournamentId===original.id).sort((a,b)=>a.round-b.round).map(m=>m.id));
 await page.goto('/admin/tournaments?view=calendar');await expect(page.locator('.admin-agenda-event').filter({hasText:'Updated AEVIC Cup'}).first()).toBeVisible();
});

test('retired Site Management has no Admin link or hidden editing route',async({page})=>{
 await page.route('**/api/public/site-content',route=>route.fulfill({json:{}}));
 await page.goto('/admin/tournaments');await expect(page.getByRole('heading',{name:'Turnirlər',exact:true})).toBeVisible();
 await expect(page.locator('a[href="/admin/site"]')).toHaveCount(0);
 await page.goto('/admin/site');await expect(page.getByRole('heading',{name:'Bu səhifə yarış cədvəlində yoxdur'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Qaralamanı saxla'})).toHaveCount(0);
});
