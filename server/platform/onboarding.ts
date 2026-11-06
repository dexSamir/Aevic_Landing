import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import { z } from 'zod';
import type { Sql, TransactionSql } from 'postgres';
import type { Env, ApiContext } from '../types';
import type { Actor } from './repository';
import { body, text, email } from '../validation/input';
import { ServiceError } from '../errors';
import { platform, account, actor, captainCookieName, tokenDigest } from './context';
import { accountRecord, accountUser, lockAccount } from './account-store';
import { selectWorkspace, managingRoles } from './workspace';
import { audit, idempotent, transaction } from './competition';
import { requireVerifiedEmail } from './email-requirement';
import { hashPassword, verifyPassword, makeSession, digest } from '../captain/crypto';
import { issueTokens, saveTokens, tokensEnabled } from '../auth/platform-tokens';
import { createAttemptLimiter } from '../captain/limit';
import { sendVerification } from './email';

const player=z.object({ign:text(0,40),uid:z.string().regex(/^\d{5,20}$/).or(z.literal('')),role:z.enum(['captain','starter','substitute'])}).strict();
const draftFields=z.object({teamName:text(0,60),tag:text(0,12),firstName:text(0,80),lastName:text(0,80),phone:text(0,30),players:z.array(player).length(5)}).strict();
export const setupDraftInput=draftFields.partial();
export const setupInput=draftFields.extend({teamName:text(2,60),firstName:text(1,80),lastName:text(1,80),phone:text(6,30)}).superRefine(({players},ctx)=>{
 const used=players.filter(p=>p.ign||p.uid),uids=used.map(p=>p.uid);
 if(players.slice(0,4).some(p=>p.ign.length<2||!p.uid)||used.some(p=>p.ign.length<2||!p.uid)||new Set(uids).size!==uids.length||used.filter(p=>p.role==='captain').length!==1||used.filter(p=>p.role==='starter').length!==3||used.filter(p=>p.role==='substitute').length!==used.length-4)ctx.addIssue({code:'custom',message:'Complete unique roster required',path:['players']});
});
const purpose=z.enum(['spectator','team']);
const password=z.string().min(8).max(128).regex(/[A-ZƏÖÜĞÇŞİ]/).regex(/[0-9]/);
export const emailAccountInput=z.object({firstName:text(1,80),lastName:text(1,80),email,password,purpose,idempotencyKey:text(8,128)}).strict();

export async function onboardingState(sql:Sql|TransactionSql,id:string){
 const [row]=await sql`select purpose,draft,team_id::text,completed_at,revision from aevic_platform.account_onboarding where account_id=${id}`;
 // Absence is deliberately legacy-complete: existing accounts never get re-enrolled.
 return {purpose:row?.purpose??null,status:!row||row.completed_at?'complete' as const:row.purpose==='team'?'team' as const:row.purpose==='spectator'?'complete' as const:'choice' as const,revision:row?.revision??0,draft:row?.draft??{},teamId:row?.team_id??undefined};
}
export async function accountSession(sql:Sql|TransactionSql,id:string,selected?:string){
 const row=await accountRecord(sql,id),identity:Actor={accountId:id};
 await selectWorkspace(sql,identity,selected);
 const role=identity.teamId?(managingRoles.includes(identity.teamRole??'')?'captain' as const:'team' as const):'visitor' as const;
 const state=await onboardingState(sql,id);
 const status=identity.teamId?'complete' as const:state.status;
 return {role,user:{...accountUser(row),role,teamId:identity.teamId,onboarding:{purpose:state.purpose,status}}};
}

