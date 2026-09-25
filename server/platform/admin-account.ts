import {Hono} from 'hono';
import {getCookie,deleteCookie} from 'hono/cookie';
import {z} from 'zod';
import type {Env,ApiContext} from '../types';
import {platform,adminCookieName,tokenDigest,actor} from './context';
import {body,text} from '../validation/input';
import {hashPassword,verifyPassword} from '../captain/crypto';
import {createAttemptLimiter} from '../captain/limit';
import {ServiceError} from '../errors';
import {transaction,audit} from './competition';
const app=new Hono<Env>(),limit=createAttemptLimiter();
const adminId=(c:ApiContext)=>platform(c).actor.adminId;
async function profile(c:ApiContext){const [row]=await platform(c).sql`select id,email,first_name,last_name,phone,email_verified_at from aevic_platform.admin_accounts where id=${adminId(c)!} and active`;if(!row)throw new ServiceError(401,'UNAUTHORIZED');return{user:{id:row.id,email:row.email,firstName:row.first_name,lastName:row.last_name,phone:row.phone??undefined,role:'admin'},emailVerified:Boolean(row.email_verified_at),dataExportStatus:'available'};}
app.get('/me/account',async(c,next)=>adminId(c)?c.json(await profile(c)):next());
app.patch('/me/account',async(c,next)=>{
 if(!adminId(c))return next();const input=await body(c,z.object({firstName:text(1,80),lastName:text(1,80),phone:text(0,30).optional()}).strict());
 await transaction(platform(c).sql,async tx=>{await tx`update aevic_platform.admin_accounts set first_name=${input.firstName},last_name=${input.lastName},phone=${input.phone??null} where id=${adminId(c)!} and active`;await audit(tx,actor(c),'admin.profile','admin',adminId(c)!);});return c.json(await profile(c));
});
app.put('/me/account/password',async(c,next)=>{
 const id=adminId(c);if(!id)return next();limit('admin-password',id,5);
 const input=await body(c,z.object({currentPassword:z.string().min(1).max(128),newPassword:z.string().min(8).max(128).regex(/[A-ZƏÖÜĞÇŞİ]/).regex(/[0-9]/)}).strict());
 const sql=platform(c).sql,[row]=await sql`select password_hash from aevic_platform.admin_accounts where id=${id} and active`;
 if(!row||!await verifyPassword(input.currentPassword,row.password_hash))throw new ServiceError(401,'PASSWORD_CHANGE_FAILED');
 const hash=await hashPassword(input.newPassword);
 await transaction(sql,async tx=>{const updated=await tx`update aevic_platform.admin_accounts set password_hash=${hash},reset_digest=null,reset_expires_at=null where id=${id} and active and password_hash=${row.password_hash} returning id`;if(!updated.length)throw new ServiceError(409,'ACCOUNT_CHANGED');await tx`update aevic_platform.sessions set revoked_at=now() where admin_id=${id} and revoked_at is null`;await audit(tx,actor(c),'admin.password-change','admin',id);});
 deleteCookie(c,adminCookieName(c),{path:'/',secure:c.get('config').secureCookies});return c.body(null,204);
});
app.get('/me/sessions',async(c,next)=>{
 const id=adminId(c);if(!id)return next();const current=tokenDigest(getCookie(c,adminCookieName(c))??'');
 const rows=await platform(c).sql`select id,device,last_active_at,token_digest,revoked_at from aevic_platform.sessions where admin_id=${id} and expires_at>now() order by last_active_at desc limit 100`;
 return c.json(rows.map(r=>({id:r.id,device:r.device,lastActiveAt:r.last_active_at,status:r.revoked_at?'revoked':r.token_digest===current?'current':'active'})));
});
app.delete('/me/sessions/others',async(c,next)=>{
 const id=adminId(c);if(!id)return next();const current=tokenDigest(getCookie(c,adminCookieName(c))??'');await platform(c).sql`update aevic_platform.sessions set revoked_at=now() where admin_id=${id} and token_digest<>${current} and revoked_at is null`;return c.body(null,204);
});
app.delete('/me/sessions/:id',async(c,next)=>{
 const owner=adminId(c);if(!owner)return next();const id=z.uuid().parse(c.req.param('id'));const rows=await platform(c).sql`update aevic_platform.sessions set revoked_at=now() where id=${id} and admin_id=${owner} returning id`;if(!rows.length)throw new ServiceError(404,'SESSION_NOT_FOUND');return c.body(null,204);
});
app.post('/me/data-export',async(c,next)=>{
 const id=adminId(c);if(!id)return next();
 const [r]=await platform(c).sql`insert into aevic_platform.account_requests(admin_id,kind,status) values(${id},'export','completed') returning id,created_at`;
 return c.json({id:r.id,status:'READY',requestedAt:r.created_at,completedAt:r.created_at,downloadUrl:`/api/me/data-export/${r.id}/download`},201);
});
app.get('/me/data-export/:id',async(c,next)=>{
 const owner=adminId(c);if(!owner)return next();const id=z.uuid().parse(c.req.param('id'));
 const [r]=await platform(c).sql`select id,created_at from aevic_platform.account_requests where id=${id} and admin_id=${owner} and kind='export'`;
 if(!r)throw new ServiceError(404,'EXPORT_NOT_FOUND');return c.json({id:r.id,status:'READY',requestedAt:r.created_at,completedAt:r.created_at,downloadUrl:`/api/me/data-export/${r.id}/download`});
});
app.get('/me/data-export/:id/download',async(c,next)=>{
 const owner=adminId(c);if(!owner)return next();const id=z.uuid().parse(c.req.param('id')),sql=platform(c).sql;
 if(!(await sql`select id from aevic_platform.account_requests where id=${id} and admin_id=${owner} and kind='export'`).length)throw new ServiceError(404,'EXPORT_NOT_FOUND');
 const sessions=await sql`select id,device,created_at,last_active_at,expires_at,revoked_at from aevic_platform.sessions where admin_id=${owner}`;
 c.header('Content-Disposition','attachment; filename="aevic-admin-account.json"');return c.json({exportedAt:new Date().toISOString(),profile:await profile(c),sessions});
});
app.post('/me/deletion',async(c,next)=>{
 const owner=adminId(c);if(!owner)return next();const sql=platform(c).sql;
 const result=await transaction(sql,async tx=>{
  // Serialize requests so the last active super-admin cannot leave without a successor.
  await tx`select pg_advisory_xact_lock(hashtextextended('admin-account-management',0))`;
  const [current]=await tx`select role from aevic_platform.admin_accounts where id=${owner} and active for update`;
  if(current?.role==='super-admin'&&!(await tx`select id from aevic_platform.admin_accounts where active and password_hash is not null and role='super-admin' and id<>${owner}`).length)return{blocked:true,reason:'Əvvəlcə başqa aktiv baş administrator təyin edin.'};
  await tx`insert into aevic_platform.account_requests(admin_id,kind) select ${owner},'deletion' where not exists(select 1 from aevic_platform.account_requests where admin_id=${owner} and kind='deletion' and status='pending')`;
  await audit(tx,actor(c),'admin.deletion-request','admin',owner);return{blocked:false};
 });return c.json(result);
});
export default app;
