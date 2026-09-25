import {Hono} from 'hono';
import {z} from 'zod';
import type {Sql,TransactionSql} from 'postgres';
import type {Env,ApiContext} from '../types';
import {platform,actor,captain} from './context';
import {body,text,email,socialLinks,pagination} from '../validation/input';
import {transaction,idempotent,audit,notify} from './competition';
import {organizations} from '../services/identity';
import {ServiceError} from '../errors';
const app=new Hono<Env>();
async function authority(sql:Sql|TransactionSql,id:string,account:string,roles=['OWNER','MANAGER']) {
 const [org]=await sql`select id,name from aevic.organizations where id=${id} for update`;
 if(!org)throw new ServiceError(404,'ORGANIZATION_NOT_FOUND');
 const [member]=await sql`select role from aevic_platform.organization_members where organization_id=${id} and account_id=${account}`;
 if(!member||!roles.includes(member.role))throw new ServiceError(403,'FORBIDDEN');return org;
}
async function members(sql:Sql|TransactionSql,id:string){const rows=await sql`select m.id,m.account_id::text,m.role,m.created_at,t.captain_name from aevic_platform.organization_members m join aevic_platform.account_identity t on t.id=m.account_id where m.organization_id=${id} order by m.created_at,m.id`;return rows.map(r=>({id:r.id,userId:r.account_id,displayName:r.captain_name,role:r.role,joinedAt:r.created_at,status:'ACTIVE'}));}
async function result(c:ApiContext,id:string){return(await organizations(platform(c))).find(o=>o.id===id)!;}
function invitation(r:Record<string,any>){return{id:r.id,type:r.kind,entityId:r.organization_id,entityName:r.name,recipientLabel:r.captain_name,role:r.role??undefined,status:r.status==='PENDING'&&new Date(r.expires_at).getTime()<=Date.now()?'EXPIRED':r.status,createdAt:r.created_at,expiresAt:r.expires_at,respondedAt:r.responded_at??undefined};}
async function invitationById(sql:Sql|TransactionSql,id:string){const [r]=await sql`select i.*,o.name,t.captain_name from aevic_platform.organization_invitations i join aevic.organizations o on o.id=i.organization_id join aevic_platform.account_identity t on t.id=i.recipient_id where i.id=${id}`;return invitation(r);}
app.post('/organizations',async c=>{
 const owner=captain(c),input=await body(c,z.object({name:text(2,100),shortName:text(1,20),description:text(0,3000),country:text(0,80)}).strict());
 const created=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'organization.create',input,async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${'organization-name:'+input.name.toLowerCase()},0))`;
  if((await tx`select id from aevic.organizations where lower(name)=lower(${input.name})`).length)throw new ServiceError(409,'ORGANIZATION_NAME_TAKEN');
  const id=crypto.randomUUID(),slug=(input.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'organization')+'-'+id.slice(0,8);
  await tx`insert into aevic.organizations(id,name,slug,short_name,description,country) values(${id},${input.name},${slug},${input.shortName},${input.description},${input.country})`;
  await tx`insert into aevic_platform.organization_members(organization_id,account_id,role) values(${id},${owner},'OWNER')`;
  await audit(tx,actor(c),'organization.create','organization',id);return{id};
 });return c.json(await result(c,created.id),201);
});
app.get('/organizations/:id/members',async c=>{
 const id=z.uuid().parse(c.req.param('id')),owner=captain(c);
 await transaction(platform(c).sql,tx=>authority(tx,id,owner,['OWNER','MANAGER','MEMBER']));return c.json(await members(platform(c).sql,id));
});
app.put('/organizations/:id/social-links',async c=>{
 const id=z.uuid().parse(c.req.param('id')),owner=captain(c),input=await body(c,socialLinks);
 await transaction(platform(c).sql,async tx=>{await authority(tx,id,owner);await tx`update aevic.organizations set social_links=${tx.json(input)},updated_at=now() where id=${id}`;await audit(tx,actor(c),'organization.social','organization',id);});return c.json(await result(c,id));
});
app.get('/organizations/:id/invitations',async c=>{
 const id=z.uuid().parse(c.req.param('id')),owner=captain(c),{offset,limit}=pagination(c),sql=platform(c).sql;
 await transaction(sql,tx=>authority(tx,id,owner));
 const rows=await sql`select i.*,o.name,t.captain_name from aevic_platform.organization_invitations i join aevic.organizations o on o.id=i.organization_id join aevic_platform.account_identity t on t.id=i.recipient_id where i.organization_id=${id} order by i.created_at desc,i.id limit ${limit+1} offset ${offset}`;
 return c.json({items:rows.slice(0,limit).map(invitation),hasMore:rows.length>limit,nextCursor:rows.length>limit?String(offset+limit):undefined});
});
for(const kind of ['member','team'] as const)app.post(`/organizations/:id/${kind}-invitations`,async c=>{
 const id=z.uuid().parse(c.req.param('id')),owner=captain(c);
 const input=kind==='member'?await body(c,z.object({recipient:email,role:z.enum(['MANAGER','MEMBER'])}).strict()):await body(c,z.object({teamId:z.string().regex(/^\d+$/)}).strict());
 const out=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'organization.invite',{id,kind,...input},async tx=>{
  const org=await authority(tx,id,owner);const [recipient]='recipient' in input?await tx`select id::text from aevic_platform.account_identity where lower(email)=${input.recipient}`:await tx`select account_id::text as id from aevic_platform.team_authority where team_id=${'teamId' in input?input.teamId:null} and role='OWNER'`;
  if(!recipient)throw new ServiceError(422,'RECIPIENT_UNAVAILABLE');
  const type=kind==='member'?'ORGANIZATION_MEMBER':'ORGANIZATION_TEAM';
  const existing=kind==='member'?await tx`select id from aevic_platform.organization_members where organization_id=${id} and account_id=${recipient.id}`:await tx`select team_id from aevic_platform.organization_teams where team_id=${'teamId' in input?input.teamId:null}`;
  if(existing.length)throw new ServiceError(409,'ALREADY_LINKED');
  await tx`update aevic_platform.organization_invitations set status='EXPIRED' where organization_id=${id} and kind=${type} and (${kind==='member'} and recipient_id=${recipient.id} or ${kind==='team'} and target_team_id=${'teamId' in input?input.teamId:null}) and status='PENDING' and expires_at<=now()`;
  if((await tx`select id from aevic_platform.organization_invitations where organization_id=${id} and kind=${type} and (${kind==='member'} and recipient_id=${recipient.id} or ${kind==='team'} and target_team_id=${'teamId' in input?input.teamId:null}) and status='PENDING'`).length)throw new ServiceError(409,'INVITATION_PENDING');
  const [row]=await tx`insert into aevic_platform.organization_invitations(organization_id,recipient_id,target_team_id,kind,role) values(${id},${recipient.id},${'teamId' in input?input.teamId:null},${type},${'role' in input?input.role:null}) returning id`;
  await audit(tx,actor(c),'organization.invite','organization',id,{invitationId:row.id,kind});await notify(tx,recipient.id,'Təşkilat dəvəti',org.name+' sizə dəvət göndərdi.','/team/invitations','system');return await invitationById(tx,row.id);
 });return c.json(out,201);
});
app.post('/organization-invitations/:id/response',async c=>{
 const id=z.uuid().parse(c.req.param('id')),owner=captain(c),input=await body(c,z.object({response:z.enum(['ACCEPTED','REJECTED'])}).strict());
 const out=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'organization.respond',{id,...input},async tx=>{
  const [target]=await tx`select organization_id from aevic_platform.organization_invitations where id=${id} and recipient_id=${owner}`;if(!target)throw new ServiceError(404,'INVITATION_NOT_FOUND');
  await tx`select id from aevic.organizations where id=${target.organization_id} for update`;
  const [r]=await tx`select * from aevic_platform.organization_invitations where id=${id} for update`;
  if(r.status!=='PENDING'||new Date(r.expires_at).getTime()<=Date.now())throw new ServiceError(409,'INVITATION_CLOSED');
  if(input.response==='ACCEPTED'){
   if(r.kind==='ORGANIZATION_MEMBER')await tx`insert into aevic_platform.organization_members(organization_id,account_id,role) values(${r.organization_id},${owner},${r.role}) on conflict(organization_id,account_id) do nothing`;
   else {await tx`select id from public.teams where id=${r.target_team_id} for update`;if(!(await tx`select id from aevic_platform.team_authority where team_id=${r.target_team_id} and account_id=${owner} and role='OWNER'`).length)throw new ServiceError(403,'TEAM_OWNER_REQUIRED');if((await tx`select team_id from aevic_platform.organization_teams where team_id=${r.target_team_id}`).length)throw new ServiceError(409,'TEAM_ALREADY_LINKED');await tx`insert into aevic_platform.organization_teams(organization_id,team_id) values(${r.organization_id},${r.target_team_id})`;}
  }
  await tx`update aevic_platform.organization_invitations set status=${input.response},responded_at=now() where id=${id}`;await audit(tx,actor(c),'organization.invitation-response','organization',r.organization_id,{invitationId:id,response:input.response});return await invitationById(tx,id);
 });return c.json(out);
});
app.post('/organizations/:id/teams',async c=>{
 const id=z.uuid().parse(c.req.param('id')),owner=captain(c),input=await body(c,z.object({teamId:z.string().regex(/^\d+$/),gameKey:z.literal('pubg-mobile')}).strict());
 if(!(await platform(c).sql`select id from aevic_platform.team_authority where team_id=${input.teamId} and account_id=${owner} and role='OWNER'`).length)throw new ServiceError(403,'TEAM_CONSENT_REQUIRED');
 await transaction(platform(c).sql,async tx=>{await authority(tx,id,owner);await tx`select id from public.teams where id=${input.teamId} for update`;if(!(await tx`select id from aevic_platform.team_authority where team_id=${input.teamId} and account_id=${owner} and role='OWNER'`).length)throw new ServiceError(403,'TEAM_CONSENT_REQUIRED');const [existing]=await tx`select organization_id from aevic_platform.organization_teams where team_id=${input.teamId}`;if(existing&&existing.organization_id!==id)throw new ServiceError(409,'TEAM_ALREADY_LINKED');await tx`insert into aevic_platform.organization_teams(organization_id,team_id) values(${id},${input.teamId}) on conflict do nothing`;await audit(tx,actor(c),'organization.link','organization',id,{teamId:input.teamId});});return c.json(await result(c,id));
});
app.delete('/organizations/:id/teams/:teamId',async c=>{
 const id=z.uuid().parse(c.req.param('id')),teamId=z.string().regex(/^\d+$/).parse(c.req.param('teamId')),owner=captain(c);
 await transaction(platform(c).sql,async tx=>{if(!(await tx`select id from aevic_platform.team_authority where team_id=${teamId} and account_id=${owner} and role='OWNER'`).length)await authority(tx,id,owner);else await tx`select id from aevic.organizations where id=${id} for update`;await tx`delete from aevic_platform.organization_teams where organization_id=${id} and team_id=${teamId}`;await audit(tx,actor(c),'organization.unlink','organization',id,{teamId});});return c.json(await result(c,id));
});
app.post('/organizations/:id/ownership',async c=>{
 const id=z.uuid().parse(c.req.param('id')),owner=captain(c),input=await body(c,z.object({memberId:z.uuid(),confirmation:text(2,100)}).strict());
 const out=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'organization.ownership',{id,...input},async tx=>{
  const org=await authority(tx,id,owner,['OWNER']);if(input.confirmation!==org.name)throw new ServiceError(422,'CONFIRMATION_MISMATCH');
  const [target]=await tx`select account_id::text from aevic_platform.organization_members where organization_id=${id} and id=${input.memberId} and role<>'OWNER'`;if(!target)throw new ServiceError(422,'MEMBER_REQUIRED');
  await tx`update aevic_platform.organization_members set role='MANAGER' where organization_id=${id} and role='OWNER'`;await tx`update aevic_platform.organization_members set role='OWNER' where id=${input.memberId}`;
  await audit(tx,actor(c),'organization.ownership','organization',id,{newOwner:target.account_id});await notify(tx,target.account_id,'Təşkilat sahibliyi',org.name+' təşkilatının sahibliyi sizə ötürüldü.','/team/invitations','system');return {members:await members(tx,id)};
 });return c.json(out.members);
});
export default app;
