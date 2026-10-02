import { test, expect } from '../helpers/api-fixture-test';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
const axeSource=readFileSync(process.env.AEVIC_AXE_SOURCE || '/tmp/aevic-quality-tools/node_modules/axe-core/axe.min.js','utf8');
const paths=['/','/teams','/tournaments','/tournaments/daily-cup-24','/login','/team','/admin','/search?q=Caspian'];
mkdirSync('/tmp/aevic-quality-captures',{recursive:true});
for(const [index,path] of paths.entries())test(`accessibility and responsive ${path}`,async({page})=>{
 const fixtures:Record<string,unknown>={};const reads:Promise<void>[]=[];
 page.on('response',response=>{const url=new URL(response.url());if(url.pathname.startsWith('/api/'))reads.push(response.json().then(body=>{fixtures[url.pathname+url.search]={status:response.status(),body};}).catch(()=>{}));});
 await page.goto(path,{waitUntil:'networkidle'});
 await expect(page.locator('h1').first()).toBeVisible();
 await Promise.all(reads);writeFileSync(`/tmp/aevic-quality-captures/fixture-${index}.json`,JSON.stringify(fixtures));
 for(const width of [320,375,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  appendFileSync('/tmp/aevic-quality-responsive.jsonl',JSON.stringify({path,width,overflow})+'\n');
  expect.soft(overflow,`${path} at ${width}px`).toBeLessThanOrEqual(1);
  if(width===320||width===1440){
   await page.evaluate(axeSource);
   const result=await page.evaluate(async()=>await (window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}}));
   const violations=result.violations.map((v:any)=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));
   appendFileSync('/tmp/aevic-quality-accessibility.jsonl',JSON.stringify({path,width,violations})+'\n');
   await page.screenshot({path:`/tmp/aevic-quality-captures/${index}-${width}.png`,fullPage:true});
   expect.soft(violations,`${path} at ${width}px`).toEqual([]);
  }
 }
});
