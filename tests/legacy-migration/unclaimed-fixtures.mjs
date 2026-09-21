import {hash,productionRef} from '../../scripts/legacy-migration/core.mjs';
export function unclaimedFixture(count=7){
 const evidence='00000000-0000-4000-8000-000000000010';
 const source={format:'aevic-legacy-unclaimed-v2',source:{projectRef:productionRef,sanitation:'synthetic',authorizationId:evidence,catalogHash:'b'.repeat(64)},table:'public.teams',rows:Array.from({length:count},(_,i)=>({id:String(i+1),team_name:`Synthetic legacy ${i+1}`,status:'approved',tier:'legacy-tier',created_at:'2020-01-01T00:00:00Z',match_results:[],roster_names:[1,2,3,4,5].map(n=>`Legacy ${i+1} player ${n}`),logo_url:'https://example.test/logo.png',player_photo_urls:[null,'https://example.test/player-2.png',null,null,null],captain_contact:{name:'Synthetic captain',email:`captain-${i+1}@example.test`,contact:'Synthetic contact only'},rejection_reason:null}))};
 const review={format:'aevic-legacy-unclaimed-review-v2',sourceHash:hash(source),catalogHash:source.source.catalogHash,reviewId:evidence,teams:source.rows.map(row=>({sourceId:row.id,approvalStatus:'approved',statusEvidence:evidence,importEvidence:evidence}))};
 return {source,review};
}