export async function completeTeamSetup(sql:Sql,principal:Actor,input:z.infer<typeof setupInput>,key:string){
 input=setupInput.parse(input);const owner=principal.accountId??principal.teamId!;
 await requireVerifiedEmail(sql,owner);
 return idempotent(sql,{accountId:owner},key,'account.team-setup',input,async tx=>{
  // Same duplicate-check lock order as the original registration path.
  await tx`select pg_advisory_xact_lock(184621,1)`;await tx`select pg_advisory_xact_lock(184621,2)`;
  const identity=await lockAccount(tx,owner);
  const [state]=await tx`select * from aevic_platform.account_onboarding where account_id=${owner} for update`;
  if(!state||state.purpose!=='team'||state.completed_at)throw new ServiceError(409,'ONBOARDING_NOT_PENDING');
  if((await tx`select team_id from aevic_platform.team_authority where account_id=${owner}`).length)throw new ServiceError(409,'ALREADY_MEMBER');
  const [setting]=await tx`select value from aevic_platform.settings where key='platform'`;if(setting?.value.registrationEnabled===false)throw new ServiceError(409,'REGISTRATION_CLOSED');
  if((await tx`select id from public.teams where lower(btrim(team_name))=lower(${input.teamName}) limit 1`).length)throw new ServiceError(409,'REGISTRATION_CONFLICT');
  const used=input.players.filter(p=>p.ign);
  if((await tx`select team_id from aevic_platform.player_details where pubg_id=any(${used.map(p=>p.uid)}) limit 1`).length)throw new ServiceError(409,'PLAYER_ALREADY_REGISTERED');
  // This is a real named team. Its legacy-required credential is undisclosed;
  // the existing standalone account remains the only login identity.
  const unusedHash=await hashPassword(randomBytes(48).toString('base64url'));
  const values={team_name:input.teamName,captain_name:`${input.firstName} ${input.lastName}`,captain_contact:input.phone,email:identity.email,password_hash:unusedHash,status:'pending',tier:'entry',...Object.fromEntries(input.players.map((p,i)=>[`player${i+1}_ign`,p.ign||null]))};
  const [team]=await tx`insert into public.teams ${tx(values)} returning id::text`;
  await tx`insert into aevic_platform.team_authority(team_id,account_id,role) values(${team.id},${owner},'OWNER')`;
  await tx`insert into aevic_platform.team_details(team_id,tag,legacy_history_incomplete) values(${team.id},${input.tag},false)`;
  for(const [i,p]of input.players.entries())if(p.ign)await tx`insert into aevic_platform.player_details(team_id,slot,pubg_id,role) values(${team.id},${i+1},${p.uid},${p.role})`;
  await tx`update aevic_platform.account_onboarding set team_id=${team.id},completed_at=now(),draft='{}',revision=revision+1,updated_at=now() where account_id=${owner}`;
  await audit(tx,{accountId:owner,teamId:team.id},'account.team-setup','team',team.id);
  return {teamId:team.id};
 });
}

