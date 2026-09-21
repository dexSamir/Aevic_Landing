import {hash,sourceColumns} from '../../scripts/legacy-migration/core.mjs';
export const owner='00000000-0000-4000-8000-000000000001';
export const other='00000000-0000-4000-8000-000000000002';
const evidence='00000000-0000-4000-8000-000000000010';
export function fixture(){
 const source={format:'aevic-legacy-teams-v1',source:{projectRef:'synthetic-local',sanitation:'synthetic',authorizationId:evidence,catalogHash:'a'.repeat(64)},table:'public.teams',columns:sourceColumns,rows:[{id:'legacy-1',team_name:'Migrated test team',status:'approved',logo_url:null,...Object.fromEntries([1,2,3,4,5].map(n=>[`player${n}_ign`,`Test player ${n}`]))}]};
 const review={format:'aevic-legacy-review-v1',sourceHash:hash(source),catalogHash:source.source.catalogHash,reviewId:evidence,teams:[{sourceId:'legacy-1',ownerUserId:owner,ownershipEvidence:evidence,statusEvidence:evidence,approvalStatus:'approved',createdAt:'2020-01-01T00:00:00Z',ownerSince:'2021-01-01T00:00:00Z',players:[1,2,3,4,5].map(slot=>({slot,pubgId:`10000${slot}`,role:slot===1?'captain':slot===5?'substitute':'starter',identityEvidence:evidence})),historyDisposition:'verified-no-history',historyEvidence:evidence,mediaDisposition:'defer'}]};
 return {source,review};
}
export function rebind(source,review){review.sourceHash=hash(source);return {source,review};}
