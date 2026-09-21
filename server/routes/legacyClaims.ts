import {Hono} from 'hono';
import {z} from 'zod';
import {createHash,randomBytes} from 'node:crypto';
import type {ApiContext,Env} from '../types';
import {authenticate,requireAdmin} from '../auth/session';
import {body,email,id,password,playerDraft} from '../validation/input';
import {client} from '../db';
import {dbError,ServiceError} from '../errors';
import {rateLimit} from './auth';
const app=new Hono<Env>();
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
async function run(c:ApiContext,action:string,payload:unknown={}){
 await authenticate(c);const {data,error}=await c.get('db').rpc('legacy_claim',{action,payload});dbError(error);
 if(data?.ok===false)throw new ServiceError(data.code==='RATE_LIMITED'?429:422,data.code==='RATE_LIMITED'?'RATE_LIMITED':'CLAIM_INVALID');
 return data;
}
app.post('/auth/legacy-activation',async c=>{
 const input=await body(c,z.object({email,password}).strict());await rateLimit(c,'legacy-activation',5);
 const {data:allowed,error:limitError}=await client(c.get('config'),undefined,true).rpc('rate_limit',{bucket_key:digest(`legacy-activation-email:${input.email}`),max_hits:3,window_seconds:3600});dbError(limitError);
 if(!allowed)throw new ServiceError(429,'RATE_LIMITED');
 // Account creation only; no teamDraft, no legacy hash, no metadata authority.
 // Uniform accepted receipt for new/existing/rejected addresses. Does not assert
 // delivery or create a session, and never performs a legacy team lookup.
 const {error}=await client(c.get('config')).auth.signUp({email:input.email,password:input.password,options:{emailRedirectTo:`${c.get('config').siteUrl}/verify-email`}});
 // Keep address-dependent rejections neutral, but report infrastructure failure.
 if(error&&(!error.status||error.status>=500||error.status===401||error.status===403))throw new ServiceError(503,'DATA_UNAVAILABLE');
 return c.json({accepted:true},202);
});
app.get('/me/legacy-claims',async c=>c.json(await run(c,'mine')));
app.post('/me/legacy-claims',async c=>{await rateLimit(c,'legacy-claim-request',10);await run(c,'request',await body(c,z.object({sourceKey:z.string().regex(/^[0-9]{1,19}$/)}).strict()));return c.json({accepted:true},202);});
app.post('/me/legacy-claims/:id/consume',async c=>{
 await rateLimit(c,'legacy-claim-consume',20);const input=await body(c,z.object({code:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict());
 return c.json(await run(c,'consume',{id:id.parse(c.req.param('id')),tokenHash:digest(input.code)}));
});
app.get('/me/legacy-roster',async c=>c.json(await run(c,'roster-info')));
app.put('/me/legacy-roster',async c=>{await run(c,'roster',await body(c,z.object({players:z.array(playerDraft).length(5)}).strict()));return c.body(null,204);});
app.get('/admin/legacy-teams',async c=>{await requireAdmin(c,['support-moderator']);return c.json(await run(c,'holdings'));});
app.get('/admin/legacy-claims',async c=>{await requireAdmin(c,['support-moderator']);return c.json(await run(c,'queue'));});
app.post('/admin/legacy-claims/:id/review',async c=>{
 await requireAdmin(c,['support-moderator']);const input=await body(c,z.object({decision:z.enum(['approve','reject']),evidenceRef:id,expectedVersion:z.number().int().positive()}).strict());
 const code=input.decision==='approve'?randomBytes(32).toString('base64url'):undefined;
 const result=await run(c,'review',{...input,id:id.parse(c.req.param('id')),...(code?{tokenHash:digest(code)}:{})});
 // One-time response to the authorized reviewer, never a URL or a public inbox.
 return c.json({expiresAt:result.expiresAt??undefined,code});
});
export default app;
