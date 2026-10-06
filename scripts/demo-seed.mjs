/**
 * Demo v2 borrows existing team 16; its credentials/account/owner are never written.
 * Only its name, approval, roster names and profile metadata are patched, with a
 * private receipt containing restorable preimages (no credentials). Other teams
 * are untouched. No migrations, URL rewriting, email delivery, or media writes.
 * Run from the repository root:
 * node --env-file=.env scripts/demo-seed.mjs plan
 * node --env-file=.env scripts/demo-seed.mjs apply
 * node --env-file=.env scripts/demo-seed.mjs verify
 * node --env-file=.env scripts/demo-seed.mjs rehearse-remove # deletes then ROLLBACK
 * node --env-file=.env scripts/demo-seed.mjs remove
 * Optional AEVIC_DEMO_AS_OF=YYYY-MM-DD anchors a NEW seed; existing seeds never refresh.
 * Removal fails closed on edited fixtures or additional FK references. No CASCADE.
 * remove restores team 16/profile; it never deletes team 16, its account or owner.
 * Demo events are deliberately visible in public rankings, all named [DEMO].
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import postgres from 'postgres';

export const KEY = 'aevic-demo-id16-v2';
export const TARGET = '16';
export const ORIGINALS = ['2','7','8','9','10','12'];
export const TEAM_IDS = [TARGET,...Array.from({length:11},(_,i)=>String(870000000002n+BigInt(i)))];
const LEGACY_KEY='aevic-demo-v1',LEGACY_EMAIL='aevic-demo-v1@example.invalid';
const RECEIPT = 'aevic_platform.idempotency';
const hour = 3600000, day = 24*hour;
const iso = value => new Date(value).toISOString();
const digest = value => createHash('sha256').update(value).digest('hex');
export const uuid = label => {
 const h=digest(`${KEY}:${label}`);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};
const keys = {
 'public.teams':['id'], 'aevic_platform.accounts':['id'], 'aevic_platform.team_authority':['id'],
 'aevic_platform.team_details':['team_id'], 'aevic_platform.player_details':['team_id','slot'],
 'aevic.organizations':['id'], 'aevic_platform.organization_teams':['organization_id','team_id'],
 'aevic_platform.organization_members':['id'], 'aevic_platform.admin_accounts':['id'],
 'aevic.tournaments':['id'], 'aevic_platform.tournament_registrations':['id'],
 'aevic_platform.check_ins':['tournament_id','team_id'], 'aevic.matches':['id'],
 'aevic.match_rooms':['match_id'], 'aevic_platform.team_match_results':['id'],
 'aevic_platform.leaderboard_snapshots':['id'], 'aevic_platform.featured_achievements':['team_id','achievement_id'],
 'aevic_platform.follows':['user_id','team_id'], 'aevic_platform.notifications':['id'],
 'aevic_platform.notification_preferences':['user_id'], 'aevic_platform.messages':['id'],
 'aevic_platform.message_reads':['message_id','account_id'], 'aevic_platform.support_tickets':['id'],
 'aevic_platform.support_replies':['id'], 'aevic_platform.disputes':['id'],
 'aevic_platform.roster_change_requests':['id'], 'aevic_platform.verification_requests':['id'],
 'aevic_platform.player_claims':['id'], 'aevic_platform.audit_events':['id'],
};
const jsonColumns = new Set(['social_links','point_formula','roster','standings','preferences','official_socials','metadata','result']);
const pk = (table,row) => Object.fromEntries(keys[table].map(k=>[k,String(row[k])]));
// jsonb canonicalizes object key order when the receipt is read back.
export const signature = key => JSON.stringify(Object.fromEntries(Object.entries(key).sort(([a],[b])=>a.localeCompare(b))));
export const targetColumns={
 'public.teams':['team_name','status',...Array.from({length:5},(_,i)=>`player${i+1}_ign`)],
 'aevic_platform.team_details':['tag','description','country','founded_at','legacy_history_incomplete','social_links','updated_at'],
};
export function rank(rows) {
 const groups=new Map();
 for(const r of rows){const v=groups.get(r.team_id)??{teamId:r.team_id,totalPoints:0,wwcd:0,finishes:0,best:100};v.totalPoints+=r.placement_points+r.finish_points-r.penalties;v.wwcd+=Number(r.placement===1);v.finishes+=r.finishes;v.best=Math.min(v.best,r.placement);groups.set(r.team_id,v);}
 return [...groups.values()].sort((a,b)=>b.totalPoints-a.totalPoints||b.wwcd-a.wwcd||b.finishes-a.finishes||a.best-b.best||a.teamId.localeCompare(b.teamId)).map((r,i)=>({teamId:r.teamId,rank:i+1,totalPoints:r.totalPoints}));
}
export function buildDemo(asOf) {
 assert(/^\d{4}-\d{2}-\d{2}$/.test(asOf)&&iso(`${asOf}T00:00:00Z`).startsWith(asOf),'Invalid as-of date');
 const anchor=Date.parse(`${asOf}T12:00:00+04:00`), date=new Date(anchor);
 const first=Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-7,1,8);
 const batches=[];
 const add=(table,rows)=>{if(rows.length)batches.push({table,rows});};
 const created_at=iso(first),admin=uuid('inactive-demo-moderator'),org=uuid('organization');
 const rosters=TEAM_IDS.map((id,i)=>Array.from({length:5},(_,j)=>({id:`${id}:player${j+1}`,ign:i===0?`Test Oyunçu ${j+1}`:`Demo ${i} Oyunçu ${j+1}`,uid:String(990000000000001n+BigInt(i*5+j)),role:j===0?'captain':j===4?'substitute':'starter'})));
 add('public.teams',TEAM_IDS.slice(1).map((id,j)=>{const i=j+1;return {id,team_name:`[DEMO] Rəqib ${String(i).padStart(2,'0')}`,captain_name:`Demo Kapitan ${i}`,captain_contact:'DEMO — əlaqə yoxdur',email:`${KEY}-rival-${i}@example.invalid`,password_hash:'!demo-login-disabled',tier:'entry',status:'approved',created_at,...Object.fromEntries(rosters[i].map((p,j)=>[`player${j+1}_ign`,p.ign]))};}));
 add('aevic_platform.accounts',TEAM_IDS.slice(1).map(id=>({id,original_team_id:id,email_verified_at:created_at,created_at})));
 add('aevic_platform.team_authority',TEAM_IDS.slice(1).map(id=>({id:uuid(`owner:${id}`),team_id:id,account_id:id,role:'OWNER',created_at})));
 const profile={tag:'TEST',description:`[DEMO] ${KEY}. Nümayiş üçün sintetik heyət və nəticələr. Real yarış deyil.`,country:'Azərbaycan',founded_at:created_at.slice(0,10),legacy_history_incomplete:false,social_links:{website:'https://example.invalid/aevic-demo'},updated_at:iso(anchor)};
 const targetPatch={'public.teams':{team_name:'TEST HESABI',status:'approved',...Object.fromEntries(rosters[0].map((p,j)=>[`player${j+1}_ign`,p.ign]))},'aevic_platform.team_details':profile};
 add('aevic_platform.team_details',TEAM_IDS.slice(1).map((team_id,i)=>({team_id,...profile,tag:`DEMO${i+1}`,email_verified_at:created_at})));
 add('aevic_platform.player_details',rosters.flatMap((ps,i)=>ps.map((p,j)=>({team_id:TEAM_IDS[i],slot:j+1,pubg_id:p.uid,role:p.role}))));
 add('aevic_platform.admin_accounts',[{id:admin,email:`${KEY}-moderator@example.invalid`,first_name:'Demo',last_name:'Moderator',role:'support-moderator',active:false,created_at}]);
 add('aevic.organizations',[{id:org,name:'[DEMO] Test Esports',slug:KEY,short_name:'TEST',description:'[DEMO] Sintetik nümayiş təşkilatı',country:'Azərbaycan',founded_at:created_at.slice(0,10),created_at}]);
 add('aevic_platform.organization_teams',[{organization_id:org,team_id:TEAM_IDS[0],created_at}]);
 add('aevic_platform.organization_members',[{id:uuid('organization-owner'),organization_id:org,account_id:TEAM_IDS[0],role:'OWNER',created_at}]);
 const tournaments=[],matches=[],registrations=[],checkins=[],results=[],snapshots=[],rooms=[];
 const placementPoints=[0,10,6,5,4,3,2,1,1,0,0,0,0];
 const formula={placement:placementPoints.slice(1,9).map((points,i)=>({placement:i+1,points})),finishPointValue:1,wwcdBonus:0,defaultPenalty:0,tieBreakRules:['totalPoints','wwcd','finishes','bestFinish']};
 for(let t=0;t<9;t++){
  const start=t<7?Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-7+t,20,14):t===7?anchor-5*day:anchor+14*day;
  const end=start+(t===7?8*day:5*hour),id=uuid(`tournament:${t}`),deadline=start-2*hour;
  tournaments.push({id,slug:`${KEY}-${t+1}`,name:`[DEMO] ${t<7?'Mövsüm Kuboku '+(t+1):t===7?'Cari Liqa':'Növbəti Kubok'}`,short_name:`DEMO ${t+1}`,description:`${KEY}: yalnız demo komandalar üçün sintetik turnir.`,status:t<7?'completed':t===7?'ongoing':'registration-open',starts_at:iso(start),ends_at:iso(end),registration_opens_at:iso(start-21*day),registration_deadline:iso(deadline),check_in_opens_at:iso(start-hour),check_in_closes_at:iso(start-10*60000),max_slots:12,days:t===7?8:1,rounds_per_day:t===8?4:8,map_rotation:['Erangel','Miramar','Rondo'],point_formula:formula,rules:['[DEMO] Real iştirak və mükafat yoxdur.','Hər kill: 1 xal.'],created_at:iso(start-22*day)});
  for(let i=0;i<12;i++){
   registrations.push({id:uuid(`entry:${t}:${i}`),tournament_id:id,team_id:TEAM_IDS[i],status:'confirmed',slot_number:i+1,roster_lock_at:iso(deadline),roster:rosters[i],created_at:iso(Math.min(start-7*day,anchor-2*day)),updated_at:iso(Math.min(start-6*day,anchor-day))});
   if(t<8)checkins.push({tournament_id:id,team_id:TEAM_IDS[i],checked_in_at:iso(start-30*60000)});
  }
  const cumulative=[],target=[12,10,7,5,3,2,1,2,4][t];
  const order=TEAM_IDS.slice(1);order.splice(target-1,0,TEAM_IDS[0]);
  for(let r=0;r<(t===8?4:8);r++){
   const mid=uuid(`match:${t}:${r}`),played=start+(t===7?(r<6?Math.floor(r/2)*day+(r%2)*hour:6*day+(r-6)*hour):r*30*60000),published=t<7||(t===7&&r<6);
   matches.push({id:mid,tournament_id:id,round:r+1,day:t===7?Math.floor((played-start)/day)+1:1,map:['Erangel','Miramar','Rondo'][r%3],scheduled_at:iso(played),status:published?'completed':'scheduled',room_release_at:iso(played-10*60000),published_at:published?iso(played+25*60000):null,dispute_deadline_at:published?iso(played+85*60000):null,created_at:iso(start-21*day)});
   if(!published){rooms.push({match_id:mid,room_id:`DEMO-${t+1}-${r+1}`,password:'DEMO-NOT-A-REAL-ROOM'});continue;}
   // Adjacent form swings, with four upsets across each tournament. Lobby kills <= 44.
   const roundOrder=[...order];
   if(r%2===1)for(let j=r%3;j<11;j+=3)[roundOrder[j],roundOrder[j+1]]=[roundOrder[j+1],roundOrder[j]];
   const rr=roundOrder.map((team_id,i)=>({id:uuid(`result:${t}:${r}:${team_id}`),match_id:mid,tournament_id:id,team_id,placement:i+1,finishes:Math.floor((12-i)/2)+(r%3===0&&i<3?1:0),placement_points:placementPoints[i+1],finish_points:0,penalties:0,published:true,notes:`[DEMO] ${KEY}`,created_at:iso(played+25*60000),updated_at:iso(played+25*60000)}));
   if(t===6&&r===6){rr.find(x=>x.team_id===TEAM_IDS[0]).finishes=14;for(const row of rr)if(row.team_id!==TEAM_IDS[0])row.finishes=Math.max(0,row.finishes-1);}
   for(const row of rr)row.finish_points=row.finishes;
   assert(rr.reduce((s,x)=>s+x.finishes,0)<=44);
   cumulative.push(...rr);results.push(...rr);
   snapshots.push({id:uuid(`standings:${t}:${r}`),tournament_id:id,match_id:mid,reason:'publication',standings:rank(cumulative),published_at:iso(played+25*60000)});
  }
 }
 add('aevic.tournaments',tournaments);add('aevic_platform.tournament_registrations',registrations);add('aevic_platform.check_ins',checkins);
 add('aevic.matches',matches);add('aevic.match_rooms',rooms);add('aevic_platform.team_match_results',results);add('aevic_platform.leaderboard_snapshots',snapshots);
 const team=TEAM_IDS[0],recent=iso(anchor-day),ongoing=tournaments[7].id;
 add('aevic_platform.featured_achievements',['first-wwcd','hundred-kills','ten-matches'].map((achievement_id,i)=>({team_id:team,achievement_id,position:i+1})));
 add('aevic_platform.follows',TEAM_IDS.slice(1,4).flatMap(id=>[{user_id:team,team_id:id,created_at:recent},{user_id:id,team_id:team,created_at:recent}]));
 add('aevic_platform.notification_preferences',[{user_id:team,preferences:{channels:{'in-app':true,email:false},events:{results:true,announcements:true,adminMessages:true}}}]);
 add('aevic_platform.notifications',Array.from({length:8},(_,i)=>({id:uuid(`notification:${i}`),recipient_id:team,title:['Nəticələr dərc edildi','İştirak təsdiqləndi','Demo heyəti hazırdır'][i%3],body:'[DEMO] Bu bildiriş nümunə tarixçənin bir hissəsidir.',severity:i%3===0?'success':'info',event_type:i%3===0?'map-result':'tournament',action_href:`/team/tournaments/${tournaments[i].id}`,read_at:i<4?recent:null,created_at:iso(anchor-(8-i)*hour)})));
 add('aevic_platform.messages',[{id:uuid('message'),team_id:team,author_id:admin,title:'Demo liqaya xoş gəldiniz',body:'[DEMO] Cari turnirdə nəticələr və növbəti raundlar hazırdır.',action_href:`/team/tournaments/${ongoing}`,created_at:recent}]);
 add('aevic_platform.message_reads',[{message_id:uuid('message'),account_id:team,read_at:recent}]);
 add('aevic_platform.support_tickets',['resolved','open'].map((status,i)=>({id:uuid(`ticket:${i}`),user_id:team,category:i?'technical':'results',subject:i?'[DEMO] Profil barədə sual':'[DEMO] Nəticənin yoxlanılması',description:'Demo dəstək müraciəti — real əməliyyat tələb olunmur.',status,created_at:recent,updated_at:recent})));
 add('aevic_platform.support_replies',[{id:uuid('reply'),ticket_id:uuid('ticket:0'),author:'support',body:'[DEMO] Nəticə yoxlanıldı, qeydə alınmış xal düzgündür.',created_at:recent}]);
 const historical=matches.find(m=>m.tournament_id===tournaments[6].id);
 add('aevic_platform.disputes',[{id:uuid('dispute'),team_id:team,tournament_id:historical.tournament_id,match_id:historical.id,issue_type:'kills',description:'[DEMO] Kill sayının təsdiqlənməsi üçün nümunə müraciət.',status:'resolved',deadline_at:historical.dispute_deadline_at,admin_note:'[DEMO] Nəticə düzgündür; dəyişiklik edilməyib.',created_at:iso(Date.parse(historical.published_at)+10*60000),resolved_at:iso(Date.parse(historical.published_at)+20*60000)}]);
 add('aevic_platform.roster_change_requests',[{id:uuid('roster-request'),team_id:team,tournament_id:ongoing,outgoing_player_id:`${team}:player5`,incoming_ign:'Test Oyunçu 6',incoming_pubg_id:'990000000000999',incoming_role:'substitute',reason:'[DEMO] Ehtiyat oyunçu dəyişmə nümunəsi.',status:'rejected',admin_note:'[DEMO] Mövcud heyət saxlanılıb.',created_at:recent,updated_at:recent}]);
 add('aevic_platform.verification_requests',[{id:uuid('verification'),team_id:team,representative_name:'Test Kapitan',official_socials:{website:'https://example.invalid/aevic-demo'},notes:'[DEMO] Yalnız vizual nümayiş.',status:'APPROVED',safe_reason:'[DEMO] Sintetik komanda.',reviewed_by:admin,created_at,reviewed_at:recent}]);
 add('aevic_platform.player_claims',[{id:uuid('claim'),pubg_id:rosters[0][0].uid,claimant_id:team,method:'ADMIN_REVIEW',status:'APPROVED',safe_reason:'[DEMO] Sintetik oyunçu hesabı.',reviewed_by:admin,created_at,reviewed_at:recent}]);
 add('aevic_platform.audit_events',[{id:uuid('audit'),actor_id:KEY,action:'demo.seed',entity_type:'team',entity_id:team,metadata:{demoSeed:KEY,asOf},created_at:recent}]);
 return {asOf,batches,targetPatch,summary:{teamId:team,existingLoginPreserved:true,players:5,rivalTeams:11,totalRosterPlayers:60,tournaments:9,matches:matches.length,publishedMatches:matches.filter(m=>m.published_at).length,results:results.length,standingsSnapshots:snapshots.length,placements:tournaments.slice(0,7).map(t=>rank(results.filter(r=>r.tournament_id===t.id)).find(r=>r.teamId===team).rank)}};
}

// Database fingerprints are calculated inside PostgreSQL: no credentials or real
// row contents are printed or saved. Only primary keys + opaque digests are kept.
async function fingerprints(tx,tables) {
 for(const table of tables)assert(keys[table],'Unknown manifest table');
 const rows=await tx.unsafe(tables.map(table=>`select '${table}' as table_name,jsonb_build_object(${keys[table].flatMap(c=>[`'${c}'`,`"${c}"::text`]).join(',')}) as key,md5(to_jsonb(r)::text) as fingerprint from ${table} r`).join(' union all '));
 return new Map(tables.map(table=>[table,rows.filter(r=>r.table_name===table).map(r=>({...r.key,fingerprint:r.fingerprint}))]));
}
async function originals(tx) {
 return [...await tx`select id::text,md5(to_jsonb(t)::text) as fingerprint from public.teams t where id=any(${ORIGINALS}::bigint[]) order by id`];
}
// Only these non-auth fields have preimages in the private receipt. Credentials
// and existing relationships are compared as opaque DB hashes, never exported.
async function targetState(tx) {
 const tables={};
 for(const [table,columns] of Object.entries(targetColumns)){
  const key=keys[table][0];
  const [row]=await tx.unsafe(`select jsonb_build_object(${columns.flatMap(c=>[`'${c}'`,`"${c}"`]).join(',')}) as values,md5(to_jsonb(r)::text) as fingerprint,md5((to_jsonb(r)-$2::text[])::text) as untouched from ${table} r where "${key}"=$1`,[TARGET,columns]);
  assert(row,`Expected existing target row in ${table}`);tables[table]=row;
 }
 const accounts=await tx`select id::text,original_team_id::text,md5(to_jsonb(a)::text) as fingerprint from aevic_platform.accounts a where id=${TARGET} or original_team_id=${TARGET} order by id`;
 assert(accounts.length===1&&accounts[0].id===TARGET&&accounts[0].original_team_id===TARGET,'Expected existing account 16 linked to team 16');
 const authority=await tx`select id,team_id::text,account_id::text,role,md5(to_jsonb(a)::text) as fingerprint from aevic_platform.team_authority a where team_id=${TARGET} or account_id=${TARGET} order by id`;
 assert(authority.some(r=>r.team_id===TARGET&&r.account_id===TARGET&&r.role==='OWNER'),'Expected existing owner relationship');
 const [login]=await tx`select email is not null and btrim(email)<>'' and password_hash is not null and btrim(password_hash)<>'' as ready from aevic_platform.account_identity where id=${TARGET}`;
 assert(login?.ready,'Existing login identity is missing');
 return {tables,auth:digest(JSON.stringify({accounts,authority}))};
}
function assertLoginUnchanged(actual,before) {
 assert.equal(actual.auth,before.auth,'Existing auth/owner changed');
 for(const table of Object.keys(targetColumns))assert.equal(actual.tables[table].untouched,before.tables[table].untouched,`Unmanaged target fields changed in ${table}`);
}
async function inspectUnseededTarget(tx) {
 const state=await targetState(tx);
 assert(['salam','TEST HESABI'].includes(state.tables['public.teams'].values.team_name),'Team 16 is not the expected salam/TEST HESABI');
 const [dependencies]=await tx`select
  (select count(*) from aevic_platform.player_details where team_id=${TARGET}) as players,
  (select count(*) from aevic_platform.tournament_registrations where team_id=${TARGET} or exists(select 1 from jsonb_array_elements(roster) p where p->>'id' like '16:player%')) as rosters,
  (select count(*) from aevic_platform.organization_teams where team_id=${TARGET}) as organizations`;
 assert(Object.values(dependencies).every(n=>Number(n)===0),'Existing roster/competition/organization links require inspection; no overwrite');
 return state;
}
export async function updateTarget(tx,patches) {
 // Mutation firewall: neither the target identity nor any auth column is writable.
 assert.deepEqual(Object.keys(patches).sort(),Object.keys(targetColumns).sort());
 for(const [table,values] of Object.entries(patches)){
  assert.deepEqual(Object.keys(values).sort(),[...targetColumns[table]].sort(),'Target patch exceeds permitted fields');
 }
 for(const [table,values] of Object.entries(patches)){
  // postgres.js serializes timestamps via JS Date (milliseconds). Populate the
  // typed row inside PostgreSQL so restoration retains original microseconds.
  const columns=targetColumns[table].map(c=>`"${c}"`).join(',');
  const rows=await tx.unsafe(`update ${table} set (${columns})=(select ${columns} from jsonb_populate_record(null::${table},$1::jsonb)) where "${keys[table][0]}"=$2 returning "${keys[table][0]}"`,[tx.json(values),TARGET]);
  assert.equal(rows.length,1,'Existing target must be updated exactly once');
 }
}
async function restoreTarget(tx,receipt) {
 const current=await targetState(tx);assert.deepEqual(current,receipt.target.after,'Target changed since seed; restoration refused');
 await updateTarget(tx,Object.fromEntries(Object.entries(receipt.target.before.tables).map(([table,r])=>[table,r.values])));
 assert.deepEqual(await targetState(tx),receipt.target.before,'Original salam state/auth was not exactly restored');
}
async function capture(tx,plan) {
 const out=[];
 const fingerprintsByTable=await fingerprints(tx,plan.batches.map(b=>b.table));
 for(const {table,rows} of plan.batches){
  const wanted=new Set(rows.map(r=>signature(pk(table,r))));
  const all=fingerprintsByTable.get(table);
  const owned=all.filter(r=>wanted.has(signature(pk(table,r)))).map(r=>({key:pk(table,r),fingerprint:r.fingerprint}));
  assert.equal(owned.length,rows.length,`Missing fixture: ${table}`);out.push({table,rows:owned});
 }
 return out;
}
async function verifyReceipt(tx,receipt) {
 assert.equal(receipt.version,2,'Unknown receipt version');
 assert.equal(receipt.teamId,TEAM_IDS[0],'Unexpected seed identity');
 const expected=buildDemo(receipt.asOf).batches.map(b=>({table:b.table,keys:b.rows.map(r=>signature(pk(b.table,r))).sort()}));
 assert.deepEqual(receipt.manifest.map(b=>({table:b.table,keys:b.rows.map(r=>signature(r.key)).sort()})),expected,'Receipt ownership differs from deterministic seed');
 const fingerprintsByTable=await fingerprints(tx,receipt.manifest.map(b=>b.table));
 for(const batch of receipt.manifest){
  assert(keys[batch.table],'Unexpected manifest table');
  const actual=new Map(fingerprintsByTable.get(batch.table).map(r=>[signature(pk(batch.table,r)),r.fingerprint]));
  for(const row of batch.rows)assert.equal(actual.get(signature(row.key)),row.fingerprint,`Fixture changed/missing; refuse destructive action: ${batch.table} ${signature(row.key)}`);
 }
 const target=await targetState(tx);
 assert.equal(target.tables['public.teams'].values.team_name,'TEST HESABI');
 assert.deepEqual(target,receipt.target.after,'Target fields changed since seed');
 assertLoginUnchanged(target,receipt.target.before);
 assert.deepEqual(await originals(tx),receipt.protectedBaseline,'Other original teams changed since seed');
}
async function nonDemo(tx,plan) {
 const out={};
 const fingerprintsByTable=await fingerprints(tx,plan.batches.map(b=>b.table));
 for(const {table,rows} of plan.batches){const owned=new Set(rows.map(r=>signature(pk(table,r))));if(targetColumns[table])owned.add(signature({[keys[table][0]]:TARGET}));out[table]=fingerprintsByTable.get(table).filter(r=>!owned.has(signature(pk(table,r)))).map(r=>`${signature(pk(table,r))}:${r.fingerprint}`).sort();}
 return digest(JSON.stringify(out));
}
async function assertNoExternalDependents(tx,manifest) {
 const owned=new Map(manifest.map(b=>[b.table,new Set(b.rows.map(r=>signature(r.key)))]));
 const quote=s=>'"'+s.replaceAll('"','""')+'"';
 const foreignKeys=await tx`select nc.nspname as child_schema,cc.relname as child_table,np.nspname||'.'||cp.relname as parent,
  array(select attname from unnest(c.conkey) with ordinality k(n,i) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n order by k.i) as child_columns,
  array(select attname from unnest(c.confkey) with ordinality k(n,i) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.n order by k.i) as parent_columns
  from pg_constraint c join pg_class cc on cc.oid=c.conrelid join pg_namespace nc on nc.oid=cc.relnamespace
  join pg_class cp on cp.oid=c.confrelid join pg_namespace np on np.oid=cp.relnamespace
  where c.contype='f' and (np.nspname||'.'||cp.relname)=any(${[...owned.keys()]})`;
 for(const fk of foreignKeys){
  const child=`${fk.child_schema}.${fk.child_table}`,childKeys=keys[child];
  const projection=[...keys[fk.parent].map((k,i)=>`p.${quote(k)}::text as p${i}`),...(childKeys??[]).map((k,i)=>`c.${quote(k)}::text as c${i}`)];
  const refs=await tx.unsafe(`select ${projection.join(',')} from ${quote(fk.child_schema)}.${quote(fk.child_table)} c join ${fk.parent} p on ${fk.child_columns.map((k,i)=>`c.${quote(k)}=p.${quote(fk.parent_columns[i])}`).join(' and ')}`);
  for(const ref of refs){
   const parentKey=Object.fromEntries(keys[fk.parent].map((k,i)=>[k,ref[`p${i}`]]));
   if(!owned.get(fk.parent).has(signature(parentKey)))continue;
   assert(childKeys&&owned.get(child)?.has(signature(Object.fromEntries(childKeys.map((k,i)=>[k,ref[`c${i}`]])))),`Additional dependent data in ${child}; removal refused`);
  }
 }
}
async function removeFixtures(tx,manifest) {
 for(const batch of manifest){
  if(['public.teams','aevic_platform.accounts','aevic_platform.team_authority'].includes(batch.table))assert(batch.rows.every(r=>r.key.id!==TARGET),'Pre-existing target/account cannot be deleted');
 }
 await assertNoExternalDependents(tx,manifest);
 for(const {table,rows} of [...manifest].reverse()){
  const columns=keys[table];for(const {key} of rows)assert.deepEqual(Object.keys(key).sort(),[...columns].sort());
  const deleted=await tx.unsafe(`delete from ${table} r using jsonb_populate_recordset(null::${table},$1::jsonb) d where ${columns.map(k=>`r."${k}"=d."${k}"`).join(' and ')} returning 1`,[tx.json(rows.map(r=>r.key))]);
  assert.equal(deleted.length,rows.length,'Incomplete demo removal');
 }
 await tx`delete from aevic_platform.idempotency where actor_id=${KEY} and key=${KEY}`;
}
async function preflight(tx,plan) {
 // Refuse unknown user triggers, including statement/delete triggers. Existing
 // existing touch triggers only change NEW.updated_at on their own row.
 const tables=plan.batches.map(b=>b.table);
 const triggers=await tx`select n.nspname||'.'||c.relname as tbl,t.tgname,p.prosrc,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and (n.nspname||'.'||c.relname)=any(${[...tables,RECEIPT]})`;
 for(const t of triggers)assert(['aevic.tournaments','aevic.matches','aevic.match_rooms'].includes(t.tbl)&&t.tgname==='touch_updated'&&/^\s*begin new.updated_at=now\(\); return new; end\s*$/i.test(t.prosrc)&&t.definition.startsWith('CREATE TRIGGER touch_updated BEFORE UPDATE ON '),'Unreviewed database trigger');
 const rules=await tx`select schemaname,tablename,rulename from pg_rules where (schemaname||'.'||tablename)=any(${[...tables,RECEIPT]})`;
 assert.equal(rules.length,0,'Unreviewed database rule');
 const protectedRows=await originals(tx);assert.equal(protectedRows.length,ORIGINALS.length,'Original team set changed; inspect before proceeding');
 return protectedRows;
}
export async function run(sql,mode,asOf) {
 assert(['plan','apply','verify','remove','rehearse','rehearse-remove'].includes(mode),'Use plan, apply, verify, remove, rehearse, or rehearse-remove');
 const removing=['remove','rehearse-remove'].includes(mode),rehearsal=mode.startsWith('rehearse');
 const execute=async tx=>{
  if(!['plan','verify'].includes(mode)){
   await tx`select pg_advisory_xact_lock(hashtextextended(${KEY},0))`;
   await tx`select pg_advisory_xact_lock(184621,1)`;
   await tx`select pg_advisory_xact_lock(184621,2)`;
  }
  const [existing]=await tx`select result from aevic_platform.idempotency where actor_id=${KEY} and key=${KEY}`;
  const legacy=await tx`select id::text from public.teams where id=870000000001 or email=${LEGACY_EMAIL} union all select id::text from aevic_platform.account_identity where email=${LEGACY_EMAIL}`;
  const legacyReceipt=await tx`select key from aevic_platform.idempotency where actor_id=${LEGACY_KEY} and key=${LEGACY_KEY}`;
  assert(legacy.length===0&&legacyReceipt.length===0,'Remove v1 using its ownership mechanism before applying v2');
  const plan=buildDemo(existing?.result.asOf??asOf),protectedBefore=await preflight(tx,plan);
  if(mode==='plan'){if(existing)await verifyReceipt(tx,existing.result);else await inspectUnseededTarget(tx);return {...plan.summary,asOf:plan.asOf,existing:Boolean(existing),tables:plan.batches.map(b=>b.table),mutation:false};}
  if(existing){
   await verifyReceipt(tx,existing.result);
   if(!removing)return {...existing.result.summary,status:'already-present',integrity:'verified',mutation:false};
  }else if(mode==='verify')throw new Error('Demo is not installed');
  else if(removing){await targetState(tx);return {teamId:TARGET,status:'already-absent',targetPreserved:true,mutation:false};}
  const before=await nonDemo(tx,plan);
  if(removing){
   // Explicit leaf-to-root deletes only. New dependent rows cause FK failure and
   // roll the entire transaction back, including cascades on known child tables.
   await removeFixtures(tx,existing.result.manifest);
   await restoreTarget(tx,existing.result);
  }else{
   const collisions=await tx`select id::text from public.teams where id=any(${TEAM_IDS.slice(1)}::bigint[]) or (id<>${TARGET} and lower(btrim(team_name))='test hesabi')`;
   assert.equal(collisions.length,0,'Demo identity collision; no existing account is adopted');
   const targetBefore=await inspectUnseededTarget(tx);
   await updateTarget(tx,plan.targetPatch);
   for(const {table,rows} of plan.batches){
    if(table==='public.teams'){
     // Live public.teams uses GENERATED ALWAYS identity. Explicit isolated IDs
     // avoid consuming or resetting the real registration sequence, even on rollback.
     const cols=Object.keys(rows[0]),params=rows.flatMap(r=>cols.map(k=>r[k]));
     await tx.unsafe(`insert into public.teams (${cols.map(c=>`"${c}"`).join(',')}) overriding system value values ${rows.map((_,i)=>`(${cols.map((_,j)=>`$${i*cols.length+j+1}`).join(',')})`).join(',')}`,params);
     continue;
    }
    const values=rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,jsonColumns.has(k)?tx.json(v):v])));
    await tx`insert into ${tx(table)} ${tx(values)}`;
   }
   const targetAfter=await targetState(tx);assertLoginUnchanged(targetAfter,targetBefore);
   const receipt={version:2,asOf:plan.asOf,teamId:TARGET,summary:plan.summary,manifest:await capture(tx,plan),target:{before:targetBefore,after:targetAfter},protectedBaseline:protectedBefore};
   await tx`insert into aevic_platform.idempotency(actor_id,key,action,payload_digest,result) values(${KEY},${KEY},'demo.seed',${digest(KEY)},${tx.json(receipt)})`;
   await verifyReceipt(tx,receipt);
   if(mode==='rehearse'){
    // Read the actual JSONB receipt, exercising key canonicalization on replay.
    const [stored]=await tx`select result from aevic_platform.idempotency where actor_id=${KEY} and key=${KEY}`;
    await verifyReceipt(tx,stored.result);
    await removeFixtures(tx,stored.result.manifest);await restoreTarget(tx,stored.result);
   }
  }
  assert.deepEqual(await originals(tx),protectedBefore,'Protected original team data changed');
  assert.equal(await nonDemo(tx,plan),before,'Existing data changed; rollback');
  const result={...plan.summary,status:removing?'removed':'created',targetPreserved:true,originalTeamsUnchanged:true,existingRowsUnchanged:true,mutation:!rehearsal};
  if(rehearsal){const error=new Error('DEMO_REHEARSAL_ROLLBACK');error.result=result;throw error;}
  return result;
 };
 try{return await sql.begin(['plan','verify'].includes(mode)?'isolation level repeatable read read only':'isolation level serializable',execute);}
 catch(error){if(error.message==='DEMO_REHEARSAL_ROLLBACK')return {...error.result,status:'rehearsed-and-rolled-back'};throw error;}
}
async function main() {
 const mode=process.argv[2]??'plan';
 const url=process.env.AEVIC_DATABASE_URL;assert(url,'AEVIC_DATABASE_URL is required');
 const local=['localhost','127.0.0.1','::1'].includes(new URL(url).hostname);
 const ca=readFileSync(new URL('../server/captain/database-ca.ts',import.meta.url),'utf8').match(/`([^`]+)`/s)?.[1];
 assert(ca,'Existing database CA unavailable');
 // Pass the configured URL byte-for-byte. In particular, never rewrite its port.
 const sql=postgres(url,{ssl:local?false:{rejectUnauthorized:true,ca},max:1,prepare:false,max_pipeline:1,connect_timeout:15,onnotice:()=>{},connection:{application_name:KEY,statement_timeout:30000,lock_timeout:3000}});
 try{console.log(JSON.stringify(await run(sql,mode,process.env.AEVIC_DEMO_AS_OF??new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())),null,2));}
 catch(error){console.error('Demo stopped; transaction rolled back:',error.code??error.name,error.name==='PostgresError'?'Database constraint/permission failure (row details suppressed)':error.message.split('\n')[0]);process.exitCode=1;}
 finally{await sql.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
