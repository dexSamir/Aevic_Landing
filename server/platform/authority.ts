import {Hono} from 'hono';
import {setCookie} from 'hono/cookie';
import {z} from 'zod';
import type {Sql,TransactionSql} from 'postgres';
import type {Env} from '../types';
import {platform,account,actor,captain} from './context';
import {transaction,idempotent,audit,notify} from './competition';
import {body,text,email,pagination} from '../validation/input';
import {ServiceError} from '../errors';
import {managingRoles} from './workspace';
const app=new Hono<Env>();
const teamId=z.string().regex(/^[1-9]\d{0,18}$/);
async function access(sql:Sql|TransactionSql,id:string,principal:string,roles?:string[]){
 const [team]=await sql`select id::text,team_name from public.teams where id=${id} for update`;if(!team)throw new ServiceError(404,'TEAM_NOT_FOUND');
 const [membership]=await sql`select id,role from aevic_platform.team_authority where team_id=${id} and account_id=${principal}`;
 if(!membership||(roles&&!roles.includes(membership.role)))throw new ServiceError(403,'FORBIDDEN');return{id:String(team.id),team_name:String(team.team_name),role:String(membership.role)};
}
async function members(sql:Sql|TransactionSql,id:string){const rows=await sql`select a.id,a.account_id::text,a.role,a.created_at,t.captain_name from aevic_platform.team_authority a join aevic_platform.account_identity t on t.id=a.account_id where a.team_id=${id} order by a.created_at,a.id`;return rows.map(r=>({id:r.id,userId:r.account_id,displayName:r.captain_name,role:r.role,joinedAt:r.created_at,permissions:managingRoles.includes(r.role)?['team.manage']:[],status:'ACTIVE'}));}
function inviteView(r:Record<string,any>){return{id:r.id,type:['PLAYER','SUBSTITUTE'].includes(r.role)?'TEAM_MEMBER':'TEAM_MANAGER',entityId:String(r.team_id),entityName:r.team_name,recipientLabel:r.captain_name,role:r.role,status:r.status==='PENDING'&&new Date(r.expires_at).getTime()<=Date.now()?'EXPIRED':r.status,createdAt:r.created_at,expiresAt:r.expires_at,respondedAt:r.responded_at??undefined,tournamentImplications:'İş sahəsinə giriş verir; rəsmi yarış heyətini dəyişdirmir.'};}
async function inviteById(sql:Sql|TransactionSql,id:string){const [r]=await sql`select i.*,t.team_name,u.captain_name from aevic_platform.team_invitations i join public.teams t on t.id=i.team_id join aevic_platform.account_identity u on u.id=i.recipient_id where i.id=${id}`;return inviteView(r);}
app.get('/me/workspaces',async c=>{
 const owner=account(c),rows=await platform(c).sql`select a.team_id::text,a.role,t.team_name,d.archived_at from aevic_platform.team_authority a join public.teams t on t.id=a.team_id left join aevic_platform.team_details d on d.team_id=t.id where a.account_id=${owner} and d.archived_at is null order by t.team_name,a.team_id`;
 return c.json(rows.map(r=>({id:r.team_id,name:r.team_name,role:r.role})));
});
app.post('/me/workspace',async c=>{
 const owner=account(c),input=await body(c,z.object({teamId}).strict()),sql=platform(c).sql;
 await transaction(sql,async tx=>{await access(tx,input.teamId,owner);if((await tx`select team_id from aevic_platform.team_details where team_id=${input.teamId} and archived_at is not null`).length)throw new ServiceError(409,'TEAM_ARCHIVED');});
 setCookie(c,'aevic-workspace',input.teamId,{path:'/',httpOnly:true,secure:c.get('config').secureCookies,sameSite:'Strict'});return c.body(null,204);
});
app.get('/me/context',async c=>{
 const a=actor(c);if(!a.teamId)throw new ServiceError(409,'TEAM_WORKSPACE_REQUIRED');
 return c.json({...await platform(c).teamSnapshot(captain(c),captain(c)),dataSource:'public.teams',historyAvailable:true,accountId:account(c),workspaceRole:a.teamRole});
});
app.get('/teams/:id/authority',async c=>{const id=teamId.parse(c.req.param('id'));await transaction(platform(c).sql,tx=>access(tx,id,account(c)));return c.json(await members(platform(c).sql,id));});
app.get('/team-invitations',async c=>{
 const owner=account(c),id=c.req.query('teamId'),{offset,limit}=pagination(c),sql=platform(c).sql;
 if(id){teamId.parse(id);await transaction(sql,tx=>access(tx,id,owner,managingRoles));const rows=await sql`select i.*,t.team_name,u.captain_name from aevic_platform.team_invitations i join public.teams t on t.id=i.team_id join aevic_platform.account_identity u on u.id=i.recipient_id where i.team_id=${id} order by i.created_at desc,i.id limit ${limit+1} offset ${offset}`;return c.json({items:rows.slice(0,limit).map(inviteView),hasMore:rows.length>limit,nextCursor:rows.length>limit?String(offset+limit):undefined});}
 const rows=await sql`select id,kind,entity_id::text,entity_name,recipient_label,role,status,created_at,expires_at,responded_at from (
 select i.id,case when i.role in ('PLAYER','SUBSTITUTE') then 'TEAM_MEMBER' else 'TEAM_MANAGER' end as kind,i.team_id::text as entity_id,t.team_name as entity_name,u.captain_name as recipient_label,i.role,i.status,i.created_at,i.expires_at,i.responded_at from aevic_platform.team_invitations i join public.teams t on t.id=i.team_id join aevic_platform.account_identity u on u.id=i.recipient_id where i.recipient_id=${owner}
 union all select i.id,i.kind,i.organization_id::text,o.name,u.captain_name,i.role,i.status,i.created_at,i.expires_at,i.responded_at from aevic_platform.organization_invitations i join aevic.organizations o on o.id=i.organization_id join aevic_platform.account_identity u on u.id=i.recipient_id where i.recipient_id=${owner}
 ) invitations order by created_at desc,id limit ${limit+1} offset ${offset}`;
 return c.json({items:rows.slice(0,limit).map(r=>({id:r.id,type:r.kind,entityId:r.entity_id,entityName:r.entity_name,recipientLabel:r.recipient_label,role:r.role??undefined,status:r.status==='PENDING'&&new Date(r.expires_at).getTime()<=Date.now()?'EXPIRED':r.status,createdAt:r.created_at,expiresAt:r.expires_at,respondedAt:r.responded_at??undefined})),hasMore:rows.length>limit,nextCursor:rows.length>limit?String(offset+limit):undefined});
});
app.get('/me/player-invitations',async c=>{const owner=account(c),{offset,limit}=pagination(c),rows=await platform(c).sql`select i.*,t.team_name,u.captain_name from aevic_platform.team_invitations i join public.teams t on t.id=i.team_id join aevic_platform.account_identity u on u.id=i.recipient_id where i.recipient_id=${owner} and i.role in ('PLAYER','SUBSTITUTE') order by i.created_at desc,i.id limit ${limit+1} offset ${offset}`;return c.json({items:rows.slice(0,limit).map(inviteView),hasMore:rows.length>limit,nextCursor:rows.length>limit?String(offset+limit):undefined});});
app.post('/teams/:id/invitations',async c=>{
 const owner=account(c),id=teamId.parse(c.req.param('id')),input=await body(c,z.object({recipient:email,role:z.enum(['CAPTAIN','MANAGER','CO_CAPTAIN','PLAYER','SUBSTITUTE'])}).strict());
 const result=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'team.invite',{id,...input},async tx=>{
  const team=await access(tx,id,owner,managingRoles);if(input.role==='CAPTAIN'&&team.role!=='OWNER')throw new ServiceError(403,'OWNER_REQUIRED');
  const [recipient]=await tx`select id::text from aevic_platform.account_identity where lower(btrim(email))=${input.recipient}`;if(!recipient)throw new ServiceError(422,'RECIPIENT_UNAVAILABLE');
  if((await tx`select id from aevic_platform.team_authority where team_id=${id} and account_id=${recipient.id}`).length)throw new ServiceError(409,'ALREADY_MEMBER');
  await tx`update aevic_platform.team_invitations set status='EXPIRED' where team_id=${id} and recipient_id=${recipient.id} and status='PENDING' and expires_at<=now()`;
  if((await tx`select id from aevic_platform.team_invitations where team_id=${id} and recipient_id=${recipient.id} and status='PENDING'`).length)throw new ServiceError(409,'INVITATION_PENDING');
  const [r]=await tx`insert into aevic_platform.team_invitations(team_id,recipient_id,role) values(${id},${recipient.id},${input.role}) returning id`;
  await audit(tx,actor(c),'team.invite','team',id,{invitationId:r.id,role:input.role});await notify(tx,recipient.id,'Komanda dəvəti',team.team_name+' sizə dəvət göndərdi.','/team/invitations','system');return await inviteById(tx,r.id);
 });return c.json(result,201);
});
app.post('/team-invitations/:id/response',async c=>{
 const owner=account(c),id=z.uuid().parse(c.req.param('id')),input=await body(c,z.object({response:z.enum(['ACCEPTED','REJECTED'])}).strict());
 const result=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'team.invitation-response',{id,...input},async tx=>{
  const [target]=await tx`select team_id from aevic_platform.team_invitations where id=${id} and recipient_id=${owner}`;if(!target)throw new ServiceError(404,'INVITATION_NOT_FOUND');
  await tx`select id from public.teams where id=${target.team_id} for update`;
  const [r]=await tx`select * from aevic_platform.team_invitations where id=${id} for update`;
  if(r.status!=='PENDING'||new Date(r.expires_at).getTime()<=Date.now())throw new ServiceError(409,'INVITATION_CLOSED');
  if((await tx`select team_id from aevic_platform.team_details where team_id=${r.team_id} and archived_at is not null`).length)throw new ServiceError(409,'TEAM_ARCHIVED');
  if(input.response==='ACCEPTED')await tx`insert into aevic_platform.team_authority(team_id,account_id,role) values(${r.team_id},${owner},${r.role}) on conflict(team_id,account_id) do nothing`;
  await tx`update aevic_platform.team_invitations set status=${input.response},responded_at=now() where id=${id}`;await audit(tx,actor(c),'team.invitation-response','team',String(r.team_id),{invitationId:id,response:input.response});return await inviteById(tx,id);
 });return c.json(result);
});
app.post('/teams/:id/invitations/:invitationId/cancellation',async c=>{
 const id=teamId.parse(c.req.param('id')),key=z.uuid().parse(c.req.param('invitationId'));
 await transaction(platform(c).sql,async tx=>{await access(tx,id,account(c),managingRoles);const changed=await tx`update aevic_platform.team_invitations set status='CANCELLED',responded_at=now() where id=${key} and team_id=${id} and status='PENDING' returning id`;if(!changed.length)throw new ServiceError(409,'INVITATION_CLOSED');await audit(tx,actor(c),'team.invitation-cancel','team',id,{invitationId:key});});return c.json(await inviteById(platform(c).sql,key));
});
app.delete('/teams/:id/authority/:memberId',async c=>{
 const id=teamId.parse(c.req.param('id')),key=z.uuid().parse(c.req.param('memberId')),input=await body(c,z.object({reason:text(10,2000)}).strict());
 await transaction(platform(c).sql,async tx=>{const viewer=await access(tx,id,account(c),managingRoles);const [target]=await tx`select account_id::text,role from aevic_platform.team_authority where id=${key} and team_id=${id}`;if(!target)throw new ServiceError(404,'MEMBER_NOT_FOUND');if(target.role==='OWNER'||target.account_id===account(c)||(target.role==='CAPTAIN'&&viewer.role!=='OWNER'))throw new ServiceError(403,'OWNER_REQUIRED');await tx`delete from aevic_platform.team_authority where id=${key}`;await audit(tx,actor(c),'team.member-remove','team',id,{accountId:target.account_id,reason:input.reason});});return c.body(null,204);
});
app.post('/teams/:id/ownership',async c=>{
 const id=teamId.parse(c.req.param('id')),input=await body(c,z.object({memberId:z.uuid(),confirmation:text(2,100)}).strict());
 const result=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'team.ownership',{id,...input},async tx=>{
  const team=await access(tx,id,account(c),['OWNER']);if(input.confirmation!==team.team_name)throw new ServiceError(422,'CONFIRMATION_MISMATCH');
  const [target]=await tx`select account_id::text from aevic_platform.team_authority where id=${input.memberId} and team_id=${id} and role<>'OWNER'`;if(!target)throw new ServiceError(422,'MEMBER_REQUIRED');
  await tx`update aevic_platform.team_authority set role='MANAGER' where team_id=${id} and role='OWNER'`;await tx`update aevic_platform.team_authority set role='OWNER' where id=${input.memberId}`;await audit(tx,actor(c),'team.ownership','team',id,{newOwner:target.account_id});await notify(tx,target.account_id,'Komanda sahibliyi',team.team_name+' komandasının sahibliyi sizə ötürüldü.','/team/settings/managers','system');return{members:await members(tx,id)};
 });return c.json(result.members);
});
app.post('/teams/:id/leave',async c=>{
 const id=teamId.parse(c.req.param('id')),input=await body(c,z.object({reason:text(0,2000).optional()}).strict());
 await transaction(platform(c).sql,async tx=>{const viewer=await access(tx,id,account(c));if(viewer.role==='OWNER')throw new ServiceError(409,'TRANSFER_OWNERSHIP_FIRST');await tx`delete from aevic_platform.team_authority where team_id=${id} and account_id=${account(c)}`;await audit(tx,actor(c),'team.leave','team',id,{reason:input.reason});});return c.body(null,204);
});
app.post('/teams/:id/archive',async c=>{
 const id=teamId.parse(c.req.param('id')),input=await body(c,z.object({reason:text(10,2000),confirmation:text(2,100)}).strict());
 await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'team.archive',{id,...input},async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${'roster:'+id},0))`;
  const team=await access(tx,id,account(c),['OWNER']);if(input.confirmation!==team.team_name)throw new ServiceError(422,'CONFIRMATION_MISMATCH');
  if((await tx`select e.id from aevic_platform.tournament_registrations e join aevic.tournaments t on t.id=e.tournament_id where e.team_id=${id} and e.status in ('pending','confirmed') and t.status not in ('completed','cancelled')`).length)throw new ServiceError(409,'ACTIVE_COMPETITION');
  await tx`insert into aevic_platform.team_details(team_id,archived_at) values(${id},now()) on conflict(team_id) do update set archived_at=now(),updated_at=now()`;
  await tx`update aevic_platform.team_invitations set status='CANCELLED',responded_at=now() where team_id=${id} and status='PENDING'`;await audit(tx,actor(c),'team.archive','team',id,{reason:input.reason});return{ok:true};
 });return c.body(null,204);
});
export default app;
