import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {enroll,execute,sql} from '../../scripts/legacy-migration/cli.mjs';
import {planImport} from '../../scripts/legacy-migration/core.mjs';
import {fixture,rebind,owner,other} from './fixtures.mjs';
const target={environment:'local',database:`aevic_migration_test_${process.pid}`,port:55432,instanceId:'00000000-0000-4000-8000-000000000010'};
const bin=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@18/bin';
const command=(name)=>execFileSync(join(bin,name),['-h','/tmp','-p','55432',target.database],{stdio:'pipe',env:{PATH:process.env.PATH}});
test('isolated ordered-migration legacy rehearsal',async t=>{
 command('createdb');
 try{
  sql(target,readFileSync('supabase/tests/bootstrap.sql','utf8'));
  // Historical Auth accounts exist BEFORE the application signup trigger.
  sql(target,`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('${owner}','owner@example.test',now(),'{"role":"super-admin","teamDraft":{"teamName":"Untrusted metadata"}}'),('${other}','other@example.test',now(),'{}');create table public.teams(id text primary key,team_name text);insert into public.teams values('legacy-1','Synthetic source only');`);
  const authBefore=sql(target,'select jsonb_agg(to_jsonb(u) order by id) from auth.users u;');
  for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())sql(target,readFileSync('supabase/migrations/'+file,'utf8'));
  const metadata=JSON.parse(sql(target,readFileSync('scripts/legacy-migration/catalog-audit.sql','utf8')));assert.ok(metadata.tables.some(t=>t.schema==='public'&&t.table==='teams'));assert.equal(JSON.stringify(metadata).includes('owner@example.test'),false);
  const {source,review}=fixture(),plan=planImport(source,review),id=plan.ready[0].teamId;
  await t.test('requires explicit target enrollment',()=>assert.throws(()=>execute(target,plan),/TARGET_NOT_ENROLLED/));
  enroll(target);
  await t.test('dry run checks inserts and rolls back every record',()=>{const report=execute(target,plan);assert.equal(report.committed,false);assert.equal(report.counts.created,1);assert.equal(sql(target,'select count(*) from aevic.teams;'),'0');assert.equal(sql(target,'select count(*) from aevic.profiles;'),'0');});
  await t.test('imports team and existing ownership with profile backfill',()=>{const report=execute(target,plan,true);assert.equal(report.counts.created,1);assert.equal(sql(target,`select user_id::text from aevic.team_members where team_id='${id}' and role='OWNER';`),owner);assert.equal(sql(target,`select count(*) from aevic.profiles where id='${owner}';`),'1');assert.equal(sql(target,'select count(*) from aevic.admin_roles;'),'0');});
  await t.test('retains Auth identity and leaves legacy source intact',()=>{assert.equal(sql(target,'select jsonb_agg(to_jsonb(u) order by id) from auth.users u;'),authBefore);assert.equal(sql(target,'select count(*) from public.teams;'),'1');assert.equal(sql(target,'select count(*) from aevic.team_match_results;'),'0');assert.equal(sql(target,'select count(*) from aevic.tournament_registrations;'),'0');});
  await t.test('repeat import is unchanged and does not duplicate',()=>{const report=execute(target,plan,true);assert.equal(report.counts.unchanged,1);assert.equal(report.counts.created,0);assert.equal(sql(target,'select count(*) from aevic.team_players;'),'5');});
  await t.test('reviewed historical account without a team receives only a missing profile',()=>{const next=fixture();next.review.accounts=[{userId:other,identityEvidence:target.instanceId}];const result=execute(target,planImport(next.source,next.review),true);assert.equal(result.counts.profilesCreated,1);assert.equal(sql(target,`select count(*) from aevic.team_members where user_id='${other}';`),'0');sql(target,`update aevic.profiles set first_name='Preserved test name' where id='${other}';`);execute(target,planImport(next.source,next.review),true);assert.equal(sql(target,`select first_name from aevic.profiles where id='${other}';`),'Preserved test name');});
  await t.test('different enrollment identity cannot run',()=>assert.throws(()=>execute({...target,instanceId:other},plan),/TARGET_IDENTITY_MISMATCH/));
  await t.test('changed reviewed source never overwrites mapped records',()=>{const next=fixture();next.source.rows[0].team_name='Changed import name';rebind(next.source,next.review);assert.throws(()=>execute(target,planImport(next.source,next.review),true),/MAPPED_SOURCE_CHANGED/);});
  await t.test('changed target is detected and preserved',()=>{sql(target,`update aevic.teams set name='Operator edit' where id='${id}';`);assert.throws(()=>execute(target,plan,true),/TARGET_TEAM_CHANGED/);assert.equal(sql(target,`select name from aevic.teams where id='${id}';`),'Operator edit');sql(target,`update aevic.teams set name='Migrated test team' where id='${id}';`);});
  await t.test('owner FK and target identity conflicts fail atomically',()=>{
   const next=fixture();next.source.rows[0].id='new-team';next.source.rows[0].team_name='A new test team';next.review.teams[0].sourceId='new-team';next.review.teams[0].ownerUserId='00000000-0000-4000-8000-000000000099';rebind(next.source,next.review);
   assert.throws(()=>execute(target,planImport(next.source,next.review),true),/AUTH_IDENTITY_MISSING/);assert.equal(sql(target,'select count(*) from aevic.teams;'),'1');
   next.review.teams[0].ownerUserId=owner;assert.throws(()=>execute(target,planImport(next.source,next.review),true),/TARGET_OWNER_CONFLICT/);
   next.review.teams[0].ownerUserId=other;assert.throws(()=>execute(target,planImport(next.source,next.review),true),/TARGET_PLAYER_CONFLICT/);
  });
  await t.test('late batch failure rolls back earlier teams and profile backfills',()=>{
   const next=fixture();next.source.rows[0].id='batch-first';next.source.rows[0].team_name='Batch first';next.review.teams[0].sourceId='batch-first';next.review.teams[0].ownerUserId=other;next.review.teams[0].players.forEach(p=>p.pubgId='2'+p.pubgId);
   next.source.rows.push({...next.source.rows[0],id:'batch-last',team_name:'Migrated test team'});
   const third='00000000-0000-4000-8000-000000000099';sql(target,`insert into auth.users(id,email_confirmed_at) values('${third}',now());delete from aevic.profiles where id='${third}';`);
   next.review.teams.push({...next.review.teams[0],sourceId:'batch-last',ownerUserId:third,players:next.review.teams[0].players.map(p=>({...p,pubgId:'3'+p.pubgId}))});rebind(next.source,next.review);
   assert.throws(()=>execute(target,planImport(next.source,next.review),true),/TARGET_TEAM_CONFLICT/);assert.equal(sql(target,"select count(*) from aevic.teams where name='Batch first';"),'0');assert.equal(sql(target,'select count(*) from aevic_private.legacy_import_map;'),'1');assert.equal(sql(target,`select count(*) from aevic.profiles where id='${third}';`),'0');
  });
  await t.test('RLS isolates migrated private identities, profiles and import ledger',()=>{
   assert.equal(sql(target,`begin;set local role authenticated;set local request.jwt.claim.sub='${owner}';select count(*) from aevic.player_identities;rollback;`),'5');
   assert.equal(sql(target,`begin;set local role authenticated;set local request.jwt.claim.sub='${other}';select count(*) from aevic.player_identities;rollback;`),'0');
   assert.equal(sql(target,`begin;set local role authenticated;set local request.jwt.claim.sub='${other}';select count(*) from aevic.profiles where id='${owner}';rollback;`),'0');
   assert.throws(()=>sql(target,'begin;set local role authenticated;select * from aevic_private.legacy_import_map;rollback;'),/DATABASE_VALIDATION_FAILED/);
   assert.equal(sql(target,'begin;set local role anon;select count(*) from aevic.teams;rollback;'),'1');
  });
  await t.test('migrated identities support real target registration and captured roster relationships',()=>{
   sql(target,`insert into aevic.tournaments(id,slug,name,short_name,status,starts_at,ends_at,registration_opens_at,registration_deadline,check_in_opens_at,check_in_closes_at,max_slots) values('10000000-0000-4000-8000-000000000001','fixture-cup','Fixture cup','FC','registration-open',now()+interval '3 days',now()+interval '4 days',now()-interval '1 day',now()+interval '1 day',now()+interval '2 days',now()+interval '2 days 1 hour',20);
   begin;set local role authenticated;set local request.jwt.claim.sub='${owner}';select aevic.command('tournament.join','{"teamId":"${id}","tournamentId":"10000000-0000-4000-8000-000000000001"}');commit;`);
   assert.equal(sql(target,'select count(*) from aevic.tournament_rosters;'),'5');
   assert.throws(()=>sql(target,`insert into aevic.team_match_results(match_id,tournament_id,team_id,placement,finishes,placement_points,finish_points) values('10000000-0000-4000-8000-000000000099','10000000-0000-4000-8000-000000000001','${id}',1,1,10,1);`),/DATABASE_VALIDATION_FAILED/);
   assert.throws(()=>sql(target,`begin;set local role authenticated;set local request.jwt.claim.sub='${owner}';select aevic.command('result.save','{}');rollback;`),/DATABASE_VALIDATION_FAILED/);
  });
  await t.test('published result integrity still holds for the migrated team',()=>{
   sql(target,`update aevic.tournament_registrations set status='confirmed';insert into aevic.matches(id,tournament_id,round,map,scheduled_at,room_release_at,published_at) values('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',1,'Erangel',now(),now(),now());insert into aevic.team_match_results(match_id,tournament_id,team_id,placement,finishes,placement_points,finish_points,published) values('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','${id}',1,4,10,4,true);`);
   assert.equal(sql(target,`begin;set local role anon;select total_points from aevic.team_match_results where team_id='${id}';rollback;`),'14');
   assert.throws(()=>sql(target,`insert into aevic.team_match_results(match_id,tournament_id,team_id,placement,finishes,placement_points,finish_points,published) values('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','${id}',2,1,6,1,true);`),/DATABASE_VALIDATION_FAILED/);
   assert.equal(execute(target,plan,true).counts.unchanged,1);
  });
  await t.test('CLI writes a private reconciliation file and rejects overwriting it',()=>{
   const dir=mkdtempSync(join(tmpdir(),'aevic-migration-test-'));for(const [name,value] of Object.entries({target,source,review}))writeFileSync(join(dir,name+'.json'),JSON.stringify(value),{mode:0o600});
   const args=['scripts/legacy-migration/cli.mjs','dry-run','--target',join(dir,'target.json'),'--source',join(dir,'source.json'),'--review',join(dir,'review.json'),'--report',join(dir,'report.json')];
   execFileSync(process.execPath,args,{stdio:'pipe'});assert.equal(JSON.parse(readFileSync(join(dir,'report.json'),'utf8')).counts.unchanged,1);assert.throws(()=>execFileSync(process.execPath,args,{stdio:'pipe'}));
  });
  await t.test('unexpected target schema drift stops the entire import',()=>{sql(target,'alter table aevic.teams add column unreviewed_column text;');assert.throws(()=>execute(target,plan),/TARGET_SCHEMA_DIFFERENCE/);});
 }finally{command('dropdb');}
});
