import {createHash} from 'node:crypto';
import {z} from 'zod';
import {planUnclaimed} from './unclaimed.mjs';
export const productionRef='nmjjibifcuzjlsvfcaaz';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(canonical(value))).digest('hex');
export class MigrationError extends Error { constructor(code){super(code);this.code=code;} }
const fail=code=>{throw new MigrationError(code);};
const uuid=z.string().uuid();
const key=z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const sourceColumns=['id','team_name','logo_url','status','player1_ign','player2_ign','player3_ign','player4_ign','player5_ign'];
const row=z.object({id:key,team_name:z.string().max(1000).nullable(),logo_url:z.string().max(2000).nullable(),status:z.string().max(100).nullable(),...Object.fromEntries([1,2,3,4,5].map(n=>[`player${n}_ign`,z.string().max(1000).nullable()]))}).strict();
const sourceSchema=z.object({format:z.literal('aevic-legacy-teams-v1'),source:z.object({projectRef:key,sanitation:z.enum(['synthetic','authorized-sanitized']),authorizationId:uuid,catalogHash:digest}).strict(),table:z.literal('public.teams'),columns:z.array(z.string()),rows:z.array(row).max(10000)}).strict();
const reviewSchema=z.object({format:z.literal('aevic-legacy-review-v1'),sourceHash:digest,catalogHash:digest,reviewId:uuid,accounts:z.array(z.object({userId:uuid,identityEvidence:uuid}).strict()).max(10000).default([]),teams:z.array(z.object({sourceId:key,ownerUserId:uuid,ownershipEvidence:uuid,statusEvidence:uuid,approvalStatus:z.enum(['pending','approved','rejected','banned']),createdAt:z.string().datetime({offset:true}),ownerSince:z.string().datetime({offset:true}),players:z.array(z.object({slot:z.number().int().min(1).max(5),pubgId:z.string().regex(/^\d{5,20}$/),role:z.enum(['captain','starter','substitute']),identityEvidence:uuid}).strict()).length(5),historyDisposition:z.enum(['verified-no-history','defer']),historyEvidence:uuid.optional(),mediaDisposition:z.literal('defer')}).strict()).max(10000)}).strict();
export function validateTarget(value){
 const schema=z.object({environment:z.literal('local'),database:z.string().regex(/^aevic_migration_[a-z0-9_]{1,48}$/),port:z.number().int().min(1024).max(65535),instanceId:uuid}).strict();
 const parsed=schema.safeParse(value);if(!parsed.success||parsed.data.database.includes(productionRef))fail('INVALID_LOCAL_TARGET');return parsed.data;
}
export function stableId(source,kind,id){
 const h=hash(`aevic-legacy-v1\0${source}\0${kind}\0${id}`);
 return `${h.slice(0,8)}-${h.slice(8,12)}-8${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function planImport(source,review){
 if(source?.format==='aevic-legacy-unclaimed-v2')return planUnclaimed(source,review);
 const s=sourceSchema.safeParse(source),r=reviewSchema.safeParse(review);
 if(!s.success||!r.success)fail('UNEXPECTED_SOURCE_OR_REVIEW_SHAPE');
 source=s.data;review=r.data;
 if(JSON.stringify(source.columns)!==JSON.stringify(sourceColumns))fail('SOURCE_SCHEMA_DIFFERENCE');
 if(review.sourceHash!==hash(source)||review.catalogHash!==source.source.catalogHash)fail('REVIEW_SOURCE_MISMATCH');
 const refs=new Set();for(const row of source.rows){if(refs.has(row.id))fail('DUPLICATE_SOURCE_ID');refs.add(row.id);}
 const reviewed=new Map();for(const item of review.teams){if(reviewed.has(item.sourceId)||!refs.has(item.sourceId))fail('INVALID_REVIEW_IDENTITY');reviewed.set(item.sourceId,item);}
 const report={format:'aevic-reconciliation-v1',sourceHash:hash(source),reviewHash:hash(review),catalogHash:source.source.catalogHash,counts:{source:source.rows.length,ready:0,held:0,deferredMedia:0},records:[]};
 const planned=[];const names=new Map(),owners=new Map(),pubg=new Map();
 for(const row of source.rows){
  const reference=hash(`${source.source.projectRef}\0${row.id}`),decision=reviewed.get(row.id),reasons=[];
  if(!decision)reasons.push('OWNERSHIP_AND_ROSTER_REVIEW_REQUIRED');
  if(!row.team_name||row.team_name.trim().length<2||row.team_name.trim().length>60)reasons.push('TEAM_NAME_REQUIRES_REVIEW');
  if(decision){
   if(decision.historyDisposition!=='verified-no-history'||!decision.historyEvidence)reasons.push('HISTORY_REVIEW_REQUIRED');
   if(new Set(decision.players.map(p=>p.slot)).size!==5||decision.players.filter(p=>p.role==='captain').length!==1||decision.players.filter(p=>p.role==='starter').length!==3||decision.players.filter(p=>p.role==='substitute').length!==1)reasons.push('ROSTER_ROLES_REQUIRE_REVIEW');
   for(const p of decision.players)if(!row[`player${p.slot}_ign`]?.trim()||row[`player${p.slot}_ign`].trim().length<2||row[`player${p.slot}_ign`].trim().length>40)reasons.push('PLAYER_NAME_REQUIRES_REVIEW');
  }
  // Conflicts hold every involved record, including a previously planned record.
  const record={reference,disposition:reasons.length?'held':'ready',reasons:[...new Set(reasons)],media:row.logo_url?'deferred':'none'};
  const conflict=(map,k,code)=>{const previous=map.get(k);if(previous){previous.reasons.push(code);previous.disposition='held';record.reasons.push(code);record.disposition='held';}else map.set(k,record);};
  if(row.team_name)conflict(names,row.team_name.trim().toLowerCase(),'DUPLICATE_TEAM_NAME');
  if(decision){conflict(owners,decision.ownerUserId,'CONFLICTING_OWNER');for(const p of decision.players)conflict(pubg,p.pubgId,'CONFLICTING_PLAYER_IDENTITY');}
  report.records.push(record);
  if(decision){
   const teamId=stableId(source.source.projectRef,'team',row.id);
   planned.push({reference,sourceRef:source.source.projectRef,sourceKey:row.id,teamId,ownerId:decision.ownerUserId,name:row.team_name?.trim(),slug:`team-${teamId}`,approvalStatus:decision.approvalStatus,createdAt:decision.createdAt,ownerSince:decision.ownerSince,players:decision.players.map(p=>({id:stableId(source.source.projectRef,'player',p.pubgId),ign:row[`player${p.slot}_ign`]?.trim(),pubgId:p.pubgId,role:p.role})),evidenceHash:hash(decision)});
  }
 }
 const ready=planned.filter(p=>report.records.find(r=>r.reference===p.reference).disposition==='ready').map(p=>({...p,payloadHash:hash(p)}));
 report.counts.ready=ready.length;report.counts.held=source.rows.length-ready.length;report.counts.deferredMedia=report.records.filter(r=>r.media==='deferred').length;
 for(const record of report.records)record.reasons=[...new Set(record.reasons)];
 const accounts=[...new Set([...review.accounts.map(a=>a.userId),...ready.map(t=>t.ownerId)])].map(id=>({id,reference:hash(`auth-profile\0${id}`)}));
 report.counts.profilesReviewed=accounts.length;
 return {report,ready,accounts};
}
