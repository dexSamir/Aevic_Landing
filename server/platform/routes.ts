import {Hono} from 'hono';
import {z} from 'zod';
import {getCookie,setCookie,deleteCookie} from 'hono/cookie';
import {randomBytes} from 'node:crypto';
import type {Env,ApiContext} from '../types';
import {body,text,email,pagination} from '../validation/input';
import {ServiceError} from '../errors';
import {verifyPassword} from '../captain/crypto';
import {createAttemptLimiter} from '../captain/limit';
import {platform,actor,admin,captain,ownTeam,adminCookieName,tokenDigest} from './context';
import {consumeFactor} from './mfa';
import {normalize,PlatformRepository} from './repository';
import {joinTournament,reviewEntry,checkIn,withdraw,room,audit,transaction,notify} from './competition';
import {createTournament,editTournament,tournamentInput,editTournamentInput,resultInput,saveResults,publishMatch} from './tournaments';
import {summary,roundResult,notification} from '../services/data';
import {achievements,organizations} from '../services/identity';
const app=new Hono<Env>(),limit=createAttemptLimiter();
const uuid=(c:ApiContext,key='id')=>z.uuid().parse(c.req.param(key));
const teamId=(c:ApiContext,key='id')=>z.string().regex(/^[1-9]\d{0,18}$/).parse(c.req.param(key));
app.post('/auth/admin/login',async c=>{
 const input=await body(c,z.object({email,password:z.string().min(1).max(128),remember:z.boolean().default(false),otp:z.string().max(40).optional()}).strict());
 limit('admin-login',c.req.header('x-nf-client-connection-ip')??'local',10);limit('admin-account',input.email,10);
 const sql=platform(c).sql,[a]=await sql`select * from aevic_platform.admin_accounts where email=${input.email} and active`;
 if(!await verifyPassword(input.password,a?.password_hash??'')||!a)throw new ServiceError(401,'LOGIN_FAILED');
 const token=randomBytes(32).toString('base64url'),seconds=input.remember?30*86400:8*3600;
 await transaction(sql,async tx=>{
  const [current]=await tx`select password_hash,active from aevic_platform.admin_accounts where id=${a.id} for update`;
  if(!current?.active||current.password_hash!==a.password_hash)throw new ServiceError(401,'LOGIN_FAILED');
  const verified=await consumeFactor(tx,{adminId:a.id},c.get('config').sessionSecret??'',input.otp);
  await tx`insert into aevic_platform.sessions(token_digest,admin_id,expires_at,device,mfa_verified_at) values(${tokenDigest(token)},${a.id},now()+${seconds}*interval '1 second',${(c.req.header('user-agent')??'Browser').slice(0,300)},case when ${verified} then clock_timestamp() else null end)`;
 });
 setCookie(c,adminCookieName(c),token,{path:'/',httpOnly:true,secure:c.get('config').secureCookies,sameSite:'Strict',...(input.remember?{maxAge:seconds}:{})});
 return c.json({role:'admin',user:{id:a.id,firstName:a.first_name,lastName:a.last_name,email:a.email,role:'admin'}});
});
app.get('/me/session',async(c,next)=>{
 const a=c.get('platform')?.actor;if(!a?.adminId)return next();
 const [row]=await platform(c).sql`select id,email,first_name,last_name from aevic_platform.admin_accounts where id=${a.adminId} and active`;
 return c.json({role:'admin',user:{id:row.id,firstName:row.first_name,lastName:row.last_name,email:row.email,role:'admin'}});
});
app.post('/auth/logout',async(c,next)=>{
 const token=getCookie(c,adminCookieName(c));if(token&&c.get('platform'))await platform(c).sql`update aevic_platform.sessions set revoked_at=now() where token_digest=${tokenDigest(token)}`;
 deleteCookie(c,adminCookieName(c),{path:'/',secure:c.get('config').secureCookies});return next();
});
app.post('/tournaments/:id/entries',async c=>{const input=await body(c,z.object({teamId:z.string()}).strict());ownTeam(c,input.teamId);return c.json(await joinTournament(platform(c).sql,input.teamId,uuid(c),actor(c)),201);});
app.post('/tournaments/:id/check-in',async c=>c.json(await checkIn(platform(c).sql,captain(c),uuid(c),actor(c))));
app.post('/tournaments/:id/withdraw',async c=>{const input=await body(c,z.object({reason:text(0,1000)}));await withdraw(platform(c).sql,captain(c),uuid(c),input.reason,actor(c));return c.body(null,204);});
app.get('/team/tournaments/:id/rounds/:roundId/room',async c=>c.json(await room(platform(c).sql,captain(c),uuid(c),uuid(c,'roundId'))));
app.post('/admin/tournaments',async c=>{admin(c,['tournament-manager']);const result=await createTournament(platform(c).sql,actor(c),await body(c,tournamentInput),c.req.header('idempotency-key'));return c.json(await platform(c).tournament(result.id),201);});
app.patch('/admin/tournaments/:id',async c=>{admin(c,['tournament-manager']);const id=uuid(c);await editTournament(platform(c).sql,actor(c),id,await body(c,editTournamentInput));return c.json(await platform(c).tournament(id));});
app.get('/admin/tournaments/:id/entries',async c=>{admin(c,['tournament-manager','result-operator']);return c.json((await platform(c).rows('tournament_registrations')).filter(r=>r.tournament_id===uuid(c)).map(r=>({id:r.id,teamId:r.team_id,status:r.status,slotNumber:r.slot_number})));});
app.patch('/admin/tournaments/:id/entries/:teamId',async c=>{admin(c,['tournament-manager']);const input=await body(c,z.object({status:z.enum(['confirmed','rejected']),reason:text(0,1000).optional()}));await reviewEntry(platform(c).sql,actor(c),uuid(c),teamId(c,'teamId'),input.status,input.reason);return c.body(null,204);});
app.put('/admin/matches/:id/room',async c=>{admin(c,['tournament-manager']);const input=await body(c,z.object({roomId:text(1,100),password:text(1,200)}).strict()),id=uuid(c);await transaction(platform(c).sql,async tx=>{
 const [m]=await tx`select id from aevic.matches where id=${id} and published_at is null for update`;if(!m)throw new ServiceError(409,'MATCH_CLOSED');
 await tx`insert into aevic.match_rooms(match_id,room_id,password) values(${id},${input.roomId},${input.password}) on conflict(match_id) do update set room_id=excluded.room_id,password=excluded.password,updated_at=now()`;await audit(tx,actor(c),'room.update','match',id);
 });return c.body(null,204);});
