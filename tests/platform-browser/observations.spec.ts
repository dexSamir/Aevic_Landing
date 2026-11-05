import {test,expect} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
const output='docs/reports/evidence/AEVIC-REMEDIATION-2026-11-05';
test('repeat directory layout observations and authenticated managers/badges loading',async({browser})=>{
 test.setTimeout(90_000);mkdirSync(output,{recursive:true});const samples=[];
 for(const width of [390,1440])for(let sample=1;sample<=3;sample++){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();
  await page.addInitScript(()=>{(window as any).__shifts=[];new PerformanceObserver(list=>{for(const e of list.getEntries() as any)if(!e.hadRecentInput)(window as any).__shifts.push({value:e.value,sources:e.sources?.map((s:any)=>({node:s.node?.className,previous:s.previousRect,current:s.currentRect}))});}).observe({type:'layout-shift',buffered:true});});
  await page.goto('http://127.0.0.1:4194/tournaments');await expect(page.locator('main h1')).toBeVisible();await page.waitForTimeout(6000);
  samples.push({width,sample,...await page.evaluate(()=>({sum:(window as any).__shifts.reduce((n:number,e:any)=>n+e.value,0),shifts:(window as any).__shifts,overflow:document.documentElement.scrollWidth-innerWidth}))});await context.close();
 }
 const context=await browser.newContext({baseURL:'http://127.0.0.1:4194'});expect((await context.request.post('/api/auth/login',{headers:{origin:'http://127.0.0.1:4194','x-nf-client-connection-ip':'198.51.100.249'},data:{email:'captain201@example.invalid',password:'IsolatedBrowser42'}})).ok()).toBe(true);
 const page=await context.newPage(),errors:string[]=[],routes=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/team/settings/managers','/team/badges'])for(let attempt=1;attempt<=3;attempt++){await page.goto(path);await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('.route-error')).toHaveCount(0);routes.push({path,attempt,title:await page.locator('main h1').innerText()});}
 expect(errors).toEqual([]);writeFileSync(`${output}/repeated-observations.json`,JSON.stringify({environment:'unthrottled local Chromium; six-second non-input shift sum, not field CLS',samples,routes,errors},null,2));await context.close();
});
