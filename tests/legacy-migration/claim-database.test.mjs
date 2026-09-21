import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {userInfo} from 'node:os';
import {enroll,execute,sql} from '../../scripts/legacy-migration/cli.mjs';
import {planImport} from '../../scripts/legacy-migration/core.mjs';
import {unclaimedFixture} from './unclaimed-fixtures.mjs';
const target={environment:'local',database:`aevic_migration_claim_${process.pid}`,port:55432,instanceId:'00000000-0000-4000-8000-000000000010'};
const bin=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@18/bin',args=['-h','/tmp','-p','55432'];
const user=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,admin=user(9),alice=user(1),bob=user(2),unconfirmed=user(3),evidence=user(10);
const callSQL=(uid,action,p={})=>`begin;set local role authenticated;set local request.jwt.claim.sub='${uid}';select aevic.legacy_claim('${action}','${JSON.stringify(p)}');commit;`;
const call=(uid,action,p)=>JSON.parse(sql(target,callSQL(uid,action,p)));
const approve=(id,tokenHash='a'.repeat(64),expectedVersion=1)=>call(admin,'review',{id,decision:'approve',evidenceRef:evidence,expectedVersion,tokenHash});
const getId=(uid,key)=>call(uid,'mine').find(r=>r.sourceKey===key).id;
test('unclaimed import and secure claiming on isolated PostgreSQL',async t=>{
 execFileSync(join(bin,'createdb'),[...args,target.database],{stdio:'pipe',env:{PATH:process.env.PATH}});
 try{
  sql(target,readFileSync('supabase/tests/bootstrap.sql','utf8'));for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())sql(target,readFileSync('supabase/migrations/'+file,'utf8'));
  enroll(target);const {source,review}=unclaimedFixture(),plan=planImport(source,{...review,teams:review.teams.map((r,i)=>i===4?{...r,approvalStatus:'banned'}:r)});
  await t.test('imports seven unclaimed teams while Auth and public teams remain empty',()=>{assert.equal(execute(target,plan,true).counts.created,7);assert.equal(sql(target,'select count(*) from auth.users;'),'0');assert.equal(sql(target,'select count(*) from aevic.teams;'),'0');assert.equal(sql(target,'select count(*) from aevic.team_members;'),'0');assert.equal(execute(target,plan,true).counts.unchanged,7);});
  sql(target,`insert into auth.users(id,email,email_confirmed_at) values('${alice}','alice@example.test',now()),('${bob}','bob@example.test',now()),('${admin}','admin@example.test',now()),('${unconfirmed}','unconfirmed@example.test',null);insert into aevic.admin_roles(user_id,role) values('${admin}','support-moderator');`);
  await t.test('unclaimed rows, contact and challenge storage are not directly readable',()=>{for(const role of ['anon','authenticated'])for(const table of ['legacy_team_holdings','legacy_claim_requests'])assert.throws(()=>sql(target,`begin;set local role ${role};select * from aevic_private.${table};rollback;`),/DATABASE_VALIDATION_FAILED/);assert.equal(sql(target,'begin;set local role anon;select count(*) from aevic.teams;rollback;'),'0');assert.throws(()=>call(alice,'queue'),/DATABASE_VALIDATION_FAILED/);});
  await t.test('preserves source metadata privately and rejects extra secret fields',()=>{
   const held=JSON.parse(sql(target,"select row_to_json(h) from aevic_private.legacy_team_holdings h where source_key='1';"));
   assert.equal(held.name,source.rows[0].team_name);assert.equal(Date.parse(held.original_created_at),Date.parse(source.rows[0].created_at));assert.equal(held.legacy_status,source.rows[0].status);assert.equal(held.tier,source.rows[0].tier);assert.deepEqual(held.captain_contact,source.rows[0].captain_contact);assert.deepEqual(held.media_references,plan.unclaimed[0].mediaReferences);
   assert.throws(()=>sql(target,"update aevic_private.legacy_team_holdings set captain_contact=captain_contact||'{\"password_hash\":\"synthetic forbidden field\"}'::jsonb;"),/DATABASE_VALIDATION_FAILED/);
  });
  await t.test('reserves legacy names against unrelated new registration',()=>assert.throws(()=>sql(target,"insert into aevic.teams(name,slug) values('Synthetic legacy 1','unrelated');"),/DATABASE_VALIDATION_FAILED/));
  await t.test('requires confirmed Auth, and known/unknown requests have identical receipts',()=>{assert.throws(()=>call(unconfirmed,'request',{sourceKey:'1'}),/DATABASE_VALIDATION_FAILED/);assert.deepEqual(call(alice,'request',{sourceKey:'1'}),call(alice,'request',{sourceKey:'999'}));assert.equal(call(alice,'mine').length,2);assert.deepEqual(call(alice,'request',{sourceKey:'1'}),{ok:true});assert.equal(call(alice,'mine').length,2);});
  const id=getId(alice,'1');
  await t.test('ordinary users cannot approve; missing ownership evidence is rejected',()=>{assert.throws(()=>call(alice,'review',{id,decision:'approve',expectedVersion:1,evidenceRef:evidence,tokenHash:'a'.repeat(64)}),/DATABASE_VALIDATION_FAILED/);assert.throws(()=>call(admin,'review',{id,decision:'approve',expectedVersion:1,tokenHash:'a'.repeat(64)}),/DATABASE_VALIDATION_FAILED/);assert.equal(approve(id).ok,true);});
  await t.test('wrong account, invalid and expired challenges do not claim',()=>{assert.equal(call(bob,'consume',{id,tokenHash:'a'.repeat(64)}).ok,false);assert.equal(call(alice,'consume',{id,tokenHash:'b'.repeat(64)}).ok,false);sql(target,`update aevic_private.legacy_claim_requests set expires_at=now()-interval '1 minute' where id='${id}';`);assert.equal(call(alice,'consume',{id,tokenHash:'a'.repeat(64)}).ok,false);assert.equal(sql(target,'select count(*) from aevic.team_members;'),'0');approve(id,'c'.repeat(64),2);});
  await t.test('valid challenge atomically binds the original identity once',()=>{const claimed=call(alice,'consume',{id,tokenHash:'c'.repeat(64)});assert.equal(claimed.teamId,plan.unclaimed[0].teamId);assert.equal(sql(target,`select user_id::text from aevic.team_members where team_id='${claimed.teamId}';`),alice);assert.equal(sql(target,`select legacy_history_incomplete from aevic.teams where id='${claimed.teamId}';`),'t');assert.equal(call(alice,'consume',{id,tokenHash:'c'.repeat(64)}).ok,false);assert.equal(sql(target,`select token_hash is null from aevic_private.legacy_claim_requests where id='${id}';`),'t');assert.equal(execute(target,plan,true).counts.unchanged,7);});
  await t.test('public history scope is readable while owners cannot erase it',()=>{
   assert.equal(sql(target,"begin;set local role anon;select legacy_history_incomplete from aevic.teams;rollback;"),'t');
   assert.throws(()=>sql(target,`begin;set local role authenticated;set local request.jwt.claim.sub='${alice}';update aevic.teams set legacy_history_incomplete=false;rollback;`),/DATABASE_VALIDATION_FAILED/);
  });
  await t.test('claim preserves roster names without invented IDs; owner completes real roster once',()=>{assert.equal(sql(target,'select count(*) from aevic.players;'),'0');const info=call(alice,'roster-info');assert.deepEqual(info.rosterNames,source.rows[0].roster_names);assert.equal(call(bob,'roster-info'),null);const players=info.rosterNames.map((ign,i)=>({ign,uid:`10000${i}`,role:i===0?'captain':i===4?'substitute':'starter'}));assert.equal(call(alice,'roster',{players}).ok,true);assert.throws(()=>call(alice,'roster',{players}),/DATABASE_VALIDATION_FAILED/);assert.equal(sql(target,`begin;set local role authenticated;set local request.jwt.claim.sub='${bob}';select count(*) from aevic.player_identities;rollback;`),'0');assert.equal(sql(target,'select count(*) from aevic.team_match_results;'),'0');});
  await t.test('concurrent claims by two reviewed accounts have exactly one winner',async()=>{
   const carol=user(4);sql(target,`insert into auth.users(id,email,email_confirmed_at) values('${carol}','carol@example.test',now());`);call(bob,'request',{sourceKey:'2'});call(carol,'request',{sourceKey:'2'});const b=getId(bob,'2'),c=getId(carol,'2');approve(b,'d'.repeat(64));approve(c,'e'.repeat(64));
   const results=await Promise.all([[bob,b,'d'],[carol,c,'e']].map(async([uid,id,key])=>{const result=await promisify(execFile)(join(bin,'psql'),['-X','-qAt','-v','ON_ERROR_STOP=1',...args,'-U',userInfo().username,'-d',target.database,'-c',callSQL(uid,'consume',{id,tokenHash:key.repeat(64)})],{env:{PATH:process.env.PATH}});return JSON.parse(result.stdout.trim());}));
   assert.equal(results.filter(r=>r.ok).length,1);assert.equal(sql(target,`select count(*) from aevic.team_members where team_id='${plan.unclaimed[1].teamId}';`),'1');
  });
  await t.test('self-review, missing legacy contact, stale review and revoked codes cannot transfer ownership',()=>{
   call(admin,'request',{sourceKey:'3'});assert.throws(()=>approve(getId(admin,'3')),/DATABASE_VALIDATION_FAILED/);
   call(bob,'request',{sourceKey:'3'});const q=getId(bob,'3');sql(target,"update aevic_private.legacy_team_holdings set captain_contact='{}' where source_key='3';");assert.throws(()=>approve(q),/DATABASE_VALIDATION_FAILED/);
   call(bob,'request',{sourceKey:'4'});const other=getId(bob,'4');approve(other);assert.throws(()=>approve(other,'b'.repeat(64),1),/DATABASE_VALIDATION_FAILED/);call(admin,'review',{id:other,decision:'reject',evidenceRef:evidence,expectedVersion:2});assert.equal(call(bob,'consume',{id:other,tokenHash:'a'.repeat(64)}).ok,false);
  });
  await t.test('ownership claiming preserves a reviewed ban and does not unlock management',()=>{
   const dave=user(5);sql(target,`insert into auth.users(id,email,email_confirmed_at) values('${dave}','dave@example.test',now());`);call(dave,'request',{sourceKey:'5'});const q=getId(dave,'5');approve(q);const claimed=call(dave,'consume',{id:q,tokenHash:'a'.repeat(64)});assert.equal(claimed.ok,true);assert.equal(sql(target,`select approval_status from aevic.teams where id='${claimed.teamId}';`),'banned');assert.equal(call(dave,'roster-info'),null);
  });
  await t.test('rate limiting survives invalid redemption and audit contains no tokens',()=>{let response;for(let n=0;n<12;n++)response=call(bob,'consume',{id:user(99),tokenHash:'f'.repeat(64)});assert.equal(response.code,'RATE_LIMITED');assert.ok(Number(sql(target,"select count(*) from aevic.audit_events where action='legacy.claim.invalid';"))>0);assert.equal(sql(target,"select count(*) from aevic.audit_events where metadata::text like '%token%';"),'0');});
 }finally{execFileSync(join(bin,'dropdb'),[...args,target.database],{stdio:'pipe',env:{PATH:process.env.PATH}});}
});
