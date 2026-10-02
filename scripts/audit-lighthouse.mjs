// Local build + synthetic recorded HTTP fixtures only. No production credentials.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const toolRoot=process.env.AEVIC_QUALITY_TOOLS || '/tmp/aevic-quality-tools/node_modules';
const {default:lighthouse}=await import(pathToFileURL(`${toolRoot}/lighthouse/core/index.js`));
const {launch}=await import(pathToFileURL(`${toolRoot}/chrome-launcher/dist/index.js`));
const fixture='/tmp/aevic-lighthouse-fixture.json',port='4192';
writeFileSync(fixture,'{}');mkdirSync('/tmp/aevic-lighthouse',{recursive:true});
const host=spawn(process.execPath,['tests/helpers/serve-public-build.mjs'],{env:{...process.env,AEVIC_TEST_BUILD_PORT:port,AEVIC_TEST_BUILD_ROOT:process.env.AEVIC_LIGHTHOUSE_BUILD || 'dist',AEVIC_TEST_API_FIXTURES:fixture},stdio:'ignore'});
let chrome;
try{
 let ready=false;
 for(let attempt=0;attempt<50;attempt++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
 if(!ready)throw new Error('Local Lighthouse fixture host did not start');
 chrome=await launch({chromeFlags:['--headless','--disable-gpu']});
 const measurements=[];
 for(const [index,path] of ['/','/teams','/tournaments','/tournaments/daily-cup-24','/login','/team','/admin'].entries()){
  writeFileSync(fixture,readFileSync(`/tmp/aevic-quality-captures/fixture-${index}.json`));
  const {lhr}=await lighthouse(`http://127.0.0.1:${port}${path}`,{port:chrome.port,output:'json',onlyCategories:['performance','accessibility','best-practices','seo'],logLevel:'error'});
  const summary={path,scores:Object.fromEntries(Object.entries(lhr.categories).map(([key,value])=>[key,value.score===null?null:Math.round(value.score*100)])),metrics:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(key=>[key,lhr.audits[key]?.numericValue])),failures:Object.entries(lhr.audits).filter(([,audit])=>audit.score!==null&&audit.score<1).map(([id,audit])=>({id,title:audit.title,displayValue:audit.displayValue})),runtimeError:lhr.runtimeError};
  measurements.push(summary);console.log(JSON.stringify(summary));
  writeFileSync(`/tmp/aevic-lighthouse/${process.env.AEVIC_LIGHTHOUSE_LABEL || 'after'}-${index}.json`,JSON.stringify(lhr));
 }
 writeFileSync(`/tmp/aevic-lighthouse/${process.env.AEVIC_LIGHTHOUSE_LABEL || 'after'}-summary.json`,JSON.stringify(measurements,null,2));
}finally{if(chrome)await chrome.kill();host.kill();}
