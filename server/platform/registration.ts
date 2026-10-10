import {issueTokens,saveTokens,tokensEnabled} from '../auth/platform-tokens';
import {lockAccount} from './account-store';
import {randomBytes} from 'node:crypto';
import {sendVerification} from './email';
import {tokenDigest} from './context';
import {Hono} from 'hono';
import {z} from 'zod';
import type {Sql} from 'postgres';
import {setCookie} from 'hono/cookie';
import type {Env} from '../types';
import {body,text,email} from '../validation/input';
import {hashPassword,verifyPassword,makeSession,digest} from '../captain/crypto';
import {createAttemptLimiter} from '../captain/limit';
import {ServiceError} from '../errors';
import {platform,captainCookieName} from './context';
import {idempotent,audit} from './competition';
export const registrationInput=z.object({draft:z.object({teamName:text(2,60),tag:text(0,12).default(''),firstName:text(1,80),lastName:text(1,80),phone:text(6,30),email,players:z.array(z.object({ign:text(0,40),uid:z.string().regex(/^\d{5,20}$/).or(z.literal('')).default(''),role:z.enum(['captain','starter','substitute'])}).strict()).length(5)}).strict(),password:z.string().min(8).max(128).regex(/[A-ZƏÖÜĞÇŞİ]/).regex(/[0-9]/),idempotencyKey:text(8,128)}).strict().superRefine(({draft},ctx)=>{
 const used=draft.players.filter(p=>p.ign||p.uid),uids=used.map(p=>p.uid);
 if(draft.players.slice(0,4).some(p=>p.ign.length<2||!p.uid)||used.some(p=>p.ign.length<2||!p.uid)||new Set(uids).size!==uids.length||used.filter(p=>p.role==='captain').length!==1||used.filter(p=>p.role==='starter').length!==3||used.filter(p=>p.role==='substitute').length!==used.length-4)ctx.addIssue({code:'custom',message:'Complete unique roster required',path:['draft','players']});
});
export async function registerOriginalTeam(sql:Sql,secret:string,input:z.infer<typeof registrationInput>){
 input=registrationInput.parse(input);
 if(secret.length<32)throw new ServiceError(503,'CAPTAIN_AUTH_NOT_CONFIGURED');
 const {draft}=input,passwordHash=await hashPassword(input.password);
 // HMAC keeps the idempotency record from becoming an offline password oracle.
 const fingerprint=digest(secret,'registration-payload',JSON.stringify(input));
 const receipt=await idempotent(sql,{teamId:'registration:'+digest(secret,'registration-email',draft.email)},input.idempotencyKey,'registration.create',fingerprint,async tx=>{
  await tx`select pg_advisory_xact_lock(184621,1)`;await tx`select pg_advisory_xact_lock(184621,2)`;
  const [setting]=await tx`select value from aevic_platform.settings where key='platform'`;if(setting?.value.registrationEnabled===false)throw new ServiceError(409,'REGISTRATION_CLOSED');
  const duplicate=await tx`select id from aevic_platform.account_identity where lower(btrim(email))=${draft.email} union all select id from public.teams where lower(btrim(team_name))=lower(${draft.teamName}) limit 1`;if(duplicate.length)throw new ServiceError(409,'REGISTRATION_CONFLICT');
  const players=draft.players.filter(p=>p.ign);
  const occupied=await tx`select team_id from aevic_platform.player_details where pubg_id=any(${players.map(p=>p.uid)}) limit 1`;if(occupied.length)throw new ServiceError(409,'PLAYER_ALREADY_REGISTERED');
  const values={team_name:draft.teamName,captain_name:`${draft.firstName} ${draft.lastName}`,captain_contact:draft.phone,email:draft.email,password_hash:passwordHash,status:'pending',tier:'entry',...Object.fromEntries(draft.players.map((p,i)=>[`player${i+1}_ign`,p.ign||null]))};
  const [row]=await tx`insert into public.teams ${tx(values)} returning id::text`;
  await tx`insert into aevic_platform.accounts(id,original_team_id) values(${row.id},${row.id})`;
  await tx`insert into aevic_platform.team_authority(team_id,account_id,role) values(${row.id},${row.id},'OWNER')`;
  await tx`insert into aevic_platform.team_details(team_id,tag,legacy_history_incomplete) values(${row.id},${draft.tag},false)`;
  for(const [i,p]of draft.players.entries())if(p.ign)await tx`insert into aevic_platform.player_details(team_id,slot,pubg_id,role) values(${row.id},${i+1},${p.uid},${p.role})`;
  await audit(tx,{teamId:row.id},'registration.create','team',row.id);
  return{registrationId:row.id,status:'submitted',source:'backend'};
 });
 const [current]=await sql`select id::text,password_hash,status from public.teams where id=${receipt.registrationId}`;
 if(!current||current.status==='banned'||!await verifyPassword(input.password,current.password_hash))throw new ServiceError(401,'LOGIN_REQUIRED');
 return{receipt:{...receipt,duplicate:current.password_hash!==passwordHash},cookie:makeSession(current.id,current.password_hash,secret,8*3600)};
}
const app=new Hono<Env>(),limit=createAttemptLimiter();
app.post('/registrations',async c=>{
 limit('registration-ip',c.req.header('x-nf-client-connection-ip')??'local',5);
 const input=await body(c,registrationInput),config=c.get('config');
 if(!config.emailFrom||!(config.smtp||config.resendKey))throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
 const result=await registerOriginalTeam(platform(c).sql,config.sessionSecret??'',input);
 // Replayed registration must never bypass a subsequently enabled second factor.
 if(result.receipt.duplicate){const [factor]=await platform(c).sql`select enabled_at from aevic_platform.mfa_factors where team_id=${result.receipt.registrationId} and enabled_at is not null`;if(factor)throw new ServiceError(401,'LOGIN_REQUIRED');}
 // Issue on the server, including idempotent retries after a delivery failure.
 const token=randomBytes(32).toString('base64url');
 const [verification]=await platform(c).sql`insert into aevic_platform.email_verifications(team_id,token_digest,expires_at) values(${result.receipt.registrationId},${tokenDigest(token)},now()+interval '30 minutes') on conflict(team_id) do update set token_digest=excluded.token_digest,expires_at=excluded.expires_at,created_at=now(),consumed_at=null where aevic_platform.email_verifications.consumed_at is null and aevic_platform.email_verifications.created_at<now()-interval '60 seconds' returning team_id`;
 if(verification){const link=new URL('/verify-email',config.siteUrl);link.hash=new URLSearchParams({token}).toString();try{await sendVerification(config,input.draft.email,link.href);}catch{console.warn(JSON.stringify({event:'verification_delivery_failed',requestId:c.get('requestId')}));}}
 let legacyCookie=result.cookie;
 const issued=await platform(c).sql.begin(async tx=>{const row=await lockAccount(tx,result.receipt.registrationId);if(!await verifyPassword(input.password,row.password_hash)||row.status==='banned')throw new ServiceError(401,'LOGIN_REQUIRED');const [factor]=await tx`select enabled_at from aevic_platform.mfa_factors where team_id=${row.id} and enabled_at is not null`;if(factor)throw new ServiceError(401,'LOGIN_REQUIRED');if(tokensEnabled(c))return issueTokens(c,tx,{accountId:row.id},row.password_hash,false,false);legacyCookie=makeSession(row.id,row.password_hash,config.sessionSecret??'',8*3600);});
 if(issued)saveTokens(c,issued);else setCookie(c,captainCookieName(c),legacyCookie,{path:'/',httpOnly:true,secure:config.secureCookies,sameSite:'Strict'});
 return c.json({...result.receipt,...(issued?{accessToken:issued.accessToken,accessExpiresAt:issued.accessExpiresAt,sessionMode:'tokens'}:{})},201);
});
export default app;
