import {createHash} from 'node:crypto';
import {ServiceError} from '../errors';
// Per-instance tightening supplements Netlify's distributed IP/domain limit, not a replacement.
export function createAttemptLimiter(now=()=>Date.now()) {
 const windows=new Map<string,{until:number;count:number}>();
 return (category:string,identity:string,limit:number)=>{
  const key=createHash('sha256').update(category+'\0'+identity).digest('hex');const time=now();
  if(windows.size>10000){for(const [k,v] of windows)if(v.until<=time)windows.delete(k);if(windows.size>10000)throw new ServiceError(429,'RATE_LIMITED');}
  const entry=windows.get(key);if(!entry||entry.until<=time){windows.set(key,{until:time+60000,count:1});return;}
  if(entry.count>=limit)throw new ServiceError(429,'RATE_LIMITED');entry.count++;
 };
}
