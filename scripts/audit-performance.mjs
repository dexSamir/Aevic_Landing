// Local synthetic comparison, not field Core Web Vitals or live Supabase timing.
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const hosts=[];
if(process.env.AEVIC_PERF_BASELINE_ROOT){
 for(const [root,port] of [[process.env.AEVIC_PERF_BASELINE_ROOT,4177],['dist',4178]]){
  const child=spawn(process.execPath,['tests/helpers/serve-public-build.mjs'],{env:{...process.env,AEVIC_TEST_BUILD_ROOT:root,AEVIC_TEST_BUILD_PORT:String(port)},stdio:'ignore'});hosts.push(child);
  let ready=false;for(let attempt=0;attempt<30;attempt++){try{ready=(await fetch(`http://127.0.0.1:${port}`)).ok;}catch{/* host starting */}if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));}
  if(!ready){hosts.forEach(host=>host.kill());throw new Error('Performance fixture host did not start');}
 }
}
try {
const browser=await chromium.launch({channel:'chrome',headless:true});
const samples=[];
for(const [build,url] of [['before','http://127.0.0.1:4177'],['after','http://127.0.0.1:4178']]){
 for(let iteration=1;iteration<=3;iteration++){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,serviceWorkers:'block'});
  const page=await context.newPage();const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1_600_000/8,uploadThroughput:750_000/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.addInitScript(()=>{window.__metrics={lcp:0,cls:0};new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__metrics.lcp=e.startTime;window.__metrics.element=e.element?.tagName;}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__metrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});});
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForTimeout(2500);
  const metrics=await page.evaluate(()=>({...window.__metrics,ttfb:performance.getEntriesByType('navigation')[0].responseStart,jsBytes:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js')).reduce((n,r)=>n+r.transferSize,0),cssBytes:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.css')).reduce((n,r)=>n+r.transferSize,0),scripts:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js')).map(r=>r.name.split('/').pop())}));samples.push({build,iteration,...metrics});
  console.log(build,iteration,JSON.stringify(metrics));if(iteration===1)await page.screenshot({path:`/tmp/aevic-home-${build}.png`});await context.close();
 }
}
await browser.close();await writeFile('/tmp/aevic-performance.json',JSON.stringify(samples,null,2));console.log(JSON.stringify(samples.map(({scripts,...metrics})=>metrics),null,2));

} finally { hosts.forEach(host=>host.kill()); }
