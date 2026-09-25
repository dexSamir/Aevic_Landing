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
 const result=await registerOriginalTeam(platform(c).sql,config.sessionSecret??'',input);
 setCookie(c,captainCookieName(c),result.cookie,{path:'/',httpOnly:true,secure:config.secureCookies,sameSite:'Strict'});
 return c.json(result.receipt,201);
});
export default app;
