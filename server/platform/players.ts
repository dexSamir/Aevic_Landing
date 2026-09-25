import {Hono} from 'hono';
import {z} from 'zod';
import type {Env,ApiContext} from '../types';
import type {PublicPlayerProfile} from '../../src/types/domain';
import {platform,actor,captain,admin} from './context';
import {body,text,pagination} from '../validation/input';
import {ServiceError} from '../errors';
import {idempotent,transaction,audit,notify} from './competition';
const app=new Hono<Env>();
const pubgId=(value:string)=>z.string().regex(/^pubg-\d{5,20}$/).parse(value).slice(5);
async function catalog(c:ApiContext){
 const r=platform(c),teams=await r.teams(),[details,registrations,tournaments]=await Promise.all([r.sql`select team_id::text,slot,pubg_id from aevic_platform.player_details where pubg_id is not null`,r.rows('tournament_registrations'),r.tournaments()]);
 const items:PublicPlayerProfile[]=details.flatMap(d=>{const team=teams.find(t=>t.id===d.team_id),member=team?.roster.find(p=>p.id===`${d.team_id}:player${d.slot}`);if(!team||!member)return[];
  return[{id:`pubg-${d.pubg_id}`,slug:`pubg-${d.pubg_id}`,ign:member.ign,currentTeam:{id:team.id,slug:team.slug!,name:team.name,logoUrl:team.logoUrl},achievements:[],tournamentHistory:registrations.filter(e=>e.status==='confirmed'&&(e.roster as Array<{uid?:string}>).some(p=>p.uid===d.pubg_id)).flatMap(e=>{const t=tournaments.find(t=>t.id===e.tournament_id);return t?[{tournamentId:t.id,tournamentName:t.name}]:[];})}];
 });return items.sort((a,b)=>a.ign.localeCompare(b.ign)||a.id.localeCompare(b.id));
}
async function player(c:ApiContext,id:string){pubgId(id);const p=(await catalog(c)).find(p=>p.id===id);if(!p)throw new ServiceError(404,'PLAYER_NOT_FOUND');return p;}
async function membership(c:ApiContext,id:string){const uid=pubgId(id),r=platform(c),teams=await r.teams();return(await r.rows('tournament_registrations')).filter(e=>e.status==='confirmed').flatMap(e=>{const p=(e.roster as Array<{uid?:string;role?:string}>).find(p=>p.uid===uid),team=teams.find(t=>t.id===e.team_id);return p&&team?[{id:e.id,userId:id,entityId:team.id,entityName:team.name,role:p.role==='captain'?'CAPTAIN':p.role==='substitute'?'SUBSTITUTE':'PLAYER',joinedAt:e.created_at,snapshotLabel:'Turnir qeydiyyatında qeydə alınmış heyət; ilkin qoşulma tarixi deyil.'}]:[];});}
app.get('/players',async c=>{const search=text(0,100).parse(c.req.query('search')??'').toLocaleLowerCase('az-AZ'),items=(await catalog(c)).filter(p=>p.ign.toLocaleLowerCase('az-AZ').includes(search)),{offset,limit}=pagination(c);return c.json({items:items.slice(offset,offset+limit),hasMore:offset+limit<items.length,nextCursor:offset+limit<items.length?String(offset+limit):undefined,total:items.length});});
// Keep the deliberate private PUBG lookup endpoint in public.ts from being shadowed.
app.get('/players/:id',async(c,next)=>c.req.param('id')==='lookup'?next():c.json(await player(c,c.req.param('id'))));
app.get('/players/:id/membership-history',async c=>{const id=c.req.param('id');await player(c,id);return c.json(await membership(c,id));});
app.get('/players/:id/claims',async c=>{
 const owner=captain(c),id=c.req.param('id'),uid=pubgId(id);
 const rows=await platform(c).sql`select id,method,status,created_at,reviewed_at,safe_reason from aevic_platform.player_claims where pubg_id=${uid} and claimant_id=${owner} order by created_at desc`;
 return c.json(rows.map(r=>({id:r.id,playerId:id,claimantUserId:owner,status:r.status,verificationMethod:r.method,createdAt:r.created_at,reviewedAt:r.reviewed_at??undefined,safeReason:r.safe_reason??undefined})));
});
app.post('/players/:id/claims',async c=>{
 const owner=captain(c),id=c.req.param('id'),uid=pubgId(id);await player(c,id);
 const input=await body(c,z.object({verificationMethod:z.enum(['ACCOUNT_MATCH','PUBG_IDENTITY','ADMIN_REVIEW']),evidence:z.array(z.string()).max(0).optional()}).strict());
 const result=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'player.claim',{id,...input},async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${'player-claim:'+uid},0))`;
  const active=await tx`select id from aevic_platform.player_claims where pubg_id=${uid} and (status='APPROVED' or (status='PENDING' and claimant_id=${owner}))`;if(active.length)throw new ServiceError(409,'CLAIM_ALREADY_ACTIVE');
  const [r]=await tx`insert into aevic_platform.player_claims(pubg_id,claimant_id,method) values(${uid},${owner},${input.verificationMethod}) returning id,created_at`;await audit(tx,actor(c),'player.claim','player',id);return{id:r.id,playerId:id,claimantUserId:owner,status:'PENDING',verificationMethod:input.verificationMethod,createdAt:r.created_at};
 });return c.json(result,201);
});
app.get('/admin/players/:id',async c=>{
 admin(c,['support-moderator']);const id=c.req.param('id'),p=await player(c,id),uid=pubgId(id),sql=platform(c).sql;
 const claims=await sql`select c.id,c.claimant_id::text,c.method,c.status,c.safe_reason,c.created_at,c.reviewed_at,t.captain_name from aevic_platform.player_claims c join aevic_platform.account_identity t on t.id=c.claimant_id where c.pubg_id=${uid} order by c.created_at desc`;
 const approved=claims.find(c=>c.status==='APPROVED');
 const registrations=await platform(c).rows('tournament_registrations');
 const tournamentHistory=p.tournamentHistory.map(t=>({...t,rosterSnapshotId:registrations.find(e=>e.tournament_id===t.tournamentId&&e.status==='confirmed'&&(e.roster as Array<{uid?:string}>).some(p=>p.uid===uid))!.id}));
 return c.json({...p,membershipHistory:await membership(c,id),eligibilityConflicts:[],sanctions:[],verification:{id:approved?.id??id,entityId:id,entityType:'PLAYER',entityName:p.ign,representativeName:approved?.captain_name??'',officialSocials:{},evidenceNames:[],status:approved?'APPROVED':'NOT_APPLIED'},linkedAccount:approved?{userId:approved.claimant_id,displayName:approved.captain_name,status:'ACTIVE'}:undefined,claims:claims.map(r=>({id:r.id,claimantName:r.captain_name,status:r.status,method:r.method,createdAt:r.created_at,reason:r.safe_reason??undefined})),tournamentHistory});
});
app.patch('/admin/player-claims/:id',async c=>{
 const reviewer=admin(c,['support-moderator']),id=z.uuid().parse(c.req.param('id')),input=await body(c,z.object({status:z.enum(['APPROVED','REJECTED']),reason:text(10,2000)}).strict());
 await transaction(platform(c).sql,async tx=>{
  const [identity]=await tx`select pubg_id from aevic_platform.player_claims where id=${id}`;if(!identity)throw new ServiceError(404,'CLAIM_NOT_FOUND');
  await tx`select pg_advisory_xact_lock(hashtextextended(${'player-claim:'+identity.pubg_id},0))`;
  const [claim]=await tx`select *,claimant_id::text from aevic_platform.player_claims where id=${id} for update`;if(claim.status!=='PENDING')throw new ServiceError(409,'CLAIM_CLOSED');
  if(input.status==='APPROVED'&&(await tx`select id from aevic_platform.player_claims where pubg_id=${claim.pubg_id} and status='APPROVED'`).length)throw new ServiceError(409,'PLAYER_ALREADY_CLAIMED');
  await tx`update aevic_platform.player_claims set status=${input.status},safe_reason=${input.reason},reviewed_at=now(),reviewed_by=${reviewer} where id=${id}`;await audit(tx,actor(c),'player.claim-review','player-claim',id,{status:input.status,reason:input.reason});await notify(tx,claim.claimant_id,'Oyunçu müraciəti yeniləndi',input.reason,`/account/player/claim/pubg-${claim.pubg_id}`,'system');
 });return c.body(null,204);
});
export default app;
