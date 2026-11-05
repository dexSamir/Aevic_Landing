import {test,expect,type APIRequestContext} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {routeManifest} from '../../src/app/routeManifest';
const origin='http://127.0.0.1:4194', output='docs/reports/evidence/AEVIC-REMEDIATION-2026-11-05';
const headers={origin};
const password='IsolatedBrowser42';
const widths=[320,360,390,430,768,1024,1280,1440];
test('remediation: real authenticated 16-team lifecycle, corrections and rendered Admin review',async({page,browser})=>{
 test.setTimeout(480_000);page.setDefaultTimeout(12_000);mkdirSync(output,{recursive:true});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const timings:{path:string;method:string;ms:number;status:number}[]=[];
 async function api(request:APIRequestContext,path:string,method='GET',data?:unknown,key?:string){const start=Date.now();const r=await request.fetch('/api'+path,{method,headers:{...headers,...(key?{'idempotency-key':key}:{})},data});timings.push({path,method,ms:Date.now()-start,status:r.status()});expect(r.ok(),`${method} ${path}: ${await r.text()}`).toBe(true);return r.status()===204?undefined:r.json();}
 for(const path of ['/leaderboard','/leaderboard/']){await page.goto(path);await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('.route-error')).toHaveCount(0);await page.reload();await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('.route-error')).toHaveCount(0);await page.getByRole('link',{name:'Ana səhifə',exact:true}).first().click();await page.goBack();await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('.route-error')).toHaveCount(0);}
 await page.goto('/admin/login');await page.getByLabel('E-poçt',{exact:true}).fill('admin@example.invalid');await page.getByLabel('Şifrə',{exact:true}).fill(password);await page.getByRole('button',{name:'Admin panelini aç',exact:true}).click();await expect(page).toHaveURL(/\/admin$/);
 await page.goto('/admin/tournaments/new');await page.getByLabel('Turnir adı',{exact:true}).fill('[QA-2026-11] Local Remediation Cup');await page.getByLabel('Qısa ad',{exact:true}).fill('QA Retest');await page.getByLabel('Təsvir',{exact:true}).fill('Isolated local QA; synthetic scores, no real competition.');
 console.log('QA: authenticated admin; creating tournament');
 const base=Math.ceil(Date.now()/60000)*60000;
 const iso=(offset:number)=>new Date(base+offset*60000).toISOString();
 const local=(value:string)=>{const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
 const times={startsAt:iso(5),endsAt:iso(20),registrationOpensAt:iso(-10),registrationDeadline:iso(1),checkInOpensAt:iso(1),checkInClosesAt:iso(4)};
 for(const [name,value] of Object.entries(times))await page.locator(`[name="${name}"]`).fill(local(value));
 await page.getByLabel('Maksimum komanda sayı').fill('16');
 for(let i=1;i<=4;i++)await page.getByLabel(`${i}. raund başlayır`).fill(local(iso(4+i)));
 await page.locator('[name="rules"]').fill('Official international scoring; synthetic QA only.');
 let releaseSnapshot!:()=>void;
 const snapshotGate=new Promise<void>(resolve=>releaseSnapshot=resolve);
 await page.route('**/api/admin/context',async route=>{await snapshotGate;await route.continue();});
 const created=page.waitForResponse(r=>r.url().endsWith('/api/admin/tournaments')&&r.request().method()==='POST');await page.getByRole('button',{name:'Qaralama turnir yarat'}).click();const createResponse=await created;expect(createResponse.status()).toBe(201);let tournament=await createResponse.json();const id=tournament.id;
 await expect(page).toHaveURL(new RegExp(`/admin/tournaments/${id}$`));await expect(page.getByRole('heading',{name:tournament.name,exact:true})).toBeVisible();await expect(page.getByText('Yanlış turnir ünvanı')).toHaveCount(0);await expect(page.getByRole('button',{name:'Dəyişiklikləri saxla',includeHidden:true})).toBeDisabled();releaseSnapshot();await page.unrouteAll({behavior:'wait'});
 let snapshot=await api(page.request,'/admin/context');const rounds=snapshot.matchSchedule.filter((m:any)=>m.tournamentId===id).sort((a:any,b:any)=>a.round-b.round);
 async function update(status:string){const body={name:tournament.name,shortName:tournament.shortName,description:tournament.description,...times,maxSlots:16,rules:tournament.rules,status,expectedUpdatedAt:tournament.updatedAt,rounds:rounds.map((r:any)=>({id:r.id,map:r.map,startsAt:r.startsAt}))};const key=crypto.randomUUID();tournament=await api(page.request,`/admin/tournaments/${id}`,'PATCH',body,key);const replay=await api(page.request,`/admin/tournaments/${id}`,'PATCH',body,key);expect(replay.updatedAt).toBe(tournament.updatedAt);}
 await update('published');await update('registration-open');
 console.log('QA: tournament created and opened');
 const contexts=[];
 for(let i=0;i<17;i++){const c=await browser.newContext({baseURL:origin,extraHTTPHeaders:{'x-nf-client-connection-ip':`198.51.100.${100+i}`}});contexts.push(c);await api(c.request,'/auth/login','POST',{email:`captain${201+i}@example.invalid`,password});}
 const participant=contexts[0];
 const captainPage=await participant.newPage();captainPage.setDefaultTimeout(12_000);await captainPage.goto(`/tournaments/${id}`);await captainPage.getByRole('button',{name:'İştirak et',exact:true}).click();const joined=captainPage.waitForResponse(r=>r.url().endsWith(`/tournaments/${id}/entries`)&&r.request().method()==='POST');await captainPage.getByRole('dialog').getByRole('button',{name:'Turnirə qoşul',exact:true}).click();expect((await joined).ok()).toBe(true);await expect(captainPage.getByRole('dialog')).toHaveCount(0);
 for(let i=1;i<16;i++)await api(contexts[i].request,`/tournaments/${id}/entries`,'POST',{teamId:String(201+i)});
 const duplicate=await api(participant.request,`/tournaments/${id}/entries`,'POST',{teamId:'201'});expect(duplicate.duplicate).toBe(true);
 expect((await contexts[16].request.post(`/api/tournaments/${id}/entries`,{headers,data:{teamId:'217'}})).status()).toBe(409);
 for(let i=0;i<16;i++)await api(page.request,`/admin/tournaments/${id}/entries/${201+i}`,'PATCH',{status:'confirmed'});
 const entries=await api(page.request,`/admin/tournaments/${id}/entries`);expect(entries).toHaveLength(16);expect(new Set(entries.map((e:any)=>e.slotNumber)).size).toBe(16);
 console.log('QA: 16 authenticated registrations confirmed');
 const verification=await api(participant.request,'/verifications','POST',{entityType:'TEAM',entityId:'201',representativeName:'QA Captain',officialSocials:{website:'https://example.invalid/qa'},notes:'Isolated local verification regression only.'},crypto.randomUUID());
 const roster=await api(participant.request,'/roster-requests','POST',{teamId:'201',tournamentId:id,outgoing:{id:'201:player4',ign:'Four',role:'starter'},incoming:{ign:'QA Reserve',uid:'9990001234',role:'starter'},reason:'Isolated QA roster review evidence.'});
 await api(page.request,`/admin/roster-requests/${roster.id}`,'PATCH',{status:'rejected',note:'QA request reviewed; roster preserved.'});
 await api(page.request,'/admin/messages','POST',{title:'Local QA announcement',body:'Isolated fixture recipients only.',severity:'info',audience:'all'});expect((await api(contexts[1].request,'/me/messages')).some((m:any)=>m.title==='Local QA announcement')).toBe(true);
 const ticket=await api(participant.request,'/me/support/tickets','POST',{category:'technical',subject:'QA local support',description:'Isolated support lifecycle regression.'});
 await api(page.request,`/admin/support/tickets/${ticket.id}/messages`,'POST',{body:'QA staff response.'});await api(participant.request,`/me/support/tickets/${ticket.id}/messages`,'POST',{body:'QA captain confirmation.'});await api(page.request,`/admin/support/tickets/${ticket.id}/status`,'PATCH',{status:'resolved'});
 await page.goto('/admin/support');await page.getByLabel('Status',{exact:true}).selectOption('resolved');await expect(page.getByText('QA local support',{exact:true})).toBeVisible();await page.getByLabel('Status',{exact:true}).selectOption('open');await expect(page.getByText('QA local support',{exact:true})).toHaveCount(0);
 const prefs=await api(participant.request,'/me/notification-preferences');await api(participant.request,'/me/notification-preferences','PUT',{...prefs,events:{...prefs.events,results:false}});expect((await api(participant.request,'/me/notification-preferences')).events.results).toBe(false);
 for(const round of rounds)await api(page.request,`/admin/matches/${round.id}/room`,'PUT',{roomId:'LOCAL-QA-ROOM',password:'LOCAL-QA-PASSWORD'});
 const roomPath=`/team/tournaments/${id}/rounds/${rounds[0].id}/room`;
 expect((await participant.request.get('/api'+roomPath)).status()).toBe(403);expect((await contexts[16].request.get('/api'+roomPath)).status()).toBe(403);
 // Let the actual registration/check-in boundary pass while reviewing mobile navigation.
 for(const width of widths){await page.setViewportSize({width,height:900});await page.goto(`/admin/tournaments/${id}`);await expect(page.locator('main h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);if(width<=1024){await page.getByRole('button',{name:'Naviqasiyanı aç'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);}}
 await expect.poll(()=>Date.now(),{timeout:120_000,intervals:[1000]}).toBeGreaterThanOrEqual(Date.parse(times.checkInOpensAt));
 await captainPage.goto(`/team/tournaments/${id}`);await captainPage.getByRole('button',{name:'Check-in et',exact:true}).first().click();await captainPage.getByRole('button',{name:'Bəli, hazırıq',exact:true}).click();await expect(captainPage.getByRole('dialog')).toHaveCount(0);await captainPage.getByRole('button',{name:'Otaq statusunu yoxla'}).click();await expect(captainPage.getByRole('button',{name:'Göstər',exact:true})).toBeVisible();await captainPage.getByRole('button',{name:'Göstər',exact:true}).click();await expect(captainPage.getByRole('button',{name:'Gizlət',exact:true})).toHaveAttribute('aria-pressed','true');await captainPage.getByRole('button',{name:'Gizlət',exact:true}).click();
 for(let i=1;i<16;i++)await api(contexts[i].request,`/tournaments/${id}/check-in`,'POST');await api(participant.request,`/tournaments/${id}/check-in`,'POST');
 expect((await api(participant.request,roomPath)).status).toBe('released');
 console.log('QA: actual check-in window passed; all checked in');
 await update('ongoing');
 const expectedRows:{teamId:string;round:number;placement:number;finishes:number;penalties:number;points:number}[]=[];
 const expected=new Map<string,number>();const formula=[10,6,5,4,3,2,1,1];
 for(let r=0;r<rounds.length;r++){
  for(let i=0;i<16;i++){const placement=((i+r)%16)+1,finishes=(i*3+r)%9,penalties=i===3&&r===1?2:0;const result={tournamentId:id,roundId:rounds[r].id,teamId:String(201+i),placement,finishes,penalties,placementPoints:999,finishPoints:999,totalPoints:999,published:false};if(r===0&&i===0){await page.goto('/admin/results');await page.getByLabel('Turnir',{exact:true}).selectOption(id);await page.getByLabel('Raund',{exact:true}).selectOption(rounds[r].id);await page.getByLabel('Komanda',{exact:true}).selectOption(result.teamId);await page.getByLabel('Yerləşmə',{exact:true}).fill(String(placement));await page.getByLabel('Kill sayı',{exact:true}).fill(String(finishes));await page.getByLabel('Cərimə xalı',{exact:true}).fill(String(penalties));await page.getByRole('button',{name:'Komanda nəticəsini saxla'}).click();await expect(page.getByText('Komanda nəticəsi saxlanıldı.',{exact:false})).toBeVisible();}else await api(page.request,'/admin/results','POST',result);expectedRows.push({teamId:result.teamId,round:r+1,placement,finishes,penalties,points:(formula[placement-1]||0)+finishes-penalties});expected.set(result.teamId,(expected.get(result.teamId)||0)+(formula[placement-1]||0)+finishes-penalties);if(i===0)expect((await page.request.post(`/api/admin/matches/${rounds[r].id}/publication`,{headers})).status()).toBe(409);}
  if(r===0){await page.getByRole('button',{name:'Bütün raund nəticələrini dərc et'}).click();await expect(page.getByText('Raundun bütün nəticələri dərc edildi.',{exact:true})).toBeVisible();}else await api(page.request,`/admin/matches/${rounds[r].id}/publication`,'POST');await api(page.request,`/admin/matches/${rounds[r].id}/publication`,'POST');
 }
 console.log('QA: all 64 results published');
 const standings=await api(participant.request,`/leaderboards/${id}`);expect(standings).toHaveLength(16);for(const row of standings)expect(row.totalPoints).toBe(expected.get(row.teamId));
 const independentOrder=(correction=0)=>Array.from(expected.keys()).map(teamId=>{const rows=expectedRows.filter(r=>r.teamId===teamId);return {teamId,total:expected.get(teamId)!+(teamId==='201'?correction:0),wwcd:rows.filter(r=>r.placement===1).length,placementPoints:rows.reduce((n,r)=>n+(formula[r.placement-1]||0),0),finishes:rows.reduce((n,r)=>n+r.finishes,0)+(teamId==='201'?correction:0),last:rows[rows.length-1].placement};}).sort((a,b)=>b.total-a.total||b.wwcd-a.wwcd||b.placementPoints-a.placementPoints||b.finishes-a.finishes||a.last-b.last).map(r=>r.teamId);expect(standings.map((r:any)=>r.teamId)).toEqual(independentOrder());
 const rows=await api(page.request,`/admin/results?roundId=${rounds[0].id}`);const result=rows.find((r:any)=>r.teamId==='201');
 expect((await participant.request.get(`/api/admin/results/${result.id}`)).status()).toBe(403);expect((await participant.request.post(`/api/admin/results/${result.id}/corrections`,{headers,data:{}})).status()).toBe(403);
 const dispute=await api(participant.request,'/disputes','POST',{teamId:'201',tournamentId:id,matchId:rounds[0].id,issueType:'penalty',description:'QA correction and review coverage.'});await api(page.request,`/admin/disputes/${dispute.id}`,'PATCH',{status:'rejected',note:'Synthetic QA review; correction separately verified.'});
 await page.goto(`/admin/results/${result.id}/correct`);await expect(page.getByText('Cari versiya: 1')).toBeVisible();
 for(let version=2;version<=3;version++){await page.getByLabel('Kill',{exact:true}).fill(String(version+3));await page.getByLabel('Düzəliş səbəbi').fill(`QA verified correction version ${version}`);await page.getByRole('button',{name:'Yeni versiyanı saxla'}).click();await expect(page.getByText(`Cari versiya: ${version}`)).toBeVisible();}
 await page.reload();await expect(page.getByText('Cari versiya: 3')).toBeVisible();expect(await api(page.request,`/admin/results/${result.id}/versions`)).toHaveLength(2);
 expect((await api(participant.request,'/me/notifications')).filter((n:any)=>n.eventType==='map-result')).toHaveLength(0);expect((await api(contexts[1].request,'/me/notifications')).filter((n:any)=>n.eventType==='map-result')).toHaveLength(6);
 const corrected=await api(participant.request,`/leaderboards/${id}`);expect(corrected.find((r:any)=>r.teamId==='201').totalPoints).toBe(expected.get('201')!+6);
 expect(corrected.map((r:any)=>r.teamId)).toEqual(independentOrder(6));
 await update('completed');
 const teamSnapshot=await api(participant.request,'/me/context');expect(teamSnapshot.participations.find((p:any)=>p.tournamentId===id).resultPlacement).toBe(corrected.find((r:any)=>r.teamId==='201').placement);
 expect((await participant.request.get('/api'+roomPath)).status()).toBe(403);
 const acceptedRoster=await api(participant.request,'/roster-requests','POST',{teamId:'201',outgoing:{id:'201:player4',ign:'Four',role:'starter'},incoming:{ign:'QA Reserve',uid:'9990001234',role:'starter'},reason:'Completed event permits this QA roster update.'});await api(page.request,`/admin/roster-requests/${acceptedRoster.id}`,'PATCH',{status:'approved',note:'Approved after completed QA event.'});
 const guest=await browser.newContext({baseURL:origin});const publicPage=await guest.newPage();await publicPage.goto(`/tournaments/${id}`);await expect(publicPage.getByRole('button',{name:/Daxil ol və qoşul/})).toHaveCount(0);await publicPage.screenshot({path:`${output}/completed-public.png`,fullPage:true});
 for(const index of [0,12]){const edgePage=await contexts[index].newPage();await edgePage.goto(`/team/tournaments/${id}`);await expect(edgePage.locator('.command-table-preview tbody tr')).toHaveCount(5);await expect(edgePage.locator('.command-table-preview .is-own-team')).toHaveCount(1);await edgePage.screenshot({path:`${output}/standings-edge-${index===0?'top':'bottom'}.png`,fullPage:true});await edgePage.close();}
 const userPage=await participant.newPage();await userPage.goto('/team/history');await expect(userPage.getByText('Yekun yer',{exact:true})).toBeVisible();await userPage.screenshot({path:`${output}/team-history.png`,fullPage:true});
 console.log('QA: corrections and completion verified');
 await userPage.goto(`/team/sharecards?tournament=${id}&type=leaderboard`);await expect(userPage.getByRole('button',{name:'PNG yüklə',exact:true})).toBeEnabled();
 for(const limit of ['10','16','all']){await userPage.getByLabel('Komanda sayı').selectOption(limit);const download=userPage.waitForEvent('download');await userPage.getByRole('button',{name:'PNG yüklə',exact:true}).click();await (await download).saveAs(`${output}/corrected-leaderboard-${limit}.png`);}
 const measurements=[];const ids:Record<string,string>={tournamentId:id,teamId:'201',resultId:result.id,requestId:roster.id,disputeId:dispute.id,playerId:'pubg-9990001234',verificationId:verification.id};
 const routes=routeManifest.filter(r=>r.path.startsWith('/admin')&&r.path!=='/admin/login').map(r=>r.path.replace(/:(\w+)/g,(_,key)=>ids[key]));
 for(const path of routes){console.log('QA render:',path);await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();for(const width of widths){await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);measurements.push({path,width,overflow,title:await page.locator('main h1').first().innerText()});expect.soft(overflow,`${path} @ ${width}`).toBeLessThanOrEqual(1);await page.screenshot({path:`${output}/admin-${width}-${path.replaceAll('/','_')}.png`,fullPage:true,animations:'disabled'});}}
 writeFileSync(`${output}/local-lifecycle.json`,JSON.stringify({environment:'isolated real local PostgreSQL and app; synthetic fixture accounts; no deployed mutation',tournamentId:id,participants:16,rounds:4,resultRows:64,correctionVersions:3,expectedRows,standings,corrected,timings,measurements,errors},null,2));expect(errors).toEqual([]);
 await guest.close();for(const context of contexts)await context.close();
});

test('Admin loading geometry, recovery, keyboard and accessibility use the ready frame',async({browser})=>{
 const context=await browser.newContext({baseURL:origin});const login=await context.request.post('/api/auth/admin/login',{headers:{origin,'x-nf-client-connection-ip':'198.51.100.240'},data:{email:'admin@example.invalid',password}});expect(login.ok()).toBe(true);
 const page=await context.newPage();page.setDefaultTimeout(12_000);await page.emulateMedia({reducedMotion:'reduce'});
 let releaseSession!:()=>void,releaseContext!:()=>void;const sessionGate=new Promise<void>(r=>releaseSession=r),contextGate=new Promise<void>(r=>releaseContext=r);
 await page.route('**/api/me/session',async route=>{await sessionGate;await route.continue();});await page.route('**/api/admin/context',async route=>{await contextGate;await route.continue();});
 await page.goto('/admin/tournaments');await expect(page.locator('.product-shell--admin[aria-busy="true"]')).toBeVisible();
 const loading=await page.locator('#main-content').boundingBox();releaseSession();await expect(page.locator('[data-protected-area="admin"]')).toBeAttached();const resolving=await page.locator('#main-content').boundingBox();expect(resolving?.x).toBe(loading?.x);expect(resolving?.width).toBe(loading?.width);releaseContext();await expect(page.getByRole('heading',{name:'Turnirlər',exact:true})).toBeVisible();const ready=await page.locator('#main-content').boundingBox();expect(ready?.x).toBe(loading?.x);expect(ready?.width).toBe(loading?.width);
 const {readFileSync}=await import('node:fs');const axe=readFileSync(process.env.AEVIC_AXE_SOURCE||'/tmp/aevic-remediation-tools/node_modules/axe-core/axe.min.js','utf8');
 const scans=[];
 for(const path of ['/admin/tournaments','/admin/tournaments/new','/admin/users','/admin/settings','/admin/roster-requests','/admin/legacy-claims']){
  await page.goto(path);await expect(page.locator('main h1')).toBeVisible();await page.evaluate(axe);const scan=await page.evaluate(async()=>await(window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));scans.push({path,violations:scan.violations});expect.soft(scan.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})),path).toEqual([]);
 }
 await page.setViewportSize({width:320,height:740});await page.goto('/admin/users');await expect(page.locator('main h1')).toBeVisible();await page.getByRole('button',{name:'Naviqasiyanı aç'}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Naviqasiyanı aç'})).toBeFocused();
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 writeFileSync(`${output}/accessibility-and-loading.json`,JSON.stringify({loading,resolving,ready,scans},null,2));await context.close();
});
