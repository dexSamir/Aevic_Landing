import { Hono } from 'hono';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { Env, ApiContext } from '../types';
import { client, command } from '../db';
import { body,email,password,token,text,registration } from '../validation/input';
import { authenticate,clearSession,saveSession } from '../auth/session';
import { dbError,ServiceError } from '../errors';

export async function sessionView(c: ApiContext) {
 const user=await authenticate(c); const db=c.get('db');
 const [profile,membership,admin]=await Promise.all([db.from('profiles').select('*').eq('id',user!.id).maybeSingle(),db.from('team_members').select('team_id,role').eq('user_id',user!.id).eq('status','ACTIVE').maybeSingle(),db.from('admin_roles').select('role').eq('user_id',user!.id).maybeSingle()]);
 [profile,membership,admin].forEach(r=>dbError(r.error));
 const role=admin.data?'admin':membership.data?(['OWNER','CAPTAIN','CO_CAPTAIN'].includes(membership.data.role)?'captain':'team'):'visitor';
 return { user:{id:user!.id,email:user!.email??'',firstName:profile.data?.first_name??'',lastName:profile.data?.last_name??'',phone:profile.data?.phone??undefined,teamId:membership.data?.team_id,role},role };
}
export async function rateLimit(c: ApiContext, category: string, maximum=15) {
 // Netlify supplies this header at its trusted edge. Locally all clients share a bucket.
 const ip=c.req.header('x-nf-client-connection-ip')??'local';
 const key=createHash('sha256').update(`${category}:${ip}`).digest('hex');
 const {data,error}=await client(c.get('config'),undefined,true).rpc('rate_limit',{bucket_key:key,max_hits:maximum,window_seconds:60});
 dbError(error); if(!data) {c.header('Retry-After','60');throw new ServiceError(429,'RATE_LIMITED');}
}
const auth = new Hono<Env>();
auth.post('/auth/login',async c=>{
 const input=await body(c,z.object({email,password:z.string().min(1).max(128),remember:z.boolean().default(false)})); await rateLimit(c,'login');
 const {data,error}=await client(c.get('config')).auth.signInWithPassword({email:input.email,password:input.password});
 if(error && (error.status === 0 || (error.status ?? 500) >= 500)) throw new ServiceError(503,'AUTH_UNAVAILABLE');
 if(error||!data.session) throw new ServiceError(error?.status===429?429:401,'LOGIN_FAILED');
 saveSession(c,data.session,input.remember); return c.json(await sessionView(c));
});
auth.get('/me/session',async c=>c.json(await sessionView(c)));
auth.post('/auth/logout',async c=>{
 await authenticate(c,false); const access=c.get('accessToken');
 if(access) {const {error}=await client(c.get('config'),undefined,true).auth.admin.signOut(access,'local'); if(error && error.status!==401 && error.status!==403) throw new ServiceError(503,'LOGOUT_FAILED');}
 clearSession(c);return c.body(null,204);
});
auth.post('/auth/password-reset',async c=>{
 const input=await body(c,z.object({email})); await rateLimit(c,'recovery',5);
 const {error}=await client(c.get('config')).auth.resetPasswordForEmail(input.email,{redirectTo:`${c.get('config').siteUrl}/reset-password`});
 if(error && (error.status??500)>=500) throw new ServiceError(503,'AUTH_UNAVAILABLE');
 return c.body(null,204);
});
// Inspection does not consume a one-use token. Validity is checked by Auth on confirmation.
// Never put tokens in query logs on our API: the adapter uses POST for inspection.
auth.post('/auth/password-reset/inspect',async c=>{const input=await body(c,z.object({token:z.string()}));return c.json({state:token.safeParse(input.token).success?'valid':'invalid'});});
auth.post('/auth/password-reset/confirm',async c=>{
 const input=await body(c,z.object({token,password}));await rateLimit(c,'recovery-confirm',10);
 const db=client(c.get('config'));const {data,error}=await db.auth.verifyOtp({token_hash:input.token,type:'recovery'});
 if(error||!data.session) throw new ServiceError(422,'INVALID_RECOVERY_TOKEN');
 const {error:updateError}=await db.auth.updateUser({password:input.password});
 if(updateError) throw new ServiceError(422,'PASSWORD_RESET_FAILED');
 const revoked=await client(c.get('config'),undefined,true).auth.admin.signOut(data.session.access_token,'global');
 clearSession(c);if(revoked.error)throw new ServiceError(503,'SESSION_REVOCATION_FAILED');return c.body(null,204);
});
auth.post('/auth/email-verification/inspect',async c=>{const input=await body(c,z.object({token:z.string()}));return c.json({state:token.safeParse(input.token).success?'valid':'invalid'});});
auth.post('/auth/email-verification/confirm',async c=>{
 const input=await body(c,z.object({token}));await rateLimit(c,'verification',10);
 const {data,error}=await client(c.get('config')).auth.verifyOtp({token_hash:input.token,type:'signup'});
 if(error||!data.session) throw new ServiceError(422,'INVALID_VERIFICATION_TOKEN');
 saveSession(c,data.session,false);return c.body(null,204);
});
auth.post('/auth/email-verification/resend',async c=>{
 const input=await body(c,z.object({email:email.optional()}));await rateLimit(c,'verification-resend',5);
 const user=await authenticate(c,false);const target=input.email??user?.email;
 if(target) {const {error}=await client(c.get('config')).auth.resend({type:'signup',email:target,options:{emailRedirectTo:`${c.get('config').siteUrl}/verify-email`}});if(error && (error.status??500)>=500)throw new ServiceError(503,'AUTH_UNAVAILABLE');}
 return c.body(null,204);
});
auth.post('/registrations',async c=>{
 const input=await body(c,registration);await rateLimit(c,'signup',5);
 const {data,error}=await client(c.get('config')).auth.signUp({email:input.draft.email,password:input.password,options:{data:{teamDraft:input.draft},emailRedirectTo:`${c.get('config').siteUrl}/verify-email`}});
 if(error) throw new ServiceError(error.status===429?429:422,'REGISTRATION_FAILED');
 // Same neutral receipt for existing emails; never expose account existence or log a draft.
 if(data.session)saveSession(c,data.session,false);
 return c.json({registrationId:input.idempotencyKey,status:'submitted',duplicate:false,source:'backend'},201);
});
auth.get('/me/account',async c=>{const session=await sessionView(c);return c.json({user:session.user,emailVerified:Boolean(c.get('user')?.email_confirmed_at),dataExportStatus:'backend-required'});});
auth.patch('/me/account',async c=>{await authenticate(c);await command(c.get('db'),'profile.update',await body(c,z.object({firstName:text(1,80),lastName:text(1,80),phone:text(0,30).optional()})));const session=await sessionView(c);return c.json({user:session.user,emailVerified:Boolean(c.get('user')?.email_confirmed_at),dataExportStatus:'backend-required'});});
auth.put('/me/account/password',async c=>{
 const user=await authenticate(c);const input=await body(c,z.object({currentPassword:z.string().min(1).max(128),newPassword:password}));await rateLimit(c,'password-change');
 const db=client(c.get('config'));const {data,error}=await db.auth.signInWithPassword({email:user!.email!,password:input.currentPassword});
 if(error||!data.session)throw new ServiceError(401,'PASSWORD_CHANGE_FAILED');
 const update=await db.auth.updateUser({password:input.newPassword});if(update.error)throw new ServiceError(422,'PASSWORD_CHANGE_FAILED');
 const revoked=await client(c.get('config'),undefined,true).auth.admin.signOut(data.session.access_token,'others');saveSession(c,data.session,false);if(revoked.error)throw new ServiceError(503,'SESSION_REVOCATION_FAILED');return c.body(null,204);
});
auth.get('/me/2fa',async c=>{const user=await authenticate(c);return c.json({enabled:user!.factors?.some(f=>f.status==='verified')??false,required:false,setupAvailable:false});});
auth.delete('/me/sessions/others',async c=>{await authenticate(c);const {error}=await client(c.get('config'),undefined,true).auth.admin.signOut(c.get('accessToken')!,'others');dbError(error);return c.body(null,204);});
auth.get('/me/realtime',async c=>{await authenticate(c);return c.json({url:c.get('config').supabaseUrl,key:c.get('config').publishableKey,accessToken:c.get('accessToken'),userId:c.get('user')!.id});});
export default auth;
