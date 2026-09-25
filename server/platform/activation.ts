import {Hono} from 'hono';
import {z} from 'zod';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import type {Sql} from 'postgres';
import type {Env} from '../types';
import {hashPassword} from '../captain/crypto';
import {createAttemptLimiter} from '../captain/limit';
import {body,email,password} from '../validation/input';
import {platform,tokenDigest} from './context';
import {transaction} from './competition';
import {sendVerification} from './email';
import {ServiceError} from '../errors';
export async function createStandaloneAccount(sql:Sql,address:string,secret:string){
 const hash=await hashPassword(secret),token=randomBytes(32).toString('base64url');
 return transaction(sql,async tx=>{
  // Shares registration's lock to prevent email collisions across both identity sources.
  await tx`select pg_advisory_xact_lock(184621,1)`;
  if((await tx`select id from aevic_platform.account_identity where lower(btrim(email))=${address}`).length)return undefined;
  const [row]=await tx`insert into aevic_platform.accounts(email,password_hash) values(${address},${hash}) returning id::text`;
  await tx`insert into aevic_platform.email_verifications(team_id,token_digest,expires_at) values(${row.id},${tokenDigest(token)},now()+interval '30 minutes')`;
  return{id:row.id,token};
 });
}
const app=new Hono<Env>(),limit=createAttemptLimiter();
app.post('/auth/legacy-activation',async c=>{
 const start=performance.now(),input=await body(c,z.object({email,password}).strict()),config=c.get('config');
 limit('activation-ip',c.req.header('x-nf-client-connection-ip')??'local',5);limit('activation-email',input.email,3);
 if(!config.emailFrom||!(config.smtp||config.resendKey))throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
 try{const created=await createStandaloneAccount(platform(c).sql,input.email,input.password);if(created){const link=new URL('/verify-email',config.siteUrl);link.hash=new URLSearchParams({token:created.token}).toString();try{await sendVerification(config,input.email,link.href);}catch{console.warn('AEVIC_ACTIVATION_DELIVERY_FAILED');}}}
 finally{await delay(Math.max(0,2000-(performance.now()-start)));}
 return c.json({accepted:true},202);
});
export default app;