const app=new Hono<Env>(),limit=createAttemptLimiter();
app.get('/me/session',async(c,next)=>{
 const a=c.get('platform')?.actor;if(!a?.accountId)return next();
 c.header('Cache-Control','private, no-store');
 return c.json(await accountSession(platform(c).sql,a.accountId,getCookie(c,'aevic-workspace')));
});
app.get('/me/onboarding',async c=>{c.header('Cache-Control','private, no-store');return c.json(await onboardingState(platform(c).sql,account(c)));});
app.put('/me/onboarding',async c=>{
 const owner=account(c),input=await body(c,z.object({purpose,revision:z.number().int().nonnegative(),draft:setupDraftInput.optional()}).strict());
 await transaction(platform(c).sql,async tx=>{
  await lockAccount(tx,owner);
  const [current]=await tx`select completed_at,revision from aevic_platform.account_onboarding where account_id=${owner} for update`;
  if((current?.revision??0)!==input.revision)throw new ServiceError(409,'STALE_VERSION');
  // Joining through an invitation also satisfies setup; never replace membership.
  if((await tx`select team_id from aevic_platform.team_authority where account_id=${owner}`).length)throw new ServiceError(409,'ALREADY_MEMBER');
  await tx`insert into aevic_platform.account_onboarding(account_id,purpose,draft,completed_at,revision) values(${owner},${input.purpose},${tx.json(input.draft??{})},case when ${input.purpose==='spectator'} then now() else null end,1) on conflict(account_id) do update set purpose=excluded.purpose,draft=coalesce(${input.draft?tx.json(input.draft):null},aevic_platform.account_onboarding.draft),completed_at=excluded.completed_at,team_id=null,revision=aevic_platform.account_onboarding.revision+1,updated_at=now()`;
  await audit(tx,{accountId:owner},'account.onboarding','account',owner,{purpose:input.purpose});
 });return c.json(await onboardingState(platform(c).sql,owner));
});
app.post('/me/onboarding/team',async c=>{
 const input=await body(c,setupInput),key=text(8,128).parse(c.req.header('idempotency-key'));
 const result=await completeTeamSetup(platform(c).sql,actor(c),input,key);
 setCookie(c,'aevic-workspace',result.teamId,{path:'/',httpOnly:true,secure:c.get('config').secureCookies,sameSite:'Strict'});
 return c.json(result,201);
});
async function verification(c:ApiContext,id:string,to:string){
 const token=randomBytes(32).toString('base64url');
 const [row]=await platform(c).sql`insert into aevic_platform.email_verifications(team_id,token_digest,expires_at) values(${id},${tokenDigest(token)},now()+interval '30 minutes') on conflict(team_id) do update set token_digest=excluded.token_digest,expires_at=excluded.expires_at,created_at=now(),consumed_at=null where aevic_platform.email_verifications.consumed_at is null and aevic_platform.email_verifications.created_at<now()-interval '60 seconds' returning team_id`;
 if(row){const link=new URL('/verify-email',c.get('config').siteUrl);link.hash=new URLSearchParams({token}).toString();try{await sendVerification(c.get('config'),to,link.href);}catch{console.warn(JSON.stringify({event:'verification_delivery_failed',requestId:c.get('requestId')}));}}
}
app.post('/auth/register',async c=>{
 limit('account-register',c.req.header('x-nf-client-connection-ip')??'local',5);
 const input=await body(c,emailAccountInput),config=c.get('config'),sql=platform(c).sql;
 if((config.sessionSecret??'').length<32)throw new ServiceError(503,'CAPTAIN_AUTH_NOT_CONFIGURED');
 if(!config.smtp||!config.emailFrom)throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
 const hash=await hashPassword(input.password);
 const result=await idempotent(sql,{accountId:'register:'+digest(config.sessionSecret??'','account-register',input.email)},input.idempotencyKey,'account.register',digest(config.sessionSecret??'','account-register-payload',JSON.stringify(input)),async tx=>{
  await tx`select pg_advisory_xact_lock(184621,1)`;
  const [setting]=await tx`select value from aevic_platform.settings where key='platform'`;if(setting?.value.registrationEnabled===false)throw new ServiceError(409,'REGISTRATION_CLOSED');
  if((await tx`select id from aevic_platform.account_identity where lower(btrim(email))=${input.email}`).length)throw new ServiceError(409,'REGISTRATION_CONFLICT');
  const [row]=await tx`insert into aevic_platform.accounts(email,password_hash,captain_name) values(${input.email},${hash},${input.firstName+' '+input.lastName}) returning id::text`;
  await tx`insert into aevic_platform.account_onboarding(account_id,purpose,completed_at) values(${row.id},${input.purpose},case when ${input.purpose==='spectator'} then now() else null end)`;
  await audit(tx,{accountId:row.id},'account.register','account',row.id);return {accountId:row.id};
 });
 const issued=await transaction(sql,async tx=>{
  const row=await lockAccount(tx,result.accountId);
  if(row.status==='banned'||!await verifyPassword(input.password,row.password_hash)||(await tx`select enabled_at from aevic_platform.mfa_factors where team_id=${row.id} and enabled_at is not null`).length)throw new ServiceError(401,'LOGIN_REQUIRED');
  if(tokensEnabled(c))return issueTokens(c,tx,{accountId:row.id},row.password_hash,false,false);
  else {const cookie=makeSession(row.id,row.password_hash,config.sessionSecret??'',8*3600);await tx`insert into aevic_platform.sessions(token_digest,team_id,expires_at,device) values(${tokenDigest(cookie)},${row.id},to_timestamp(${Number(cookie.split('.')[1])}),${(c.req.header('user-agent')??'Browser').slice(0,300)})`;setCookie(c,captainCookieName(c),cookie,{path:'/',httpOnly:true,secure:config.secureCookies,sameSite:'Strict'});}
 });
 await verification(c,result.accountId,input.email);
 if(issued)saveTokens(c,issued);
 return c.json({...await accountSession(sql,result.accountId),...(issued?{sessionMode:'tokens',accessToken:issued.accessToken,accessExpiresAt:issued.accessExpiresAt}:{sessionMode:'legacy'})},201);
});
export default app;
