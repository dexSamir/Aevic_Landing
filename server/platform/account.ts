import {accountRecord,accountUser,lockAccount} from './account-store';
import {Hono} from 'hono';
import {z} from 'zod';
import type {Env} from '../types';
import {platform,captain,currentCaptainCookie,tokenDigest,actor} from './context';
import {normalize} from './repository';
import {ServiceError} from '../errors';
import {body,text} from '../validation/input';
import {transaction,audit} from './competition';
const app=new Hono<Env>();
app.get('/me/sessions',async c=>{
 const owner=captain(c),current=tokenDigest(currentCaptainCookie(c)!);
 const rows=normalize(await platform(c).sql`select id,device,last_active_at,token_digest,revoked_at from aevic_platform.sessions where team_id=${owner} and expires_at>now() order by last_active_at desc limit 100`);
 return c.json(rows.map(r=>({id:r.id,device:r.device,lastActiveAt:r.last_active_at,status:r.revoked_at?'revoked':r.token_digest===current?'current':'active'})));
});
app.delete('/me/sessions/others',async(c,next)=>{
 if(!c.get('platform'))return next();const owner=captain(c),current=tokenDigest(currentCaptainCookie(c)!);
 await platform(c).sql`update aevic_platform.sessions set revoked_at=now() where team_id=${owner} and token_digest<>${current} and revoked_at is null`;
 // Legacy signed cookies not yet seen in the session registry are invalidated by
 // the original hash-epoch rotation, which also returns a fresh current cookie.
 return next();
});
app.delete('/me/sessions/:id',async(c,next)=>{if(c.req.param('id')==='others')return next();const owner=captain(c),id=z.uuid().parse(c.req.param('id'));const rows=await platform(c).sql`update aevic_platform.sessions set revoked_at=now() where id=${id} and team_id=${owner} returning id`;if(!rows.length)throw new ServiceError(404,'SESSION_NOT_FOUND');return c.body(null,204);});
app.post('/me/data-export',async c=>{const owner=captain(c),sql=platform(c).sql;const [r]=await sql`insert into aevic_platform.account_requests(team_id,kind) values(${owner},'export') returning id,created_at`;return c.json({id:r.id,status:'READY',requestedAt:r.created_at,completedAt:r.created_at,downloadUrl:`/api/me/data-export/${r.id}/download`},201);});
app.get('/me/data-export/:id',async c=>{const owner=captain(c),id=z.uuid().parse(c.req.param('id'));const [r]=await platform(c).sql`select id,created_at from aevic_platform.account_requests where id=${id} and team_id=${owner} and kind='export'`;if(!r)throw new ServiceError(404,'EXPORT_NOT_FOUND');return c.json({id:r.id,status:'READY',requestedAt:r.created_at,completedAt:r.created_at,downloadUrl:`/api/me/data-export/${r.id}/download`});});
app.get('/me/data-export/:id/download',async c=>{const owner=captain(c),id=z.uuid().parse(c.req.param('id')),r=platform(c);const found=await r.sql`select id from aevic_platform.account_requests where id=${id} and team_id=${owner} and kind='export'`;if(!found.length)throw new ServiceError(404,'EXPORT_NOT_FOUND');
 const data={exportedAt:new Date().toISOString(),account:accountUser(await accountRecord(r.sql,owner)),notifications:await r.notifications(owner),supportTickets:await r.rows('support_tickets'),supportReplies:await r.rows('support_replies')};
 c.header('Content-Disposition','attachment; filename="aevic-account.json"');return c.json(data);
});
app.post('/me/deletion',async c=>{const owner=captain(c);await transaction(platform(c).sql,async tx=>{await lockAccount(tx,owner);await tx`insert into aevic_platform.account_requests(team_id,kind) select ${owner},'deletion' where not exists(select 1 from aevic_platform.account_requests where team_id=${owner} and kind='deletion' and status='pending')`;await audit(tx,actor(c),'account.deletion-request','team',owner);});return c.json({blocked:false});});
app.patch('/me/account',async c=>{
 const owner=captain(c),input=await body(c,z.object({firstName:text(1,80),lastName:text(1,80),phone:text(0,30).optional()}).strict()),r=platform(c);
 await transaction(r.sql,async tx=>{const row=await lockAccount(tx,owner);if(row.original_team_id!==null)await tx`update public.teams set captain_name=${input.firstName+' '+input.lastName},captain_contact=coalesce(${input.phone??null},captain_contact) where id=${owner}`;else await tx`update aevic_platform.accounts set captain_name=${input.firstName+' '+input.lastName},captain_contact=coalesce(${input.phone??null},captain_contact) where id=${owner}`;await audit(tx,actor(c),'account.profile','team',owner);});
 const [d]=await r.sql`select coalesce(a.email_verified_at,d.email_verified_at) as email_verified_at from aevic_platform.accounts a left join aevic_platform.team_details d on d.team_id=a.original_team_id where a.id=${owner}`;
 return c.json({user:accountUser(await accountRecord(r.sql,owner)),emailVerified:Boolean(d?.email_verified_at),dataExportStatus:'available'});
});
app.get('/me/account',async(c,next)=>{if(!c.get('platform'))return next();const owner=captain(c),r=platform(c);const [d]=await r.sql`select coalesce(a.email_verified_at,d.email_verified_at) as email_verified_at from aevic_platform.accounts a left join aevic_platform.team_details d on d.team_id=a.original_team_id where a.id=${owner}`;return c.json({user:accountUser(await accountRecord(r.sql,owner)),emailVerified:Boolean(d?.email_verified_at),dataExportStatus:'available'});});
export default app;
