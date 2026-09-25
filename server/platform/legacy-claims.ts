import {Hono} from 'hono';
import {setCookie} from 'hono/cookie';
import {z} from 'zod';
import {randomBytes} from 'node:crypto';
import type {Env} from '../types';
import {platform,account,actor,admin,tokenDigest} from './context';
import {body} from '../validation/input';
import {transaction,audit} from './competition';
import {ServiceError} from '../errors';
import {createAttemptLimiter} from '../captain/limit';
const app=new Hono<Env>(),limit=createAttemptLimiter();
const claimView=(r:Record<string,any>)=>({id:r.id,sourceKey:String(r.team_id),status:r.status==='approved'&&new Date(r.expires_at).getTime()<=Date.now()?'expired':r.status,createdAt:r.created_at});
app.get('/me/legacy-claims',async c=>{const rows=await platform(c).sql`select id,team_id,status,created_at,expires_at from aevic_platform.legacy_claims where claimant_id=${account(c)} order by created_at desc,id`;return c.json(rows.map(claimView));});
app.post('/me/legacy-claims',async c=>{
 const owner=account(c),input=await body(c,z.object({sourceKey:z.string().regex(/^[1-9]\d{0,18}$/)}).strict());limit('legacy-claim',owner,10);
 await transaction(platform(c).sql,async tx=>{
  const [identity]=await tx`select coalesce(a.email_verified_at,d.email_verified_at) as verified from aevic_platform.accounts a left join aevic_platform.team_details d on d.team_id=a.original_team_id where a.id=${owner}`;if(!identity?.verified)throw new ServiceError(403,'EMAIL_VERIFICATION_REQUIRED');
  const [team]=await tx`select t.id from public.teams t left join aevic_platform.team_details d on d.team_id=t.id where t.id=${input.sourceKey} and coalesce(d.legacy_history_incomplete,true) and d.archived_at is null for update of t`;
  if(!team||(await tx`select id from aevic_platform.legacy_claims where team_id=${input.sourceKey} and (status='consumed' or (claimant_id=${owner} and status in ('pending','approved')))` ).length)return;
  const [r]=await tx`insert into aevic_platform.legacy_claims(team_id,claimant_id) values(${input.sourceKey},${owner}) returning id`;await audit(tx,actor(c),'legacy.claim-request','legacy-claim',r.id);
 });return c.json({accepted:true},202);
});
app.get('/admin/legacy-teams',async c=>{
 admin(c,['support-moderator']);const rows=await platform(c).sql`select t.id::text,t.team_name,t.status,t.tier,t.created_at,t.logo_url,t.player1_ign,t.player2_ign,t.player3_ign,t.player4_ign,t.player5_ign,t.player1_photo_url,t.player2_photo_url,t.player3_photo_url,t.player4_photo_url,t.player5_photo_url,exists(select 1 from aevic_platform.legacy_claims c where c.team_id=t.id and c.status='consumed') as claimed from public.teams t left join aevic_platform.team_details d on d.team_id=t.id where coalesce(d.legacy_history_incomplete,true) order by t.id`;
 return c.json(rows.map(r=>({teamId:r.id,sourceKey:r.id,name:r.team_name,status:r.claimed?'claimed':'unclaimed',rosterNames:[1,2,3,4,5].map(i=>r[`player${i}_ign`]).filter(Boolean),mediaReferences:[...(r.logo_url?[{kind:'logo',url:r.logo_url}]:[]),...[1,2,3,4,5].flatMap(slot=>r[`player${slot}_photo_url`]?[{kind:'player-photo',slot,url:r[`player${slot}_photo_url`]}]:[])],legacyStatus:r.status,tier:r.tier,createdAt:r.created_at,historyScope:'Original record retained; only recorded results contribute to statistics.'})));
});
app.get('/admin/legacy-claims',async c=>{
 admin(c,['support-moderator']);const rows=await platform(c).sql`select c.*,c.team_id::text,c.claimant_id::text,t.team_name,t.captain_name,t.captain_contact,t.email,a.email as applicant_email,exists(select 1 from aevic_platform.legacy_claims consumed where consumed.team_id=c.team_id and consumed.status='consumed') as claimed from aevic_platform.legacy_claims c join public.teams t on t.id=c.team_id join aevic_platform.account_identity a on a.id=c.claimant_id order by c.created_at desc,c.id`;
 return c.json(rows.map(r=>({...claimView(r),userId:r.claimant_id,version:r.version,expiresAt:r.expires_at??undefined,teamName:r.team_name,claimed:r.claimed,legacyContact:{name:r.captain_name,email:r.email,contact:r.captain_contact},applicantEmail:r.applicant_email})));
});
app.post('/admin/legacy-claims/:id/review',async c=>{
 const reviewer=admin(c,['support-moderator']),id=z.uuid().parse(c.req.param('id')),input=await body(c,z.object({decision:z.enum(['approve','reject']),evidenceRef:z.uuid(),expectedVersion:z.number().int().positive()}).strict());
 const code=input.decision==='approve'?randomBytes(32).toString('base64url'):undefined;
 const result=await transaction(platform(c).sql,async tx=>{
  const [target]=await tx`select team_id from aevic_platform.legacy_claims where id=${id}`;if(!target)throw new ServiceError(404,'CLAIM_NOT_FOUND');
  await tx`select id from public.teams where id=${target.team_id} for update`;
  const [claim]=await tx`select *,claimant_id::text from aevic_platform.legacy_claims where id=${id} for update`;
  if(claim.version!==input.expectedVersion||claim.status==='consumed')throw new ServiceError(409,'CLAIM_CHANGED');
  if((await tx`select id from aevic_platform.legacy_claims where team_id=${claim.team_id} and status='consumed'`).length)throw new ServiceError(409,'TEAM_ALREADY_CLAIMED');
  const evidence=await tx`select id from aevic_platform.support_tickets where id=${input.evidenceRef} and user_id=${claim.claimant_id}`;if(!evidence.length)throw new ServiceError(422,'EVIDENCE_RECORD_REQUIRED');
  const [row]=await tx`update aevic_platform.legacy_claims set status=${code?'approved':'rejected'},version=version+1,token_digest=${code?tokenDigest(code):null},expires_at=case when ${Boolean(code)} then now()+interval '30 minutes' else null end,evidence_id=${input.evidenceRef},reviewer_id=${reviewer},reviewed_at=now() where id=${id} returning expires_at`;
  await audit(tx,actor(c),'legacy.claim-review','legacy-claim',id,{decision:input.decision,evidenceRef:input.evidenceRef});return{expiresAt:row.expires_at??undefined};
 });return c.json({...result,code});
});
app.post('/me/legacy-claims/:id/consume',async c=>{
 const owner=account(c),id=z.uuid().parse(c.req.param('id')),input=await body(c,z.object({code:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict());limit('legacy-consume',owner,10);
 const result=await transaction(platform(c).sql,async tx=>{
  const [target]=await tx`select team_id from aevic_platform.legacy_claims where id=${id} and claimant_id=${owner}`;if(!target)throw new ServiceError(422,'CLAIM_INVALID');
  await tx`select id from public.teams where id=${target.team_id} for update`;
  const [claim]=await tx`select team_id::text from aevic_platform.legacy_claims where id=${id} and claimant_id=${owner} and status='approved' and expires_at>clock_timestamp() and token_digest=${tokenDigest(input.code)} for update`;if(!claim)throw new ServiceError(422,'CLAIM_INVALID');
  if((await tx`select id from aevic_platform.legacy_claims where team_id=${claim.team_id} and status='consumed'`).length)throw new ServiceError(409,'TEAM_ALREADY_CLAIMED');
  // Preserve every existing credential and all team data; only explicit authority changes.
  await tx`update aevic_platform.team_authority set role='MANAGER' where team_id=${claim.team_id} and role='OWNER' and account_id<>${owner}`;
  await tx`insert into aevic_platform.team_authority(team_id,account_id,role) values(${claim.team_id},${owner},'OWNER') on conflict(team_id,account_id) do update set role='OWNER'`;
  await tx`update aevic_platform.legacy_claims set status='consumed',version=version+1,token_digest=null,expires_at=null,consumed_at=now() where id=${id}`;
  await tx`update aevic_platform.legacy_claims set status='rejected',version=version+1,token_digest=null,expires_at=null where team_id=${claim.team_id} and id<>${id} and status in ('pending','approved')`;
  await audit(tx,actor(c),'legacy.claim-consume','team',claim.team_id,{claimId:id});return{teamId:claim.team_id};
 });setCookie(c,'aevic-workspace',result.teamId,{path:'/',httpOnly:true,secure:c.get('config').secureCookies,sameSite:'Strict'});return c.json(result);
});
export default app;
