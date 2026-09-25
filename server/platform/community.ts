import {createHash} from 'node:crypto';
import {validateImage} from '../captain/media';
import {Hono} from 'hono';
import {z} from 'zod';
import type {Env,ApiContext} from '../types';
import {body,text,pagination} from '../validation/input';
import {platform,captain,admin,actor} from './context';
import {audit,notify,transaction} from './competition';
import {ServiceError} from '../errors';
import {lockRoster} from './roster';
const app=new Hono<Env>();
const id=(c:ApiContext)=>z.uuid().parse(c.req.param('id'));
const statuses=z.enum(['open','waiting-for-user','under-review','resolved','closed']);
function page(c:ApiContext,items:unknown[]){const {offset,limit}=pagination(c);return{items:items.slice(offset,offset+limit),hasMore:offset+limit<items.length,total:items.length,nextCursor:offset+limit<items.length?String(offset+limit):undefined};}
async function tickets(c:ApiContext){const r=platform(c),[rows,replies]=await Promise.all([r.rows('support_tickets'),r.rows('support_replies')]);const attachments=await r.sql`select f.id,f.ticket_id,f.file_name from aevic_platform.support_attachments f join aevic_platform.support_tickets t on t.id=f.ticket_id where ${Boolean(r.actor.adminId)} or t.user_id=${r.actor.accountId??r.actor.teamId??null}`;return rows.map(t=>({id:String(t.id),category:t.category,subject:t.subject,description:t.description,status:t.status,createdAt:t.created_at,updatedAt:t.updated_at,attachments:attachments.filter(f=>f.ticket_id===t.id).map(f=>({id:f.id,fileName:f.file_name,url:'/api/support/attachments/'+f.id})),messages:replies.filter(r=>r.ticket_id===t.id).map(r=>({id:r.id,author:r.author,body:r.body,createdAt:r.created_at}))})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
async function ticket(c:ApiContext,key:string){const found=(await tickets(c)).find(t=>t.id===key);if(!found)throw new ServiceError(404,'TICKET_NOT_FOUND');return found;}
app.post('/me/support/tickets/:id/attachments',async c=>{
 const owner=captain(c),ticketId=id(c),sql=platform(c).sql;
 const [ticket]=await sql`select id from aevic_platform.support_tickets where id=${ticketId} and user_id=${owner}`;if(!ticket)throw new ServiceError(404,'TICKET_NOT_FOUND');
 const form=await c.req.formData(),file=form.get('file');if(!(file instanceof File))throw new ServiceError(422,'FILE_REQUIRED');
 const raw=Buffer.from(await file.arrayBuffer());await validateImage(raw,file.type);const {default:sharp}=await import('sharp');
 const bytes=await sharp(raw,{limitInputPixels:20000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
 if(bytes.length>4000000)throw new ServiceError(413,'FILE_TOO_LARGE');const digest=createHash('sha256').update(bytes).digest('hex');
 const out=await transaction(sql,async tx=>{
  const [t]=await tx`select status from aevic_platform.support_tickets where id=${ticketId} and user_id=${owner} for update`;if(!t||t.status==='closed')throw new ServiceError(409,'TICKET_CLOSED');
  const previous=await tx`select id,file_name from aevic_platform.support_attachments where ticket_id=${ticketId} and digest=${digest}`;if(previous[0])return previous[0];
  const [count]=await tx`select count(*)::int as n from aevic_platform.support_attachments where ticket_id=${ticketId}`;if(count.n>=5)throw new ServiceError(409,'ATTACHMENT_LIMIT');
  const [saved]=await tx`insert into aevic_platform.support_attachments(ticket_id,file_name,mime_type,bytes,digest) values(${ticketId},${file.name.slice(0,195)+'.webp'},'image/webp',${bytes},${digest}) returning id,file_name`;
  await audit(tx,actor(c),'support.attachment','ticket',ticketId,{attachmentId:saved.id});return saved;
 });return c.json({id:out.id,fileName:out.file_name,url:'/api/support/attachments/'+out.id},201);
});
app.get('/support/attachments/:id',async c=>{
 const a=actor(c),[file]=await platform(c).sql`select f.* from aevic_platform.support_attachments f join aevic_platform.support_tickets t on t.id=f.ticket_id where f.id=${id(c)} and (t.user_id=${a.accountId??a.teamId??null} or ${Boolean(a.adminId&&['super-admin','support-moderator'].includes(a.role??''))})`;
 if(!file)throw new ServiceError(404,'NOT_FOUND');return new Response(new Uint8Array(file.bytes).buffer,{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(file.file_name)}});
});
app.get('/me/support/tickets',async c=>{captain(c);const items=(await tickets(c)).filter(t=>!c.req.query('status')||t.status===c.req.query('status'));return c.json(c.req.query('page')==='true'?page(c,items):items);});
app.get('/me/support/tickets/:id',async c=>{captain(c);return c.json(await ticket(c,id(c)));});
app.post('/me/support/tickets',async c=>{
 const owner=captain(c),input=await body(c,z.object({category:z.enum(['account','registration','roster','tournament','results','technical','other']),subject:text(3,200),description:text(10,6000)}).strict());
 const [row]=await platform(c).sql`insert into aevic_platform.support_tickets(user_id,category,subject,description) values(${owner},${input.category},${input.subject},${input.description}) returning id`;
 return c.json(await ticket(c,row.id),201);
});
async function reply(c:ApiContext,isAdmin:boolean){
 const owner=isAdmin?(admin(c,['support-moderator']),undefined):captain(c),key=id(c),input=await body(c,z.object({body:text(1,6000)}).strict());
 await transaction(platform(c).sql,async tx=>{const [t]=await tx`select * from aevic_platform.support_tickets where id=${key} and (${isAdmin} or user_id=${owner??null}) for update`;if(!t)throw new ServiceError(404,'TICKET_NOT_FOUND');if(t.status==='closed')throw new ServiceError(409,'TICKET_CLOSED');
 await tx`insert into aevic_platform.support_replies(ticket_id,author,body) values(${key},${isAdmin?'support':'user'},${input.body})`;
 await tx`update aevic_platform.support_tickets set status=${isAdmin?'waiting-for-user':'under-review'},updated_at=now() where id=${key}`;
 if(isAdmin)await notify(tx,String(t.user_id),'Dəstək cavabı',t.subject,`/account/support/tickets/${key}`,'system');await audit(tx,actor(c),'support.reply','ticket',key);
 });return c.json(await ticket(c,key));
}
app.post('/me/support/tickets/:id/messages',c=>reply(c,false));
app.post('/admin/support/tickets/:id/messages',c=>reply(c,true));
app.get('/admin/support/tickets',async c=>{admin(c,['support-moderator']);return c.json(page(c,(await tickets(c)).filter(t=>!c.req.query('status')||t.status===c.req.query('status'))));});
app.get('/admin/support/tickets/:id',async c=>{admin(c,['support-moderator']);return c.json(await ticket(c,id(c)));});
app.patch('/admin/support/tickets/:id/status',async c=>{admin(c,['support-moderator']);const key=id(c),input=await body(c,z.object({status:statuses,reason:text(0,1000).optional()}));await transaction(platform(c).sql,async tx=>{const rows=await tx`update aevic_platform.support_tickets set status=${input.status},updated_at=now() where id=${key} returning user_id::text,subject`;if(!rows[0])throw new ServiceError(404,'TICKET_NOT_FOUND');await audit(tx,actor(c),'support.status','ticket',key,{status:input.status,reason:input.reason});await notify(tx,rows[0].user_id,'Dəstək sorğusu yeniləndi',rows[0].subject,`/account/support/tickets/${key}`,'system');});return c.json(await ticket(c,key));});
app.get('/me/notification-preferences',async c=>{const [row]=await platform(c).sql`select preferences from aevic_platform.notification_preferences where user_id=${captain(c)}`;return c.json(row?.preferences??{channels:{'in-app':true,email:false,push:false},events:{registration:true,'check-in':true,room:true,results:true,roster:true,announcements:true,adminMessages:true}});});
app.put('/me/notification-preferences',async c=>{const owner=captain(c),input=await body(c,z.object({channels:z.object({'in-app':z.boolean(),email:z.boolean(),push:z.boolean()}).strict(),events:z.record(z.string().max(80),z.boolean())}).strict());if(input.channels.email||input.channels.push)throw new ServiceError(422,'DELIVERY_CHANNEL_NOT_CONFIGURED');const sql=platform(c).sql;await sql`insert into aevic_platform.notification_preferences(user_id,preferences) values(${owner},${sql.json(input)}) on conflict(user_id) do update set preferences=excluded.preferences`;return c.json(input);});
app.get('/roster-requests',async c=>{actor(c);return c.json(await platform(c).rosterRequests());});
app.get('/roster-requests/:id',async c=>{actor(c);const r=(await platform(c).rosterRequests()).find(r=>r.id===id(c));if(!r)throw new ServiceError(404,'NOT_FOUND');return c.json(r);});
app.post('/roster-requests',async c=>{
 const owner=captain(c),input=await body(c,z.object({teamId:z.string(),tournamentId:z.uuid().optional(),teamName:text(0,120).optional(),tournamentName:text(0,120).optional(),outgoing:z.object({id:z.string(),ign:text(0,40),role:z.enum(['captain','starter','substitute'])}),incoming:z.object({ign:text(2,40),uid:z.string().regex(/^\d{5,20}$/),role:z.enum(['captain','starter','substitute'])}),reason:text(10,2000)}).strict());
 if(input.teamId!==owner||!new RegExp(`^${owner}:player[1-5]$`).test(input.outgoing.id))throw new ServiceError(403,'FORBIDDEN');
 const key=await transaction(platform(c).sql,async tx=>{
  await tx`select id from public.teams where id=${owner} for update`;
  if(input.tournamentId){const [e]=await tx`select id from aevic_platform.tournament_registrations where tournament_id=${input.tournamentId} and team_id=${owner} and status='confirmed'`;if(!e)throw new ServiceError(403,'ENTRY_REQUIRED');}
  const pending=await tx`select id from aevic_platform.roster_change_requests where team_id=${owner} and outgoing_player_id=${input.outgoing.id} and status in ('pending','under-review')`;if(pending.length)throw new ServiceError(409,'REQUEST_ALREADY_PENDING');
  const [r]=await tx`insert into aevic_platform.roster_change_requests(team_id,tournament_id,outgoing_player_id,incoming_ign,incoming_pubg_id,incoming_role,reason) values(${owner},${input.tournamentId??null},${input.outgoing.id},${input.incoming.ign},${input.incoming.uid},${input.incoming.role},${input.reason}) returning id`;await audit(tx,actor(c),'roster.request','roster-request',r.id);return r.id;
 });return c.json((await platform(c).rosterRequests()).find(r=>r.id===key),201);
});
app.patch('/admin/roster-requests/:id',async c=>{
 admin(c,['tournament-manager']);const key=id(c),input=await body(c,z.object({status:z.enum(['approved','rejected']),note:text(0,2000).optional()}));
 await transaction(platform(c).sql,async tx=>{
  const [r]=await tx`select *,team_id::text from aevic_platform.roster_change_requests where id=${key} for update`;if(!r)throw new ServiceError(404,'NOT_FOUND');if(!['pending','under-review'].includes(r.status))throw new ServiceError(409,'REQUEST_CLOSED');
  if(input.status==='approved'){
   const slot=Number(String(r.outgoing_player_id).match(/player([1-5])$/)?.[1]);if(!slot)throw new ServiceError(422,'INVALID_ROSTER_SLOT');
   await lockRoster(tx,r.team_id);
   await tx`insert into aevic_platform.player_details(team_id,slot,pubg_id,role) values(${r.team_id},${slot},${r.incoming_pubg_id},${r.incoming_role}) on conflict(team_id,slot) do update set pubg_id=excluded.pubg_id,role=excluded.role,verified_at=null`;
   await tx`update public.teams set ${tx('player'+slot+'_ign')}=${r.incoming_ign} where id=${r.team_id}`;
  }
  await tx`update aevic_platform.roster_change_requests set status=${input.status},admin_note=${input.note??null},updated_at=now() where id=${key}`;
  await audit(tx,actor(c),'roster.review','roster-request',key,{status:input.status});await notify(tx,r.team_id,'Heyət sorğusu yeniləndi',input.note??input.status,`/team/roster-requests/${key}`,'roster');
 });return c.json((await platform(c).rosterRequests()).find(r=>r.id===key));
});
app.get('/disputes',async c=>{actor(c);return c.json(await platform(c).disputes());});
app.get('/disputes/:id',async c=>{actor(c);const row=(await platform(c).disputes()).find(r=>r.id===id(c));if(!row)throw new ServiceError(404,'NOT_FOUND');return c.json(row);});
app.post('/disputes',async c=>{
 const owner=captain(c),input=await body(c,z.object({teamId:z.string(),tournamentId:z.uuid(),matchId:z.uuid(),teamName:text(0,120).optional(),tournamentName:text(0,120).optional(),roundLabel:text(0,120).optional(),deadlineAt:z.string().optional(),evidenceNames:z.array(z.string()).max(5).optional(),issueType:z.enum(['placement','kills','penalty','missing-result','other']),description:text(10,6000),evidenceIds:z.array(z.uuid()).max(5).default([])}).strict());if(owner!==input.teamId)throw new ServiceError(403,'FORBIDDEN');
 const key=await transaction(platform(c).sql,async tx=>{
  const [m]=await tx`select m.* from aevic.matches m join aevic_platform.team_match_results r on r.match_id=m.id and r.team_id=${owner} where m.id=${input.matchId} and m.tournament_id=${input.tournamentId} and m.published_at is not null and m.dispute_deadline_at>clock_timestamp() for update of m`;if(!m)throw new ServiceError(409,'DISPUTE_WINDOW_CLOSED');
  const pending=await tx`select id from aevic_platform.disputes where match_id=${m.id} and team_id=${owner} and status in ('pending','under-review')`;if(pending.length)throw new ServiceError(409,'DISPUTE_ALREADY_PENDING');
  const files=await tx`select id from aevic_platform.media where id=any(${input.evidenceIds}) and team_id=${owner} and dispute_id is null and asset_type='evidence' for update`;if(files.length!==input.evidenceIds.length)throw new ServiceError(422,'INVALID_EVIDENCE');
  const [d]=await tx`insert into aevic_platform.disputes(team_id,tournament_id,match_id,issue_type,description,deadline_at) values(${owner},${input.tournamentId},${input.matchId},${input.issueType},${input.description},${m.dispute_deadline_at}) returning id`;
  await tx`update aevic_platform.media set dispute_id=${d.id} where id=any(${input.evidenceIds}) and team_id=${owner}`;await audit(tx,actor(c),'dispute.create','dispute',d.id);return d.id;
 });return c.json((await platform(c).disputes()).find(d=>d.id===key),201);
});
app.patch('/admin/disputes/:id',async c=>{admin(c,['result-operator','support-moderator']);const key=id(c),input=await body(c,z.object({status:z.enum(['resolved','rejected']),note:text(1,4000)}));await transaction(platform(c).sql,async tx=>{const [r]=await tx`update aevic_platform.disputes set status=${input.status},admin_note=${input.note},resolved_at=now() where id=${key} and status in ('pending','under-review') returning team_id::text`;if(!r)throw new ServiceError(409,'DISPUTE_CLOSED');await audit(tx,actor(c),'dispute.review','dispute',key,{status:input.status});await notify(tx,r.team_id,'Etiraz yeniləndi',input.note,`/team/disputes/${key}`,'dispute');});return c.json((await platform(c).disputes()).find(d=>d.id===key));});
export default app;
