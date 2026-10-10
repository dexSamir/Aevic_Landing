import {requestJson} from './requestJson';
import {ApiError} from './apiError';
type Envelope={sessionMode?:'legacy'|'tokens';accessToken?:string;accessExpiresAt?:number};
export function createTokenTransport(root:string){
 let access:string|undefined,expires=0,negotiated=false,pending:Promise<void>|undefined,generation=0;
 const channel=typeof window!=='undefined'&&typeof BroadcastChannel!=='undefined'?new BroadcastChannel('aevic-session-v2'):undefined;
 const clear=()=>{access=undefined;expires=0;negotiated=false;generation++;};
 if(channel)channel.onmessage=()=>{clear();window.dispatchEvent(new Event('aevic:session-change'));};
 const receive=(data:unknown)=>{const e=data as Envelope|undefined;if(e?.sessionMode==='legacy'){access=undefined;expires=0;negotiated=true;return;}if(e?.sessionMode==='tokens'&&typeof e.accessToken==='string'&&typeof e.accessExpiresAt==='number'){access=e.accessToken;expires=e.accessExpiresAt;negotiated=true;}};
 async function refresh(){
  if(pending)return pending;
  const version=generation;
  const rotate=async()=>{for(let attempt=0;attempt<3;attempt++){try{const result=await requestJson<Envelope>(root+'/auth/refresh',{method:'POST',credentials:'include'},[],15_000);if(version===generation)receive(result);return;}catch(error){if(error instanceof ApiError&&error.code==='REFRESH_BUSY'&&attempt<2){await new Promise(r=>setTimeout(r,250*(attempt+1)));continue;}if(error instanceof ApiError&&(error.status===401||error.status===404)){if(version===generation){access=undefined;expires=0;negotiated=true;}return;}throw error;}}};
  // The lock serializes cookie rotation across tabs; never broadcast token values.
  pending=(async()=>{if(typeof navigator!=='undefined'&&navigator.locks){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20_000);try{await navigator.locks.request('aevic-refresh-v2',{signal:controller.signal},rotate);}finally{clearTimeout(timer);}}else await rotate();})().finally(()=>{pending=undefined;});
  return pending;
 }
 const publicPath=(path:string,method:string)=>/^\/auth\//.test(path)||path==='/registrations'||['GET','HEAD'].includes(method)&&/^\/(public|tournaments|matches|leaderboards|records|archive|search|sitemap|registrations)(\/|\?|$)/.test(path);
 async function request<T>(path:string,options:RequestInit={},nullStatuses:number[]=[],timeout?:number,format:'json'|'blob'='json'):Promise<T>{
  if(options.signal?.aborted)throw new ApiError({status:0,kind:'abort'});
  const method=options.method??'GET',protectedRequest=!publicPath(path,method);
  if(protectedRequest&&(!negotiated||access&&expires<Date.now()+30_000))await refresh();
  const send=()=>{if(options.signal?.aborted)throw new ApiError({status:0,kind:'abort'});const headers=new Headers(options.headers);if(access)headers.set('Authorization',`Bearer ${access}`);return requestJson<T>(root+path,{...options,headers,credentials:'include'},[],timeout,format);};
  let result:T;
  try{result=await send();}catch(error){
   if(error instanceof ApiError&&error.code==='ACCESS_EXPIRED'&&['GET','HEAD'].includes(method)&&protectedRequest){await refresh();try{result=await send();}catch(retry){if(retry instanceof ApiError&&nullStatuses.includes(retry.status))return undefined as T;throw retry;}}
   else {if(protectedRequest&&error instanceof ApiError&&error.code==='ACCESS_EXPIRED')expires=0;
    if(protectedRequest&&error instanceof ApiError&&['SESSION_REVOKED','MFA_REQUIRED','UNAUTHORIZED'].includes(error.code)&&access){clear();negotiated=true;if(typeof window!=='undefined')window.dispatchEvent(new Event('aevic:session-change'));}
    if(error instanceof ApiError&&nullStatuses.includes(error.status))return undefined as T;throw error;}
  }
  if(['/auth/login','/auth/admin/login','/registrations'].includes(path))generation++;
  receive(result);
  if(['/auth/login','/auth/admin/login','/registrations'].includes(path))channel?.postMessage('identity-changed');
  if(path==='/auth/logout'||path==='/me/account/password'||path==='/auth/password-reset/confirm'){clear();channel?.postMessage('identity-changed');}
  return result;
 }
 return {request,dispose:()=>channel?.close()};
}
const transports=new Map<string,ReturnType<typeof createTokenTransport>>();
export function sessionTransport(root:string){let value=transports.get(root);if(!value){value=createTokenTransport(root);transports.set(root,value);}return value;}

export async function downloadPrivateFile(url:string,fileName:string){
 const root=(import.meta.env?.VITE_API_BASE_URL as string|undefined)||'/api';
 const target=new URL(url,window.location.origin),base=new URL(root,window.location.origin);
 if(target.origin!==base.origin||!target.pathname.startsWith(base.pathname+'/'))throw new Error('Invalid download path');
 const blob=await sessionTransport(root).request<Blob>(target.pathname.slice(base.pathname.length)+target.search,{},[],30_000,'blob');
 const objectUrl=URL.createObjectURL(blob),link=document.createElement('a');link.href=objectUrl;link.download=fileName;link.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
}