app.get('/admin/results',async c=>{admin(c,['result-operator']);const id=z.uuid().parse(c.req.query('roundId'));return c.json((await platform(c).rows('team_match_results')).filter(r=>r.match_id===id).map(roundResult));});
app.post('/admin/results',async c=>{admin(c,['result-operator']);const input=await body(c,resultInput);await saveResults(platform(c).sql,actor(c),input.roundId,[input]);const [row]=await platform(c).sql`select *,team_id::text from aevic_platform.team_match_results where match_id=${input.roundId} and team_id=${input.teamId}`;return c.json(roundResult(row));});
app.post('/admin/matches/:id/publication',async c=>{admin(c,['result-operator']);await publishMatch(platform(c).sql,actor(c),uuid(c));return c.body(null,204);});
app.get('/admin/context',async c=>{
 admin(c);const r=platform(c),[teams,tournaments,entries,messages,schedule,checks,matches,orgs]=await Promise.all([r.teams(true),r.tournaments(),r.rows('tournament_registrations'),r.messages(),r.schedule(),r.rows('check_ins'),r.rows('matches'),organizations(r)]);
 const slots=tournaments.flatMap(t=>Array.from({length:t.maxSlots},(_,i)=>{const e=entries.find(e=>e.tournament_id===t.id&&e.status==='confirmed'&&e.slot_number===i+1);return{number:i+1,tournamentId:t.id,teamId:e?.team_id,state:e?'occupied':'available'};}));
 const checkIns=entries.filter(e=>e.status==='confirmed').flatMap(e=>{const t=tournaments.find(t=>t.id===e.tournament_id);if(!t)return[];const check=checks.find(k=>k.team_id===e.team_id&&k.tournament_id===e.tournament_id);return[{teamId:e.team_id,tournamentId:e.tournament_id,status:check?'checked-in':Date.now()>=Date.parse(t.checkInClosesAt)?'missed':Date.now()>=Date.parse(t.checkInOpensAt)?'open':'pending',opensAt:t.checkInOpensAt,closesAt:t.checkInClosesAt,checkedInAt:check?.checked_in_at}];});
 return c.json({currentTeam:null,teams,tournaments,slots,adminMessages:messages,blacklist:teams.filter(t=>t.approvalStatus==='banned').map(t=>({id:t.id,teamId:t.id,teamName:t.name,reason:t.rejectionReason,active:true,permanent:true})),organizations:orgs,teamAchievements:[],matchSchedule:schedule,checkIns,publishedRoundIds:Object.fromEntries(tournaments.map(t=>[t.id,matches.filter(m=>m.tournament_id===t.id&&m.published_at).map(m=>m.id)]))});
});
app.get('/teams',async c=>{admin(c);return c.json(await platform(c).teams(true));});
app.patch('/admin/teams/:id/approval',async c=>{
 admin(c,['tournament-manager']);const input=await body(c,z.object({status:z.enum(['pending','approved','rejected','banned']),reason:text(0,1000).optional()})),id=teamId(c);
 if(['rejected','banned'].includes(input.status)&&!input.reason?.trim())throw new ServiceError(422,'REASON_REQUIRED');
 await transaction(platform(c).sql,async tx=>{const rows=await tx`update public.teams set status=${input.status},rejection_reason=${input.reason??null} where id=${id} returning id`;if(!rows.length)throw new ServiceError(404,'TEAM_NOT_FOUND');await audit(tx,actor(c),'team.approval','team',id,{status:input.status});await notify(tx,id,'Komanda statusu yeniləndi',input.reason??input.status,'/team');});
 return c.json(await platform(c).team(id,true));
});
app.get('/me/notifications',async c=>{
 const owner=captain(c),{offset,limit}=pagination(c);
 if(c.req.query('page')!=='true')return c.json(await platform(c).notifications(owner));
 const rows=await platform(c).sql`select * from aevic_platform.notifications where recipient_id=${owner} order by created_at desc,id desc offset ${offset} limit ${limit+1}`;
 const hasMore=rows.length>limit;
 return c.json({items:normalize(rows.slice(0,limit)).map(notification),hasMore,nextCursor:hasMore?String(offset+limit):undefined});
});
app.put('/me/notifications/:id/read',async c=>{const id=uuid(c),owner=captain(c);const rows=await platform(c).sql`update aevic_platform.notifications set read_at=coalesce(read_at,now()) where id=${id} and recipient_id=${owner} returning id`;if(!rows.length)throw new ServiceError(404,'NOT_FOUND');return c.body(null,204);});
app.put('/me/notifications/read-all',async c=>{await platform(c).sql`update aevic_platform.notifications set read_at=now() where recipient_id=${captain(c)} and read_at is null`;return c.body(null,204);});
app.put('/me/messages/:id/read',async c=>{const id=uuid(c),team=captain(c),r=platform(c),account=r.actor.accountId??team;const rows=await r.sql`insert into aevic_platform.message_reads(message_id,account_id) select id,${account} from aevic_platform.messages where id=${id} and (team_id is null or team_id=${team}) on conflict(message_id,account_id) do update set read_at=aevic_platform.message_reads.read_at returning message_id`;if(!rows.length)throw new ServiceError(404,'NOT_FOUND');return c.body(null,204);});
app.get('/me/messages',async c=>c.json(await platform(c).messages(captain(c))));
app.get('/me/follows',async c=>{const r=platform(c),id=captain(c),[rows,teams]=await Promise.all([r.rows('follows'),r.teams()]);return c.json(rows.filter(row=>row.user_id===id).flatMap(row=>{const t=teams.find(t=>t.id===row.team_id);return t?[{entityType:'TEAM',entityId:t.id,following:true,source:'backend',team:summary(t)}]:[];}));});
app.get('/me/follows/status',async c=>{const owner=captain(c),id=z.string().regex(/^[1-9]\d{0,18}$/).parse(c.req.query('entityId'));z.literal('TEAM').parse(c.req.query('entityType'));const rows=await platform(c).sql`select team_id from aevic_platform.follows where user_id=${owner} and team_id=${id}`;return c.json({entityType:'TEAM',entityId:id,following:rows.length>0});});
app.put('/me/follows',async c=>{const owner=captain(c),input=await body(c,z.object({entityType:z.literal('TEAM'),entityId:z.string().regex(/^[1-9]\d{0,18}$/),following:z.boolean()}));await platform(c).profile(input.entityId);const sql=platform(c).sql;if(input.following)await sql`insert into aevic_platform.follows(user_id,team_id) values(${owner},${input.entityId}) on conflict do nothing`;else await sql`delete from aevic_platform.follows where user_id=${owner} and team_id=${input.entityId}`;return c.json({...input,source:'backend'});});
app.get('/teams/:id/achievements',async c=>c.json(await achievements(platform(c),teamId(c))));
app.get('/teams/:id/legacy',async c=>c.json((await platform(c).profile(teamId(c))).legacy));
app.get('/teams/:id/achievements/featured',async c=>c.json((await achievements(platform(c),teamId(c))).filter(a=>a.featured).sort((a,b)=>(a.displayOrder??0)-(b.displayOrder??0))));
app.put('/teams/:id/achievements/featured',async c=>{const id=ownTeam(c,teamId(c)),input=await body(c,z.object({achievementIds:z.array(z.enum(['first-wwcd','hundred-kills','ten-matches'])).max(3)}));const badges=await achievements(platform(c),id);if(new Set(input.achievementIds).size!==input.achievementIds.length||input.achievementIds.some(k=>!badges.some(b=>b.id===k&&b.state==='unlocked')))throw new ServiceError(422,'ACHIEVEMENT_NOT_EARNED');await transaction(platform(c).sql,async tx=>{await tx`select id from public.teams where id=${id} for update`;await tx`delete from aevic_platform.featured_achievements where team_id=${id}`;for(const [i,key]of input.achievementIds.entries())await tx`insert into aevic_platform.featured_achievements(team_id,achievement_id,position) values(${id},${key},${i+1})`;});const refreshed=new PlatformRepository(c.get('db'),platform(c).sql,actor(c));return c.json((await achievements(refreshed,id)).filter(a=>a.featured).sort((a,b)=>(a.displayOrder??0)-(b.displayOrder??0)));});
app.get('/organizations',async c=>c.json(await organizations(platform(c))));
app.get('/organizations/:slug',async c=>{const row=(await organizations(platform(c))).find(o=>o.slug===c.req.param('slug')||o.id===c.req.param('slug'));if(!row)throw new ServiceError(404,'NOT_FOUND');return c.json(row);});
app.get('/admin/audit',async c=>{admin(c);return c.json((await platform(c).rows('audit_events')).map(r=>({id:r.id,actorName:r.actor_id,actorRole:(r.metadata as Record<string,unknown>)?.actorRole??(String(r.actor_id).startsWith('team:')?'account':'unknown'),action:r.action,entityType:r.entity_type,entityId:r.entity_id,createdAt:r.created_at,metadata:r.metadata})));});

export default app;
