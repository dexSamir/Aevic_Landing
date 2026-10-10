import type {CaptainRow} from '../captain/store';
import {randomBytes} from 'node:crypto';
import type {Sql,TransactionSql} from 'postgres';
import {getCookie,setCookie,deleteCookie} from 'hono/cookie';
import type {ApiContext} from '../types';
import type {Actor} from '../platform/repository';
import {digest,same} from '../captain/crypto';
import {tokenDigest,adminCookieName,captainCookieName} from '../platform/context';
import {ServiceError} from '../errors';

export const accessSeconds=600;
export const tokenMode=(c:ApiContext)=>c.get('config').sessionMode??'legacy';
export const tokensEnabled=(c:ApiContext)=>tokenMode(c)!=='legacy';
const secret=(c:ApiContext)=>{const value=c.get('config').sessionSecret??'';if(value.length<32)throw new ServiceError(503,'SESSION_NOT_CONFIGURED');return value;};
export const refreshName=(c:ApiContext)=>c.get('config').secureCookies?'__Secure-aevic-refresh-v2':'aevic-refresh-v2';
const options=(c:ApiContext)=>({path:'/api/auth',httpOnly:true,secure:c.get('config').secureCookies,sameSite:'Strict' as const});
export const refreshCookie=(c:ApiContext)=>getCookie(c,refreshName(c));
export function clearTokenCookies(c:ApiContext){deleteCookie(c,refreshName(c),options(c));}
export function clearLegacyCookies(c:ApiContext){for(const name of [adminCookieName(c),captainCookieName(c)])deleteCookie(c,name,{path:'/',secure:c.get('config').secureCookies,httpOnly:true,sameSite:'Strict'});}
export function signAccess(id:string,key:string,now=Date.now()){
 const expires=Math.floor(now/1000)+accessSeconds,payload=`v2.${id}.${expires}`;
 return {accessToken:`${payload}.${digest(key,'access-v2',payload)}`,accessExpiresAt:expires*1000,sessionMode:'tokens' as const};
}
export function accessIdentity(token:string,key:string,now=Date.now()){
 const m=/^(v2\.([a-f0-9-]{36})\.(\d{10}))\.([A-Za-z0-9_-]{43})$/.exec(token);
 if(!m||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(m[2])||Number(m[3])*1000<=now||Number(m[3])*1000>now+(accessSeconds+5)*1000||!same(m[4],digest(key,'access-v2',m[1])))throw new ServiceError(401,'ACCESS_EXPIRED');
 return m[2];
}
export async function issueTokens(c:ApiContext,tx:TransactionSql,a:Actor,hash:string,remember:boolean,mfa:boolean){
 const id=crypto.randomUUID(),refresh=randomBytes(32).toString('base64url'),absolute=remember?30*86400:8*3600,idle=remember?86400:8*3600;
 const sessionDigest=tokenDigest(randomBytes(32).toString('base64url'));
 await tx`insert into aevic_platform.sessions(id,token_digest,team_id,admin_id,expires_at,idle_expires_at,protocol,credential_digest,remember,device,mfa_verified_at)
 values(${id},${sessionDigest},${a.accountId??a.teamId??null},${a.adminId??null},now()+${absolute}*interval '1 second',now()+${idle}*interval '1 second',2,${digest(secret(c),'credential-v2',hash)},${remember},${(c.req.header('user-agent')??'Browser').slice(0,300)},case when ${mfa} then clock_timestamp() else null end)`;
 await tx`insert into aevic_platform.refresh_tokens(token_digest,session_id) values(${tokenDigest(refresh)},${id})`;
 // Caller returns only after transaction commit; no plaintext refresh is persisted.
 return {id,refresh,remember,absolute,...signAccess(id,secret(c))};
}
export function saveTokens(c:ApiContext,result:{refresh:string;remember:boolean;absolute:number}){
 setCookie(c,refreshName(c),result.refresh,{...options(c),...(result.remember?{maxAge:result.absolute}:{})});clearLegacyCookies(c);
}
async function validSession(c:ApiContext,sql:Sql|TransactionSql,row:Record<string,any>){
 if(!row||row.revoked_at||new Date(row.expires_at).getTime()<=Date.now()||new Date(row.idle_expires_at).getTime()<=Date.now())throw new ServiceError(401,'SESSION_REVOKED');
 const [identity]=row.admin_id?await sql`select *,id::text from aevic_platform.admin_accounts where id=${row.admin_id} and active`:await sql`select *,id::text from aevic_platform.account_identity where id=${row.team_id}`;
 if(!identity||identity.status==='banned'||!same(row.credential_digest,digest(secret(c),'credential-v2',identity.password_hash??'')))throw new ServiceError(401,'SESSION_REVOKED');
 const [factor]=await sql`select enabled_at from aevic_platform.mfa_factors where actor_key=${row.admin_id?'admin:'+row.admin_id:'team:'+row.team_id} and enabled_at is not null`;
 if(factor&&(!row.mfa_verified_at||new Date(row.mfa_verified_at)<new Date(factor.enabled_at)))throw new ServiceError(401,'MFA_REQUIRED');
 return identity;
}
export async function authenticateAccess(c:ApiContext,sql:Sql,authorization:string):Promise<Actor>{
 if(!authorization.startsWith('Bearer '))throw new ServiceError(401,'UNAUTHORIZED');
 const id=accessIdentity(authorization.slice(7),secret(c));
 const [row]=await sql`select * from aevic_platform.sessions where id=${id} and protocol=2`;
 const identity=await validSession(c,sql,row);
 c.set('sessionDigest',row.token_digest);c.set('sessionId',id);
 if(row.admin_id)return {adminId:identity.id,role:identity.role};
 c.set('verifiedCaptain',identity as CaptainRow);return {accountId:identity.id,teamId:identity.id};
}
export async function rotateTokens(c:ApiContext,sql:Sql,token:string){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new ServiceError(401,'UNAUTHORIZED');
 const hashed=tokenDigest(token);
 const result=await sql.begin(async tx=>{
  const [link]=await tx`select session_id from aevic_platform.refresh_tokens where token_digest=${hashed}`;
  if(!link)return {error:'UNAUTHORIZED'};
  // Lock the family, then reread the token. All rotations/replays serialize here.
  const [row]=await tx`select * from aevic_platform.sessions where id=${link.session_id} and protocol=2 for update`;
  try{await validSession(c,tx,row);}catch(e){if(!(e instanceof ServiceError&&e.status===401))throw e;return {error:'SESSION_REVOKED'};}
  const [used]=await tx`select consumed_at,clock_timestamp() as server_now from aevic_platform.refresh_tokens where token_digest=${hashed}`;
  if(used.consumed_at){
   if(new Date(used.server_now).getTime()-new Date(used.consumed_at).getTime()<5000)return {error:'REFRESH_BUSY'};
   await tx`update aevic_platform.sessions set revoked_at=clock_timestamp() where id=${row.id}`;
   return {error:'REFRESH_REUSED'}; // Commit revocation before throwing outside transaction.
  }
  const fresh=randomBytes(32).toString('base64url');
  await tx`update aevic_platform.refresh_tokens set consumed_at=clock_timestamp() where token_digest=${hashed}`;
  await tx`insert into aevic_platform.refresh_tokens(token_digest,session_id) values(${tokenDigest(fresh)},${row.id})`;
  await tx`update aevic_platform.sessions set idle_expires_at=least(expires_at,clock_timestamp()+${row.remember?86400:8*3600}*interval '1 second'),last_active_at=clock_timestamp() where id=${row.id}`;
  return {id:String(row.id),refresh:fresh,remember:Boolean(row.remember),absolute:Math.max(0,Math.floor((new Date(row.expires_at).getTime()-Date.now())/1000)),...signAccess(row.id,secret(c))};
 });
 if('error' in result)throw new ServiceError(result.error==='REFRESH_BUSY'?409:401,result.error!);
 return result;
}
