import {Hono} from 'hono';
import {z} from 'zod';
import type {Env,ApiContext} from '../types';
import {body,text,socialLinks,pagination} from '../validation/input';
import {platform,ownTeam,admin,actor} from './context';
import {idempotent,transaction,audit,notify} from './competition';
import {ServiceError} from '../errors';
import {normalize} from './repository';
const app=new Hono<Env>();
async function requests(c:ApiContext){
 const r=platform(c),rows=normalize(await r.sql`select v.*,v.team_id::text,t.team_name from aevic_platform.verification_requests v join public.teams t on t.id=v.team_id where ${Boolean(r.actor.adminId)} or v.team_id=${r.actor.teamId??null} order by v.created_at desc,v.id`);
 return rows.map(v=>({id:v.id,entityType:'TEAM',entityId:v.team_id,entityName:v.team_name,representativeName:v.representative_name,officialSocials:v.official_socials,notes:v.notes,evidenceNames:[],status:v.status,safeReason:v.safe_reason??undefined,submittedAt:v.created_at,reviewedAt:v.reviewed_at??undefined,reviewedBy:v.reviewed_by??undefined}));
}
app.get('/verifications/entity',async c=>{z.literal('TEAM').parse(c.req.query('entityType'));const id=ownTeam(c,z.string().parse(c.req.query('entityId'))),item=(await requests(c)).find(v=>v.entityId===id);if(!item)throw new ServiceError(404,'NOT_FOUND');return c.json(item);});
app.post('/verifications',async c=>{
 const input=await body(c,z.object({entityType:z.literal('TEAM'),entityId:z.string(),entityName:text(0,120).optional(),representativeName:text(2,100),officialSocials:socialLinks,notes:text(20,4000),evidenceNames:z.array(z.string()).max(0).optional()}).strict());
 const teamId=ownTeam(c,input.entityId);if(!Object.values(input.officialSocials).some(Boolean))throw new ServiceError(422,'OFFICIAL_LINK_REQUIRED');
 const out=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'verification.apply',input,async tx=>{
  await tx`select id from public.teams where id=${teamId} for update`;
  const active=await tx`select id from aevic_platform.verification_requests where team_id=${teamId} and status in ('PENDING','APPROVED')`;if(active.length)throw new ServiceError(409,'VERIFICATION_ALREADY_ACTIVE');
  const [r]=await tx`insert into aevic_platform.verification_requests(team_id,representative_name,official_socials,notes) values(${teamId},${input.representativeName},${tx.json(input.officialSocials)},${input.notes}) returning id`;
  await audit(tx,actor(c),'verification.apply','verification',r.id);return{id:r.id};
 });return c.json((await requests(c)).find(v=>v.id===out.id),201);
});
app.get('/admin/verifications',async c=>{admin(c,['support-moderator']);const items=(await requests(c)).filter(v=>!c.req.query('status')||v.status===c.req.query('status')),p=pagination(c);return c.json({items:items.slice(p.offset,p.offset+p.limit),total:items.length,hasMore:p.offset+p.limit<items.length,nextCursor:p.offset+p.limit<items.length?String(p.offset+p.limit):undefined});});
app.get('/admin/verifications/:id',async c=>{admin(c,['support-moderator']);const id=z.uuid().parse(c.req.param('id')),item=(await requests(c)).find(v=>v.id===id);if(!item)throw new ServiceError(404,'NOT_FOUND');return c.json(item);});
app.patch('/admin/verifications/:id',async c=>{
 const reviewer=admin(c,['support-moderator']),id=z.uuid().parse(c.req.param('id')),input=await body(c,z.object({status:z.enum(['APPROVED','REJECTED','REVOKED']),expectedStatus:z.enum(['PENDING','APPROVED','REJECTED','REVOKED']),reason:text(10,4000)}).strict());
 await transaction(platform(c).sql,async tx=>{
  const [v]=await tx`select *,team_id::text from aevic_platform.verification_requests where id=${id} for update`;if(!v)throw new ServiceError(404,'NOT_FOUND');
  if(v.status!==input.expectedStatus)throw new ServiceError(409,'STALE_VERSION');
  if(!(v.status==='PENDING'&&['APPROVED','REJECTED'].includes(input.status)||v.status==='APPROVED'&&input.status==='REVOKED'))throw new ServiceError(409,'INVALID_VERIFICATION_TRANSITION');
  await tx`update aevic_platform.verification_requests set status=${input.status},safe_reason=${input.reason},reviewed_at=now(),reviewed_by=${reviewer},updated_at=now() where id=${id}`;
  await audit(tx,actor(c),'verification.review','verification',id,{status:input.status,reason:input.reason});
  await notify(tx,v.team_id,'Təsdiq müraciəti yeniləndi',input.reason,'/team/verification','system');
 });return c.json((await requests(c)).find(v=>v.id===id));
});
export default app;
