import {Hono} from 'hono';
import {z} from 'zod';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import type {Env} from '../types';
import {body,email} from '../validation/input';
import {platform,tokenDigest} from './context';
import {sendVerification} from './email';
import {ServiceError} from '../errors';
import {createAttemptLimiter} from '../captain/limit';
const app=new Hono<Env>(),limit=createAttemptLimiter();
app.post('/auth/email-verification/resend',async c=>{
 const start=performance.now(),input=await body(c,z.object({email:email.optional()}).strict()),r=platform(c);
 limit('verification',c.req.header('x-nf-client-connection-ip')??'local',5);
 const config=c.get('config');if(!config.emailFrom||!(config.smtp||config.resendKey))throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
 try{
  const rows=r.actor.teamId?await r.sql`select id::text,email from aevic_platform.account_identity where id=${r.actor.teamId}`:await r.sql`select id::text,email from aevic_platform.account_identity where lower(btrim(email))=${input.email??''} limit 2`;
  if(rows.length===1){const row=rows[0],token=randomBytes(32).toString('base64url'),[v]=await r.sql`insert into aevic_platform.email_verifications(team_id,token_digest,expires_at) values(${row.id},${tokenDigest(token)},now()+interval '30 minutes') on conflict(team_id) do update set token_digest=excluded.token_digest,expires_at=excluded.expires_at,created_at=now(),consumed_at=null where aevic_platform.email_verifications.created_at<now()-interval '60 seconds' returning team_id`;
   if(v){const link=new URL('/verify-email',config.siteUrl);link.hash=new URLSearchParams({token}).toString();try{await sendVerification(config,row.email,link.href);}catch{console.warn('AEVIC_VERIFICATION_DELIVERY_FAILED');}}
  }
 }finally{await delay(Math.max(0,1500-(performance.now()-start)));}
 return c.body(null,204);
});
app.post('/auth/email-verification/inspect',async c=>{
 const input=await body(c,z.object({token:z.string().max(100)}).strict());
 if(!/^[A-Za-z0-9_-]{43}$/.test(input.token))return c.json({state:'invalid'});
 const [v]=await platform(c).sql`select consumed_at,expires_at,clock_timestamp() as server_now from aevic_platform.email_verifications where token_digest=${tokenDigest(input.token)}`;
 return c.json({state:!v?'invalid':v.consumed_at?'already-verified':v.expires_at<=v.server_now?'expired':'valid'});
});
app.post('/auth/email-verification/confirm',async c=>{
 const input=await body(c,z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict());
 await platform(c).sql.begin(async tx=>{const [v]=await tx`update aevic_platform.email_verifications set consumed_at=now() where token_digest=${tokenDigest(input.token)} and expires_at>clock_timestamp() and consumed_at is null returning team_id`;if(!v)throw new ServiceError(422,'INVALID_VERIFICATION_TOKEN');await tx`update aevic_platform.accounts set email_verified_at=now() where id=${v.team_id}`;});
 return c.body(null,204);
});
export default app;
