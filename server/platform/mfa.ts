import {lockAccount} from './account-store';
import {Hono} from 'hono';
import {getCookie} from 'hono/cookie';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import type {TransactionSql} from 'postgres';
import type {Env,ApiContext} from '../types';
import type {Actor} from './repository';
import {platform,actor,adminCookieName,captainCookieName,tokenDigest} from './context';
import {actorKey,transaction,audit} from './competition';
import {body} from '../validation/input';
import {verifyPassword} from '../captain/crypto';
import {createAttemptLimiter} from '../captain/limit';
import {ServiceError} from '../errors';
import {base32,acceptedStep,sealSecret,openSecret,generateRecovery,recoveryDigest} from './totp';

export async function consumeFactor(tx:TransactionSql,identity:Actor,master:string,code?:string){
 const key=actorKey(identity),[factor]=await tx`select * from aevic_platform.mfa_factors where actor_key=${key} for update`;
 if(!factor?.enabled_at)return false;
 if(!code)throw new ServiceError(401,'MFA_REQUIRED');
 const step=acceptedStep(openSecret(factor.secret_ciphertext,master,key),code,Number(factor.last_step));
 if(step!==undefined){await tx`update aevic_platform.mfa_factors set last_step=${step} where actor_key=${key}`;return true;}
 const digest=recoveryDigest(code,master,key);
 if(!factor.recovery_digests.includes(digest))throw new ServiceError(401,'MFA_INVALID');
 await tx`update aevic_platform.mfa_factors set recovery_digests=array_remove(recovery_digests,${digest}) where actor_key=${key}`;return true;
}
async function lockCredential(tx:TransactionSql,a:Actor,expected:string){
 const [row]=a.adminId?await tx`select password_hash from aevic_platform.admin_accounts where id=${a.adminId} and active for update`:[await lockAccount(tx,a.teamId!)];
 if(!row||row.password_hash!==expected)throw new ServiceError(409,'ACCOUNT_CHANGED');
}
const app=new Hono<Env>(),limit=createAttemptLimiter();
const currentDigest=(c:ApiContext)=>tokenDigest(getCookie(c,platform(c).actor.adminId?adminCookieName(c):captainCookieName(c))??'');
const master=(c:ApiContext)=>c.get('config').sessionSecret??'';
app.get('/me/2fa',async c=>{const key=actorKey(actor(c)),[f]=await platform(c).sql`select enabled_at,cardinality(recovery_digests) as remaining from aevic_platform.mfa_factors where actor_key=${key}`;return c.json({enabled:Boolean(f?.enabled_at),required:false,setupAvailable:true,backupCodesRemaining:f?.remaining??0});});
app.post('/me/2fa/setup',async c=>{
 const a=actor(c),key=actorKey(a),sql=platform(c).sql;limit('mfa-setup',key,3);
 const input=await body(c,z.object({password:z.string().min(1).max(128)}).strict());
 const [credential]=a.adminId?await sql`select password_hash from aevic_platform.admin_accounts where id=${a.adminId}`:await sql`select password_hash from aevic_platform.account_identity where id=${a.teamId!}`;
 if(!await verifyPassword(input.password,credential?.password_hash))throw new ServiceError(401,'PASSWORD_CHANGE_FAILED');
 const bytes=randomBytes(20),ciphertext=sealSecret(bytes,master(c),key),id=crypto.randomUUID();
 const [account]=a.adminId?await sql`select email from aevic_platform.admin_accounts where id=${a.adminId}`:await sql`select email from aevic_platform.account_identity where id=${a.teamId!}`;
 const result=await transaction(sql,async tx=>{await lockCredential(tx,a,credential.password_hash);return tx`insert into aevic_platform.mfa_factors(actor_key,team_id,admin_id,secret_ciphertext,setup_id,setup_expires_at) values(${key},${a.teamId??null},${a.adminId??null},${ciphertext},${id},now()+interval '10 minutes') on conflict(actor_key) do update set secret_ciphertext=excluded.secret_ciphertext,setup_id=excluded.setup_id,setup_expires_at=excluded.setup_expires_at,last_step=-1 where aevic_platform.mfa_factors.enabled_at is null returning setup_expires_at`;});
 if(!result.length)throw new ServiceError(409,'MFA_ALREADY_ENABLED');
 const uri=`otpauth://totp/${encodeURIComponent('AEVIC:'+account.email)}?secret=${base32(bytes)}&issuer=AEVIC&algorithm=SHA1&digits=6&period=30`;
 const {toString}=await import('qrcode');return c.json({setupId:id,otpauthUri:uri,qrSvg:await toString(uri,{type:'svg'}),expiresAt:result[0].setup_expires_at});
});
app.post('/me/2fa/setup/verification',async c=>{
 const a=actor(c),key=actorKey(a);limit('mfa-confirm',key,10);const input=await body(c,z.object({setupId:z.uuid(),code:z.string().regex(/^\d{6}$/)}).strict());
 const generated=generateRecovery(master(c),key);
 await transaction(platform(c).sql,async tx=>{
  const [f]=await tx`select * from aevic_platform.mfa_factors where actor_key=${key} and setup_id=${input.setupId} and setup_expires_at>now() and enabled_at is null for update`;if(!f)throw new ServiceError(409,'MFA_SETUP_EXPIRED');
  const step=acceptedStep(openSecret(f.secret_ciphertext,master(c),key),input.code,-1);if(step===undefined)throw new ServiceError(422,'MFA_INVALID');
  await tx`update aevic_platform.mfa_factors set enabled_at=now(),last_step=${step},recovery_digests=${generated.digests} where actor_key=${key}`;
  await tx`update aevic_platform.sessions set revoked_at=case when token_digest=${currentDigest(c)} then revoked_at else now() end,mfa_verified_at=case when token_digest=${currentDigest(c)} then now() else mfa_verified_at end where (${a.adminId??null}::uuid is not null and admin_id=${a.adminId??null}) or (${a.teamId??null}::bigint is not null and team_id=${a.teamId??null})`;
  await audit(tx,a,'mfa.enable','account',key);
 });return c.json({codes:generated.codes,generatedAt:new Date().toISOString()});
});
async function changeFactor(c:ApiContext,disable:boolean){
 const a=actor(c),key=actorKey(a);limit('mfa-change',key,5);const input=await body(c,z.object({password:z.string().min(1).max(128),code:z.string().min(6).max(40)}).strict()),sql=platform(c).sql;
 const [account]=a.adminId?await sql`select password_hash from aevic_platform.admin_accounts where id=${a.adminId}`:await sql`select password_hash from aevic_platform.account_identity where id=${a.teamId!}`;
 if(!await verifyPassword(input.password,account?.password_hash))throw new ServiceError(401,'PASSWORD_CHANGE_FAILED');
 const generated=generateRecovery(master(c),key);
 await transaction(sql,async tx=>{await lockCredential(tx,a,account.password_hash);if(!await consumeFactor(tx,a,master(c),input.code))throw new ServiceError(409,'MFA_NOT_ENABLED');if(disable)await tx`delete from aevic_platform.mfa_factors where actor_key=${key}`;else await tx`update aevic_platform.mfa_factors set recovery_digests=${generated.digests} where actor_key=${key}`;await audit(tx,a,disable?'mfa.disable':'mfa.recovery-refresh','account',key);});
 return disable?c.body(null,204):c.json({codes:generated.codes,generatedAt:new Date().toISOString()});
}
app.delete('/me/2fa',c=>changeFactor(c,true));
app.post('/me/2fa/recovery-codes',c=>changeFactor(c,false));
export default app;
