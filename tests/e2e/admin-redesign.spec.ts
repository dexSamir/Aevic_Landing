import { test, expect } from '../helpers/api-fixture-test';
import { adminAnalyticsFixture } from '../fixtures/admin-analytics';
import { fixtureServices } from '../fixtures/component-services';
import { routeManifest } from '../../src/app/routeManifest';
import type { AnalyticsRange } from '../../src/types/adminAnalytics';

const verification={id:'verification-fixture',entityType:'TEAM',entityId:'team-01',entityName:'Caspian Wolves',representativeName:'Fixture representative',officialSocials:{},evidenceNames:[],status:'PENDING',notes:'Fixture review',submittedAt:'2026-08-13T10:00:00Z'};
const result={id:'result-fixture',teamId:'team-01',tournamentId:'daily-cup-24',roundId:'dc24-r1',placement:1,finishes:5,placementPoints:10,finishPoints:5,penalties:0,totalPoints:15,published:true,version:1};
test.beforeEach(async({page})=>{
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname.slice(4);let value:unknown;
  if(path==='/admin/analytics')value=adminAnalyticsFixture((url.searchParams.get('range')??'30') as AnalyticsRange);
  else if(path==='/admin/settings')value={supportEmail:'support@example.invalid',registrationEnabled:true,maintenanceMessage:''};
  else if(path==='/admin/legacy-claims'||path==='/admin/legacy-teams')value=[];
  else if(path==='/admin/check-ins/missed')value={items:[],hasMore:false};
  else if(path==='/admin/verifications')value={items:[verification],hasMore:false};
  else if(path==='/admin/verifications/verification-fixture')value=verification;
  else if(path==='/admin/players/player-fixture')value={id:'player-fixture',slug:'player-fixture',ign:'Fixture Player',achievements:[],membershipHistory:[],tournamentHistory:[],eligibilityConflicts:[],sanctions:[],verification,claims:[]};
  else if(path==='/admin/results/result-fixture')value=result;
  else if(path==='/admin/results/result-fixture/versions')value=[];
  else if(path.endsWith('/room-readiness'))value=[{id:'dc24-r1',ready:true}];
  else return route.fallback();
  return route.fulfill({json:value});
 });
});
async function noOverflow(page:import('@playwright/test').Page,description:string){
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),{message:description}).toBeLessThanOrEqual(1);
}
test('dashboard uses one aggregate read, preserves lifetime totals, exposes keyboard data and refreshes ranges',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/api/'))requests.push(new URL(r.url()).pathname.slice(4)+new URL(r.url()).search);});
 await page.goto('/admin');await expect(page.locator('.admin-kpi')).toHaveCount(8);await expect(page.getByRole('heading',{name:'Turnir fəaliyyəti',exact:true})).toBeVisible();await expect(page.locator('.admin-chart__plot').first()).toBeVisible();
 await expect(page.locator('.admin-kpi').first()).toContainText('3');expect(requests.filter(x=>x==='/admin/context')).toHaveLength(0);expect(requests.filter(x=>x==='/me/session')).toHaveLength(1);
 const totals=await page.locator('.admin-kpi>strong').allTextContents();
 await page.getByRole('button',{name:'7 gün',exact:true}).click();await expect(page.getByRole('button',{name:'7 gün',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.admin-section-caption').nth(1)).toContainText('Son 7 gün');
 expect(await page.locator('.admin-kpi>strong').allTextContents()).toEqual(totals);
 const slider=page.getByRole('slider',{name:'Turnir fəaliyyəti: tarix seç'});await slider.focus();await page.keyboard.press('Home');await expect(slider).toHaveValue('0');await page.keyboard.press('ArrowRight');await expect(slider).toHaveValue('1');
 await page.locator('.admin-chart__data summary').first().click();await expect(page.locator('.admin-chart__data table').first()).toBeVisible();
 await page.getByRole('button',{name:'90 gün',exact:true}).click();await expect(page.locator('.admin-section-caption').nth(1)).toContainText('həftəlik');await page.getByRole('button',{name:'Bütün dövr',exact:true}).click();await expect(page.locator('.admin-section-caption').nth(1)).toContainText('aylıq');
 await page.getByRole('button',{name:'30 gün',exact:true}).click();await expect(page.locator('.admin-section-caption').nth(1)).toContainText('Son 30 gün');
 expect(requests.filter(x=>x.startsWith('/admin/analytics'))).toHaveLength(4);expect(requests.filter(x=>x==='/me/session')).toHaveLength(1);
});
test('all admin routes render with loaded fixtures at desktop and mobile without horizontal overflow',async({page})=>{
 test.setTimeout(180_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const values:Record<string,string>={tournamentId:'daily-cup-24',teamId:'team-01',resultId:'result-fixture',requestId:'RC-0021',disputeId:'DSP-0007',playerId:'player-fixture',verificationId:'verification-fixture'};
 const routes=routeManifest.filter(r=>r.family==='ADMIN'&&r.path!=='/admin/login').map(r=>r.path.replace(/:([A-Za-z]+)/g,(_,name)=>values[name]));
 for(const width of [390,1440]){await page.setViewportSize({width,height:950});for(const path of routes){await page.goto(path);await expect(page.locator('main h1').first(),path).toBeVisible();await expect(page.locator('.route-error'),path).toHaveCount(0);await noOverflow(page,`${width}px ${path}`);}}
 expect(errors).toEqual([]);
});
test('representative widths, 200% text, reduced motion and management views remain usable',async({page})=>{
 test.setTimeout(180_000);await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [320,390,768,1280,1440]){await page.setViewportSize({width,height:950});for(const path of ['/admin','/admin/tournaments/new','/admin/tournaments/daily-cup-24','/admin/teams','/admin/results']){await page.goto(path);await expect(page.locator('main h1')).toBeVisible();await noOverflow(page,`${width}px ${path}`);if(path==='/admin')await expect(page.locator('.admin-chart__plot').first()).toBeVisible();if(process.env.AEVIC_ADMIN_SCREENSHOTS&&((width===1440&&['/admin','/admin/tournaments/new','/admin/tournaments/daily-cup-24'].includes(path))||(width===390&&path==='/admin')))await page.screenshot({path:`/tmp/aevic-admin-redesign/${width}-${path.split('/').filter(Boolean).join('-')}.png`,animations:'disabled'});}}
 await page.setViewportSize({width:320,height:850});
 for(const path of ['/admin','/admin/tournaments/new','/admin/tournaments/daily-cup-24','/admin/teams','/admin/settings']){await page.goto(path);await expect(page.locator('main h1')).toBeVisible();await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});await noOverflow(page,`200% text ${path}`);}
 await page.goto('/admin/tournaments/daily-cup-24');
 for(const name of ['Slotlar və check-in','Qeydiyyatlar','Matç otaqları','Konfiqurasiya','İcmal']){await page.getByRole('button',{name,exact:true}).click();await noOverflow(page,name);}
 await page.goto('/admin/users');await page.getByRole('button',{name:'Admin dəvət et',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await noOverflow(page,'admin invitation modal');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Admin dəvət et',exact:true})).toBeFocused();
});
test('wizard validates, preserves edits, reviews and navigates to acknowledged new tournament without false not-found',async({page})=>{
 await page.setViewportSize({width:320,height:850});
 const snapshot=await fixtureServices.snapshots.admin();let created=false,calls=0,payload:any;
 const tournament={...snapshot.tournaments[0],id:'created-cup',name:'Wizard Cup',status:'draft',updatedAt:'2026-08-14T10:00:00Z'};
 await page.route('**/api/admin/context',route=>route.fulfill({json:{...snapshot,tournaments:created?[...snapshot.tournaments,tournament]:snapshot.tournaments}}));
 await page.route('**/api/admin/tournaments',async route=>{calls++;payload=route.request().postDataJSON();created=true;await route.fulfill({status:201,json:tournament});});
 await page.goto('/admin/tournaments/new');await page.getByRole('button',{name:'Davam et',exact:true}).click();await expect(page.getByRole('textbox',{name:'Turnir adı',exact:true})).toBeFocused();
 await page.getByRole('textbox',{name:'Turnir adı',exact:true}).fill('Wizard Cup');await page.getByRole('textbox',{name:'Qısa ad',exact:true}).fill('WC');await page.getByRole('button',{name:'Davam et',exact:true}).click();
 await page.getByLabel('Komanda tutumu',{exact:true}).fill('24');await page.getByRole('button',{name:'Rondo',exact:true}).first().click();await page.getByRole('button',{name:'Geri',exact:true}).click();await expect(page.getByRole('textbox',{name:'Turnir adı',exact:true})).toHaveValue('Wizard Cup');await page.getByRole('button',{name:'Davam et',exact:true}).click();await expect(page.getByLabel('Komanda tutumu',{exact:true})).toHaveValue('24');await noOverflow(page,'wizard maps at 320px');await page.getByRole('button',{name:'Davam et',exact:true}).click();
 for(const [label,value] of [['Qeydiyyat açılır','2026-11-06T10:00'],['Qeydiyyat bağlanır','2026-11-07T10:00'],['Check-in açılır','2026-11-07T10:00'],['Check-in bağlanır','2026-11-07T11:00'],['Turnirin başlanğıcı','2026-11-07T11:00'],['Turnirin bitməsi','2026-11-07T18:00']])await page.getByLabel(label,{exact:true}).fill(value);
 for(let i=0;i<4;i++)await page.getByLabel(`${i+1}. raund başlayır`,{exact:true}).fill(`2026-11-07T${12+i}:00`);
 await noOverflow(page,'wizard dates at 320px');await page.getByRole('button',{name:'Davam et',exact:true}).click();await noOverflow(page,'wizard scoring at 320px');await page.getByLabel('Turnir qaydaları',{exact:false}).fill('Fixture official rules');await page.getByRole('button',{name:'Davam et',exact:true}).click();await expect(page.getByText('Turnir yaratmağa hazırdır')).toBeVisible();expect(calls).toBe(0);
 await page.getByRole('button',{name:'Qaralama turnir yarat',exact:true}).click();await expect(page).toHaveURL(/\/admin\/tournaments\/created-cup$/);await expect(page.locator('h1')).toHaveText('Wizard Cup');expect(calls).toBe(1);expect(payload.maxSlots).toBe(24);expect(payload.rounds[0].map).toBe('Rondo');
});
test('dashboard empty and server failure states never display invented values',async({page})=>{
 await page.route('**/api/admin/analytics?*',route=>route.fulfill({status:403,json:{code:'FORBIDDEN'}}));await page.goto('/admin');await expect(page.getByText('Analitika yüklənmədi.')).toBeVisible();await expect(page.locator('.admin-kpi')).toHaveCount(0);
});

test('loading and genuinely empty analytics expose honest states',async({page})=>{
 let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve;});
 const empty=adminAnalyticsFixture('30');empty.totals=Object.fromEntries(Object.keys(empty.totals).map(k=>[k,0])) as typeof empty.totals;empty.period=Object.fromEntries(Object.keys(empty.period).map(k=>[k,0])) as typeof empty.period;empty.series=empty.series.map(p=>({...p,tournaments:0,completions:0,teams:0,registrations:0,publishedRounds:0,publishedResults:0}));empty.lifecycle=[];empty.upcoming=[];empty.completed=[];empty.attention=[];empty.approvals=[];empty.activity=[];
 await page.route('**/api/admin/analytics?*',async route=>{await wait;await route.fulfill({json:empty});});
 await page.goto('/admin');await expect(page.locator('.admin-analytics-skeleton')).toBeVisible();await expect(page.locator('.admin-kpi')).toHaveCount(0);release();await expect(page.locator('.admin-kpi')).toHaveCount(8);expect(await page.locator('.admin-kpi>strong').allTextContents()).toEqual(Array(8).fill('0'));await expect(page.getByText('Bu dövrdə fəaliyyət yoxdur')).toHaveCount(3);await expect(page.getByText('Hələ turnir yaradılmayıb.')).toBeVisible();
});
