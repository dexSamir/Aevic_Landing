import {Hono} from 'hono';
import {z} from 'zod';
import type {Sql,TransactionSql} from 'postgres';
import type {Env} from '../types';
import {platform,actor,admin} from './context';
import {body,text,email} from '../validation/input';
import {transaction,audit,notify} from './competition';
import {issueAdminSetup} from './admin-recovery';
import {ServiceError} from '../errors';
import {createAttemptLimiter} from '../captain/limit';
const roles=z.enum(['super-admin','tournament-manager','result-operator','support-moderator']);
async function currentSuper(tx:TransactionSql,id:string){await tx`select pg_advisory_xact_lock(hashtextextended('admin-account-management',0))`;if(!(await tx`select id from aevic_platform.admin_accounts where id=${id} and active and role='super-admin'`).length)throw new ServiceError(403,'FORBIDDEN');}
async function users(sql:Sql){return await sql`select a.id,coalesce(nullif(btrim(concat_ws(' ',a.first_name,a.last_name)),''),a.email) as name,a.email,a.role,case when not a.active then 'suspended' when a.password_hash is null then 'invited' else 'active' end as status,exists(select 1 from aevic_platform.mfa_factors f where f.admin_id=a.id and f.enabled_at is not null) as "twoFactorEnabled",(select max(last_active_at) from aevic_platform.sessions s where s.admin_id=a.id) as "lastActiveAt" from aevic_platform.admin_accounts a order by a.created_at,a.id`;}
export function adminManagementRoutes(deliver:typeof issueAdminSetup=issueAdminSetup){
 const app=new Hono<Env>(),limit=createAttemptLimiter();
 app.get('/admin/users',async c=>{admin(c,['super-admin']);return c.json(await users(platform(c).sql));});
 app.post('/admin/users',async c=>{
  const reviewer=admin(c,['super-admin']),input=await body(c,z.object({email,firstName:text(1,80),lastName:text(1,80),role:roles}).strict()),config=c.get('config');limit('admin-invite',reviewer,10);
  if(!config.emailFrom||!(config.smtp||config.resendKey))throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
  const id=await transaction(platform(c).sql,async tx=>{await currentSuper(tx,reviewer);if((await tx`select id from aevic_platform.admin_accounts where email=${input.email}`).length)throw new ServiceError(409,'ADMIN_ALREADY_EXISTS');const [r]=await tx`insert into aevic_platform.admin_accounts(email,first_name,last_name,role) values(${input.email},${input.firstName},${input.lastName},${input.role}) returning id`;await audit(tx,actor(c),'admin.invite','admin',r.id,{role:input.role});return r.id;});
  try{await deliver(platform(c).sql,config,id);}catch{throw new ServiceError(503,'ADMIN_SETUP_DELIVERY_FAILED');}
  return c.json((await users(platform(c).sql)).find(u=>u.id===id),201);
 });
 app.post('/admin/users/:id/setup-email',async c=>{
  const reviewer=admin(c,['super-admin']),id=z.uuid().parse(c.req.param('id'));limit('admin-setup-resend',reviewer,5);
  const config=c.get('config');if(!config.emailFrom||!(config.smtp||config.resendKey))throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
  await transaction(platform(c).sql,async tx=>{await currentSuper(tx,reviewer);if(!(await tx`select id from aevic_platform.admin_accounts where id=${id} and active and password_hash is null`).length)throw new ServiceError(409,'INVITATION_NOT_PENDING');await audit(tx,actor(c),'admin.setup-resend','admin',id);});
  await deliver(platform(c).sql,config,id);return c.body(null,204);
 });
 app.patch('/admin/users/:id',async c=>{
  const reviewer=admin(c,['super-admin']),id=z.uuid().parse(c.req.param('id')),input=await body(c,z.object({role:roles,active:z.boolean()}).strict());
  await transaction(platform(c).sql,async tx=>{
   await currentSuper(tx,reviewer);const [target]=await tx`select role,active from aevic_platform.admin_accounts where id=${id} for update`;if(!target)throw new ServiceError(404,'ADMIN_NOT_FOUND');
   if(id===reviewer&&(input.role!==target.role||!input.active))throw new ServiceError(409,'SELF_PERMISSION_CHANGE');
   if(target.active&&target.role==='super-admin'&&(!input.active||input.role!=='super-admin')&&!(await tx`select id from aevic_platform.admin_accounts where id<>${id} and active and password_hash is not null and role='super-admin'`).length)throw new ServiceError(409,'LAST_SUPER_ADMIN');
   await tx`update aevic_platform.admin_accounts set role=${input.role},active=${input.active},reset_digest=case when ${input.active} then reset_digest else null end,reset_expires_at=case when ${input.active} then reset_expires_at else null end where id=${id}`;
   if(!input.active||input.role!==target.role)await tx`update aevic_platform.sessions set revoked_at=now() where admin_id=${id} and revoked_at is null`;
   await audit(tx,actor(c),'admin.permissions','admin',id,{role:input.role,active:input.active});
  });return c.json((await users(platform(c).sql)).find(u=>u.id===id));
 });
 app.post('/admin/teams/bulk-approval',async c=>{
  admin(c,['tournament-manager']);const input=await body(c,z.object({teamIds:z.array(z.string().regex(/^[1-9]\d{0,18}$/)).min(1).max(50),status:z.enum(['approved','rejected']),reason:text(0,1000).optional()}).strict());
  if(new Set(input.teamIds).size!==input.teamIds.length||input.status==='rejected'&&(input.reason?.trim().length??0)<10)throw new ServiceError(422,'VALIDATION_ERROR');
  await transaction(platform(c).sql,async tx=>{
   const rows=await tx`select id::text,status from public.teams where id=any(${input.teamIds}) order by id for update`;if(rows.length!==input.teamIds.length||rows.some(r=>r.status!=='pending'))throw new ServiceError(409,'TEAM_REVIEW_CHANGED');
   await tx`update public.teams set status=${input.status},rejection_reason=${input.reason??null} where id=any(${input.teamIds})`;
   for(const row of rows){await audit(tx,actor(c),'team.approval','team',row.id,{status:input.status,reason:input.reason,bulk:true});await notify(tx,row.id,'Komanda statusu yeniləndi',input.reason??input.status,'/team');}
  });return c.json({updated:input.teamIds.length});
 });
 return app;
}
export default adminManagementRoutes();
