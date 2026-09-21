import {z} from 'zod';
import {hash,stableId,MigrationError,productionRef} from './core.mjs';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),key=z.string().regex(/^[0-9]{1,19}$/);
const sourceSchema=z.object({format:z.literal('aevic-legacy-unclaimed-v2'),source:z.object({projectRef:z.string(),sanitation:z.enum(['synthetic','authorized-sanitized']),authorizationId:uuid,catalogHash:digest}).strict(),table:z.literal('public.teams'),rows:z.array(z.object({id:key,team_name:z.string().max(1000),status:z.string().min(1).max(100),tier:z.string().max(100).nullable(),created_at:z.string().datetime({offset:true}),match_results:z.array(z.never()).length(0),roster_names:z.array(z.string().max(1000).nullable()).length(5),logo_url:z.string().max(2000).nullable(),player_photo_urls:z.array(z.string().max(2000).nullable()).length(5),captain_contact:z.object({name:z.string().max(160).optional(),email:z.string().email().optional(),contact:z.string().max(200).optional()}).strict(),rejection_reason:z.string().max(3000).nullable()}).strict()).max(10000)}).strict();
const reviewSchema=z.object({format:z.literal('aevic-legacy-unclaimed-review-v2'),sourceHash:digest,catalogHash:digest,reviewId:uuid,teams:z.array(z.object({sourceId:key,approvalStatus:z.enum(['pending','approved','rejected','banned']),statusEvidence:uuid,importEvidence:uuid}).strict()).max(10000)}).strict();
export function planUnclaimed(source,review){
 const s=sourceSchema.safeParse(source),r=reviewSchema.safeParse(review);if(!s.success||!r.success)throw new MigrationError('UNEXPECTED_SOURCE_OR_REVIEW_SHAPE');source=s.data;review=r.data;
 if(source.source.projectRef!==productionRef)throw new MigrationError('UNREVIEWED_SOURCE_PROJECT');
 if(hash(source)!==review.sourceHash||source.source.catalogHash!==review.catalogHash)throw new MigrationError('REVIEW_SOURCE_MISMATCH');
 const keys=new Set(source.rows.map(r=>r.id));if(keys.size!==source.rows.length)throw new MigrationError('DUPLICATE_SOURCE_ID');
 const reviews=new Map();for(const decision of review.teams){if(reviews.has(decision.sourceId)||!keys.has(decision.sourceId))throw new MigrationError('INVALID_REVIEW_IDENTITY');reviews.set(decision.sourceId,decision);}
 const report={format:'aevic-reconciliation-v2',sourceHash:hash(source),reviewHash:hash(review),catalogHash:source.source.catalogHash,counts:{source:source.rows.length,ready:0,held:0,pendingClaim:0,profilesReviewed:0,deferredMedia:0},records:[]};
 const all=[],names=new Map();
 for(const row of source.rows){
  const decision=reviews.get(row.id),reference=hash(`${source.source.projectRef}\0${row.id}`),reasons=[];
  if(!decision)reasons.push('IMPORT_REVIEW_REQUIRED');
  if(row.team_name.trim().length<2||row.team_name.trim().length>60)reasons.push('TEAM_NAME_REQUIRES_REVIEW');
  if(row.roster_names.some(n=>!n||n.trim().length<2||n.trim().length>40))reasons.push('ROSTER_NAMES_REQUIRE_REVIEW');
  const media=[...(row.logo_url?[{kind:'logo',url:row.logo_url}]:[]),...row.player_photo_urls.flatMap((url,index)=>url?[{kind:'player-photo',slot:index+1,url}]:[])];
  for(const ref of media)try{const url=new URL(ref.url);if(url.protocol!=='https:'||url.username||url.password)reasons.push('MEDIA_REFERENCE_REQUIRES_REVIEW');}catch{reasons.push('MEDIA_REFERENCE_REQUIRES_REVIEW');}
  const record={reference,disposition:reasons.length?'held':'pending-claim',reasons,media:media.length?'preserved-private-not-published':'none',history:'legacy field empty; other sources unverified'};
  const name=row.team_name.trim().toLowerCase(),previous=names.get(name);if(previous){previous.disposition='held';previous.reasons.push('DUPLICATE_TEAM_NAME');record.disposition='held';record.reasons.push('DUPLICATE_TEAM_NAME');}else names.set(name,record);
  report.records.push(record);if(media.length)report.counts.deferredMedia++;
  if(decision)all.push({reference,sourceRef:source.source.projectRef,sourceKey:row.id,teamId:stableId(source.source.projectRef,'team',row.id),name:row.team_name.trim(),approvalStatus:decision.approvalStatus,legacyStatus:row.status,tier:row.tier,createdAt:row.created_at,rosterNames:row.roster_names.map(n=>n?.trim()),mediaReferences:media,captainContact:row.captain_contact,rejectionReason:row.rejection_reason,historyScope:'legacy_match_results_empty_other_sources_unverified',evidenceHash:hash(decision)});
 }
 const unclaimed=all.filter(p=>report.records.find(r=>r.reference===p.reference).disposition==='pending-claim').map(p=>({...p,payloadHash:hash(p)}));
 report.counts.ready=report.counts.pendingClaim=unclaimed.length;report.counts.held=source.rows.length-unclaimed.length;
 return {report,ready:[],accounts:[],unclaimed};
}
