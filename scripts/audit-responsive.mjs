import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
console.log('Starting responsive browser audit');
const browser=await chromium.launch({channel:'chrome',headless:true});
const issues=[],errors=[];let checks=0;
const base=process.env.AUDIT_URL||'http://127.0.0.1:4174';
const routeParams={teamSlug:'caspian-wolves',tournamentId:'daily-cup-24',matchId:'dc24-r1',organizationSlug:'caspian-vanguard',organizationId:'caspian-vanguard',requestId:'RC-0021',disputeId:'DSP-0007',badgeId:'ach-top-four',ticketId:'SUP-1042',year:'2026',teamId:'team-01',resultId:'result-1',playerId:'p1',recordId:'record-1',verificationId:'verification-1'};
const allRoutes=[...new Set([...readFileSync('src/app/routeManifest.ts','utf8').matchAll(/(?:"path"|path):\s*['"]([^'"]+)['"]/g)].map(([,path])=>path==='*'?'/not-a-route':path.replace(/:([A-Za-z]+)/g,(_,key)=>routeParams[key]||'unknown')))];
const routes=process.env.AUDIT_ALL_ROUTES?allRoutes:process.env.AUDIT_ROUTES?JSON.parse(process.env.AUDIT_ROUTES):['/','/tournaments','/tournaments/daily-cup-24','/teams','/teams/caspian-wolves','/matches','/login','/register','/forgot-password','/reset-password?token=valid','/team','/team/profile','/team/tournaments','/team/tournaments/daily-cup-24','/team/roster','/team/career','/team/sharecards','/team/settings','/team/disputes/new','/admin','/admin/tournaments/new','/admin/teams','/account/security'];
const widths=process.env.AUDIT_WIDTHS?JSON.parse(process.env.AUDIT_WIDTHS):[320,360,375,390,412,430,480,600,768,820,1024,1280,1366,1440,1536,1920,2560];
const output=process.env.AUDIT_OUTPUT||'/tmp/aevic-responsive.json';
const save=()=>writeFileSync(output,JSON.stringify({routes,widths,textScale:Number(process.env.AUDIT_TEXT_SCALE||100),checks,issues,errors:[...new Set(errors)]},null,2));
async function inspect(page,route,width,textScale=Number(process.env.AUDIT_TEXT_SCALE||100)){
 checks++;console.log(`${route} @ ${width}`);
 await page.setViewportSize({width,height:Number(process.env.AUDIT_HEIGHT)||(width<=430?844:width===768?1024:900)});
 await page.goto(base+route);
 try{await page.locator('h1').first().waitFor({timeout:10000});}
 catch{issues.push({width,route,error:'No visible heading',text:await page.locator('body').innerText()});return;}
 if(textScale!==100)await page.addStyleTag({content:`html{font-size:${textScale}% !important}`});
 await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,5000))]));
 // Mock calls resolve after 180ms; allow nested reads, image decoding and transitions.
 await page.waitForTimeout(750);
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left < -1)&&getComputedStyle(e).position!=='fixed'&&!e.closest('[aria-hidden="true"]');}).slice(0,10).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,80),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))}));
 if(overflow.scroll>width+1)issues.push({route,textScale,...overflow});
}
const queue=[...widths];
// Independent contexts avoid cross-route login state while keeping the full matrix practical.
await Promise.all(Array.from({length:Math.min(4,widths.length)},async()=>{
 const context=await browser.newContext({reducedMotion:process.env.AUDIT_MOTION||'reduce'});
 const page=await context.newPage();page.setDefaultNavigationTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 try{while(queue.length){const width=queue.shift();for(const route of routes)await inspect(page,route,width);save();console.log(`Checked ${width}px (${checks} checks so far)`);}}
 finally{await context.close();}
}));
const page=await browser.newPage({reducedMotion:process.env.AUDIT_MOTION||'reduce'});
page.on('pageerror',e=>errors.push(e.message));
for(const route of ['/login','/register','/team/profile','/team/settings','/admin/tournaments/new'])await inspect(page,route,1024,200);
for(const [route,width,path] of [['/',390,'/tmp/aevic-home-mobile.png'],['/team/profile',390,'/tmp/aevic-profile-mobile.png'],['/team',1440,'/tmp/aevic-workspace-desktop.png'],['/admin/tournaments/new',320,'/tmp/aevic-admin-mobile.png']]){
 await page.setViewportSize({width,height:900});await page.goto(base+route);await page.locator('h1').first().waitFor();await page.waitForTimeout(750);await page.screenshot({path,fullPage:true});
}
save();await browser.close();console.log(JSON.stringify({checks,issues,errors:[...new Set(errors)]}));
if(issues.length||errors.length)process.exitCode=1;
