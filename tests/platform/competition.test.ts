import communityRoutes from '../../server/platform/community';
import publicRoutes from '../../server/routes/public';
import platformRoutes from '../../server/platform/routes';
import {adminManagementRoutes} from '../../server/platform/admin-management';
import legacyClaimRoutes from '../../server/platform/legacy-claims';
import {createStandaloneAccount} from '../../server/platform/activation';
import {createApp} from '../../server/app';
import {Hono} from 'hono';
import type {Env} from '../../server/types';
import {ServiceError} from '../../server/errors';
import {registerOriginalTeam} from '../../server/platform/registration';
import adminAccountRoutes from '../../server/platform/admin-account';
import mfaRoutes,{consumeFactor} from '../../server/platform/mfa';
import {totp,fromBase32} from '../../server/platform/totp';
import organizationRoutes from '../../server/platform/organizations';
import playerRoutes from '../../server/platform/players';
import identityRoutes from '../../server/platform/identity';
import mediaRoutes from '../../server/platform/media';
import sharp from 'sharp';
import staffRoutes from '../../server/platform/staff';
import profileRoutes from '../../server/platform/profile';
import type {Actor} from '../../server/platform/repository';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import postgres from 'postgres';
import {createClient} from '@supabase/supabase-js';
import {joinTournament,reviewEntry,checkIn,room} from '../../server/platform/competition';
import {createTournament,editTournament,saveResults,publishMatch} from '../../server/platform/tournaments';
import {randomBytes} from 'node:crypto';
import {inspectAdminReset,consumeAdminReset} from '../../server/platform/admin-recovery';
import {tokenDigest} from '../../server/platform/context';
import {hashPassword,verifyPassword} from '../../server/captain/crypto';
import {PlatformRepository} from '../../server/platform/repository';

const bin='/opt/homebrew/opt/postgresql@18/bin',database=`aevic_platform_behavior_${process.pid}`;
const gateway=`aevic_behavior_gateway_${process.pid}`;
const sql=postgres({host:'/tmp',port:55432,database,max:5,prepare:false,onnotice:()=>{}});
const command=(name:string,args:string[])=>execFileSync(`${bin}/${name}`,['-h','/tmp','-p','55432',...args],{stdio:'pipe'});
const actor={adminId:'11111111-1111-4111-8111-111111111111',role:'super-admin'};
let tournamentId:string,matchId:string;
const at=(minutes:number)=>new Date(Date.now()+minutes*60000).toISOString();
const client=createClient('http://localhost:54321','isolated-publishable-key');
const input=()=>({name:'Isolated cup',shortName:'Cup',description:'Isolated integration test',startsAt:at(30),endsAt:at(120),registrationOpensAt:at(-60),registrationDeadline:at(-10),checkInOpensAt:at(-5),checkInClosesAt:at(20),maxSlots:2,rules:['Official AEVIC formula'],rounds:[{map:'Erangel' as const,startsAt:at(40)}]});
beforeAll(async()=>{
 command('createdb',[database]);
 command('psql',['-d',database,'-v','ON_ERROR_STOP=1','-f','supabase/tests/bootstrap.sql','-f','tests/fixtures/original-platform.sql',...readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort().flatMap(x=>['-f',`supabase/migrations/${x}`])]);
 await sql.unsafe(`create role ${gateway} login nosuperuser bypassrls`);
 for(const schema of ['public','aevic','aevic_private','aevic_platform','storage']){await sql.unsafe(`grant usage on schema ${schema} to ${gateway}`);await sql.unsafe(`grant all on all tables in schema ${schema} to ${gateway}`);await sql.unsafe(`grant usage,select on all sequences in schema ${schema} to ${gateway}`);}
 await sql`insert into aevic_platform.admin_accounts(id,email,role) values(${actor.adminId},'admin@example.invalid','super-admin')`;
 for(const id of [1,2,3])await sql`insert into public.teams(id,team_name,captain_name,captain_contact,email,password_hash,player1_ign,player2_ign,player3_ign,player4_ign,status) values(${id},${'Team '+id},'Captain','000000',${id+'@example.invalid'},'test-only','First','Second','Third','Fourth','approved')`;
 await sql`insert into aevic_platform.accounts(id,original_team_id) select id,id from public.teams`;
 await sql`insert into aevic_platform.team_authority(team_id,account_id,role) select id,id,'OWNER' from public.teams`;
 const result=await createTournament(sql,actor,input(),'create-tournament-1');tournamentId=result.id;
 [ {id:matchId} ]=await sql`select id from aevic.matches where tournament_id=${tournamentId}`;
});
afterAll(async()=>{await sql.end();command('dropdb',['--force',database]);command('psql',['-d','postgres','-c',`drop role if exists ${gateway}`]);});
describe('original-team competition persistence',()=>{
 it('serializes administrator slot assignment and protects check-in corrections',async()=>{
  const created=await createTournament(sql,actor,input(),'slot-admin-isolated');
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));await next();});app.route('/',staffRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:422));return app;};
  const staff=appFor(actor),captain=appFor({teamId:'1'}),operator=appFor({...actor,role:'result-operator'});
  const write=(data:unknown,key=crypto.randomUUID())=>({method:'POST',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(data)});
  const path='/admin/tournaments/'+created.id+'/slot-assignment',payload=(teamId:string)=>({teamId,slotNumber:1,expectedSlotNumber:null,reason:'Approved isolated assignment'});
  expect((await captain.request(path,write(payload('1')))).status).toBe(403);expect((await operator.request(path,write(payload('1')))).status).toBe(403);
  const concurrent=await Promise.all(['1','2'].map(id=>staff.request(path,write(payload(id)))));expect(concurrent.map(r=>r.status).sort()).toEqual([204,409]);
  const [entry]=await sql`select *,team_id::text from aevic_platform.tournament_registrations where tournament_id=${created.id}`;expect(entry.slot_number).toBe(1);
  const move={...payload(entry.team_id),slotNumber:2,expectedSlotNumber:1},key=crypto.randomUUID();expect((await staff.request(path,write(move,key))).status).toBe(204);expect((await staff.request(path,write(move,key))).status).toBe(204);
  expect((await staff.request(path,write(move))).status).toBe(409);
  const [moved]=await sql`select roster,slot_number from aevic_platform.tournament_registrations where id=${entry.id}`;expect(moved.roster).toEqual(entry.roster);expect(moved.slot_number).toBe(2);
  const checkPath='/admin/tournaments/'+created.id+'/check-in-correction',check={teamId:entry.team_id,checkedIn:true,expectedCheckedIn:false,reason:'Verified attendance correction'};
  expect((await operator.request(checkPath,write(check))).status).toBe(403);expect((await staff.request(checkPath,write(check))).status).toBe(204);expect((await staff.request(checkPath,write(check))).status).toBe(409);
  expect((await staff.request(checkPath,write({...check,checkedIn:false,expectedCheckedIn:true}))).status).toBe(204);
  expect(await sql`select * from aevic_platform.check_ins where tournament_id=${created.id}`).toHaveLength(0);
  const events=await sql`select metadata from aevic_platform.audit_events where entity_id=${entry.id} and action='check-in.correct'`;expect(events).toHaveLength(2);expect(events[0].metadata.reason).toBe(check.reason);
  await sql`update aevic.tournaments set status='completed' where id=${created.id}`;
  expect((await staff.request(checkPath,write(check))).status).toBe(409);expect((await staff.request(path,write(payload('3')))).status).toBe(409);
 });

 it('schedules each room release ten minutes before its own round',async()=>{
  const [match]=await sql`select extract(epoch from (scheduled_at-room_release_at))::int as seconds from aevic.matches where id=${matchId}`;expect(match.seconds).toBe(600);
 });

 it('paginates only the selected team inbox and records truthful audit roles',async()=>{
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));await next();});app.route('/',platformRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:422));return app;};
  const [baseline]=await sql`select count(*)::int as n from aevic_platform.notifications where recipient_id=1`;
  await sql`insert into aevic_platform.notifications(recipient_id,title,body,event_type) select 1,'Page '||n,'Own notification','tournament' from generate_series(1,5) n`;
  await sql`insert into aevic_platform.notifications(recipient_id,title,body,event_type) values(2,'Private foreign','Do not expose','tournament')`;
  const app=appFor({teamId:'1'}),ids:string[]=[];let cursor='0';
  do{const response=await app.request('/me/notifications?page=true&limit=2&cursor='+cursor);expect(response.status).toBe(200);const page=await response.json();expect(page.items.length).toBeLessThanOrEqual(2);expect(JSON.stringify(page)).not.toContain('Private foreign');ids.push(...page.items.map((i:{id:string})=>i.id));cursor=page.nextCursor;}while(cursor);
  expect(ids).toHaveLength(baseline.n+5);expect(new Set(ids).size).toBe(baseline.n+5);
  expect((await app.request('/me/notifications?page=true&cursor=-1')).status).toBe(422);
  expect((await app.request('/admin/audit')).status).toBe(403);
  const events=await(await appFor(actor).request('/admin/audit')).json();expect(events.find((e:{action:string})=>e.action==='tournament.create').actorRole).toBe('super-admin');
 });

 it('guards admin permissions and applies bulk review atomically without sending real mail',async()=>{
  const deliveries:string[]=[];
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));c.set('config',{supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'isolated',siteUrl:'http://localhost',secureCookies:false,emailFrom:'test@example.invalid',resendKey:'not-a-real-key'});await next();});app.route('/',adminManagementRoutes(async(_sql,_config,id)=>{deliveries.push(id);}));app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));return app;};
  const staff=appFor(actor),captain=appFor({teamId:'1'}),limited=appFor({adminId:actor.adminId,role:'result-operator'}),write=(body:unknown,method='POST')=>({method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const invitation={email:'invited-admin@example.invalid',firstName:'Invited',lastName:'Admin',role:'support-moderator'};
  expect((await captain.request('/admin/users',write(invitation))).status).toBe(403);expect((await limited.request('/admin/users',write(invitation))).status).toBe(403);
  const response=await staff.request('/admin/users',write(invitation));expect(response.status).toBe(201);const user=await response.json();expect(user.status).toBe('invited');expect(deliveries).toEqual([user.id]);
  expect((await staff.request('/admin/users',write(invitation))).status).toBe(409);
  expect((await staff.request(`/admin/users/${actor.adminId}`,write({role:'support-moderator',active:false},'PATCH'))).status).toBe(409);
  await sql`insert into aevic_platform.sessions(admin_id,token_digest,expires_at) values(${user.id},'permission-fixture',now()+interval '1 day')`;
  expect((await staff.request(`/admin/users/${user.id}`,write({role:'result-operator',active:false},'PATCH'))).status).toBe(200);
  expect((await sql`select revoked_at from aevic_platform.sessions where token_digest='permission-fixture'`)[0].revoked_at).not.toBeNull();
  expect((await staff.request(`/admin/users/${user.id}/setup-email`,write({}))).status).toBe(409);
  for(const id of [7001,7002]){await sql`insert into public.teams(id,team_name,captain_name,captain_contact,email,password_hash,player1_ign,player2_ign,player3_ign,player4_ign,status) values(${id},${'Bulk '+id},'Captain','000',${id+'@example.invalid'},'isolated','One','Two','Three','Four','pending')`;await sql`insert into aevic_platform.accounts(id,original_team_id) values(${id},${id})`;}
  expect((await staff.request('/admin/teams/bulk-approval',write({teamIds:['7001','1'],status:'approved'}))).status).toBe(409);expect((await sql`select status from public.teams where id=7001`)[0].status).toBe('pending');
  expect((await staff.request('/admin/teams/bulk-approval',write({teamIds:['7001','7002'],status:'rejected',reason:'short'}))).status).toBe(422);
  expect((await staff.request('/admin/teams/bulk-approval',write({teamIds:['7001','7002'],status:'approved'}))).status).toBe(200);
  expect((await sql`select id from public.teams where id in (7001,7002) and status='approved'`)).toHaveLength(2);
 });

 it('activates standalone accounts without creating teams or replacing original credentials',async()=>{
  const [before]=await sql`select count(*)::int as n from public.teams`;
  const created=await createStandaloneAccount(sql,'standalone@example.invalid','StandalonePassword42');expect(created?.id).toBeDefined();
  expect(await createStandaloneAccount(sql,'standalone@example.invalid','OtherPassword42')).toBeUndefined();
  expect(await createStandaloneAccount(sql,'1@example.invalid','OtherPassword42')).toBeUndefined();
  expect((await sql`select count(*)::int as n from public.teams`)[0].n).toBe(before.n);
  const origin='http://localhost:8899',app=createApp({supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'isolated-publishable-key',siteUrl:origin,secureCookies:false,databaseUrl:`postgres://${gateway}@127.0.0.1:55432/${database}`,sessionSecret:'isolated-http-session-secret-00000000000000'});
  const write=(path:string,body:unknown,cookie='',method='POST')=>app.request('/api'+path,{method,headers:{origin,'content-type':'application/json',cookie},body:JSON.stringify(body)});
  const login=await write('/auth/login',{email:'standalone@example.invalid',password:'StandalonePassword42'});expect(login.status).toBe(200);const cookie=login.headers.get('set-cookie')!.split(';')[0];expect((await login.json()).user.id).toBe(created!.id);
  const account=await (await app.request('/api/me/account',{headers:{cookie}})).json();expect(account.emailVerified).toBe(false);expect(account.user.email).toBe('standalone@example.invalid');expect(account.user.teamId).toBeUndefined();
  expect((await app.request('/api/me/context',{headers:{cookie}})).status).toBe(409);
  expect((await write('/auth/email-verification/confirm',{token:created!.token})).status).toBe(204);
  expect((await (await app.request('/api/me/account',{headers:{cookie}})).json()).emailVerified).toBe(true);
  expect((await write('/me/account',{firstName:'New',lastName:'Member',phone:'0000000'},cookie,'PATCH')).status).toBe(200);
  expect((await write('/me/account/password',{currentPassword:'StandalonePassword42',newPassword:'NewStandalonePassword42'},cookie,'PUT')).status).toBe(204);
  expect((await write('/auth/login',{email:'standalone@example.invalid',password:'StandalonePassword42'})).status).toBe(401);
  expect((await write('/auth/login',{email:'standalone@example.invalid',password:'NewStandalonePassword42'})).status).toBe(200);
 });


 it('requires verified identity, evidence and a one-time code to claim original teams',async()=>{
  const claimant=await createStandaloneAccount(sql,'claimant@example.invalid','ClaimantPassword42');const principal={teamId:claimant!.id,accountId:claimant!.id};
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));c.set('config',{supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'isolated',siteUrl:'http://localhost',secureCookies:false});await next();});app.route('/',legacyClaimRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));return app;};
  const member=appFor(principal),staff=appFor(actor),foreign=appFor({teamId:'2'}),write=(body:unknown)=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  expect((await member.request('/me/legacy-claims',write({sourceKey:'3'}))).status).toBe(403);
  await sql`update aevic_platform.accounts set email_verified_at=now() where id=${claimant!.id}`;
  expect((await member.request('/me/legacy-claims',write({sourceKey:'3'}))).status).toBe(202);expect((await member.request('/me/legacy-claims',write({sourceKey:'999999'}))).status).toBe(202);
  const mine=await (await member.request('/me/legacy-claims')).json();expect(mine).toHaveLength(1);const id=mine[0].id;
  expect((await member.request('/admin/legacy-claims')).status).toBe(403);
  expect((await staff.request(`/admin/legacy-claims/${id}/review`,write({decision:'approve',expectedVersion:1,evidenceRef:crypto.randomUUID()}))).status).toBe(422);
  const [evidence]=await sql`insert into aevic_platform.support_tickets(user_id,category,subject,description) values(${claimant!.id},'account','Identity evidence','Independently checked isolated evidence') returning id`;
  const reviewed=await staff.request(`/admin/legacy-claims/${id}/review`,write({decision:'approve',expectedVersion:1,evidenceRef:evidence.id}));expect(reviewed.status).toBe(200);const approved=await reviewed.json();
  expect((await staff.request(`/admin/legacy-claims/${id}/review`,write({decision:'approve',expectedVersion:1,evidenceRef:evidence.id}))).status).toBe(409);
  const [stored]=await sql`select token_digest from aevic_platform.legacy_claims where id=${id}`;expect(stored.token_digest).not.toBe(approved.code);
  expect((await foreign.request(`/me/legacy-claims/${id}/consume`,write({code:approved.code}))).status).toBe(422);
  const [before]=await sql`select to_jsonb(t) as row from public.teams t where id=3`;
  const outcomes=await Promise.all([1,2].map(()=>member.request(`/me/legacy-claims/${id}/consume`,write({code:approved.code}))));expect(outcomes.map(r=>r.status).sort()).toEqual([200,422]);
  const [after]=await sql`select to_jsonb(t) as row from public.teams t where id=3`;expect(after.row).toEqual(before.row);
  expect((await sql`select account_id::text from aevic_platform.team_authority where team_id=3 and role='OWNER'`)[0].account_id).toBe(claimant!.id);
  expect((await (await member.request('/me/legacy-claims')).json())[0].status).toBe('consumed');
 });
 it('separates signed-in accounts from delegated workspaces without changing credentials',async()=>{
  const password='IsolatedWorkspacePassword42',hash=await hashPassword(password),origin='http://localhost:8899';
  for(const id of [60,61,62]){await sql`insert into public.teams(id,team_name,captain_name,captain_contact,email,password_hash,player1_ign,player2_ign,player3_ign,player4_ign,status) values(${id},${'Workspace '+id},${'Captain '+id},'private-contact',${id+'@example.invalid'},${hash},'One','Two','Three','Four','approved')`;await sql`insert into aevic_platform.accounts(id,original_team_id) values(${id},${id})`;await sql`insert into aevic_platform.team_authority(team_id,account_id,role) values(${id},${id},'OWNER')`;}
  const app=createApp({supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'isolated-publishable-key',siteUrl:origin,secureCookies:false,databaseUrl:`postgres://${gateway}@127.0.0.1:55432/${database}`,sessionSecret:'isolated-http-session-secret-00000000000000'});
  const write=(path:string,body:unknown,cookie='',method='POST')=>app.request('/api'+path,{method,headers:{origin,'content-type':'application/json',cookie,'idempotency-key':crypto.randomUUID()},body:JSON.stringify(body)});
  const login=async(id:number)=>{const response=await write('/auth/login',{email:id+'@example.invalid',password});expect(response.status).toBe(200);return response.headers.get('set-cookie')!.split(';')[0];};
  const owner=await login(60),manager=await login(61),player=await login(62);
  expect((await write('/me/workspace',{teamId:'60'},manager)).status).toBe(403);
  const invitation=await (await write('/teams/60/invitations',{recipient:'61@example.invalid',role:'MANAGER'},owner)).json();expect(invitation.id).toBeDefined();
  expect((await write(`/team-invitations/${invitation.id}/response`,{response:'ACCEPTED'},player)).status).toBe(404);
  expect((await write(`/team-invitations/${invitation.id}/response`,{response:'ACCEPTED'},manager)).status).toBe(200);
  const selected=await write('/me/workspace',{teamId:'60'},manager);expect(selected.status).toBe(204);const selectedCookie=manager+'; '+selected.headers.get('set-cookie')!.split(';')[0];
  const context=await (await app.request('/api/me/context',{headers:{cookie:selectedCookie}})).json();expect(context.currentTeam.id).toBe('60');expect(context.accountId).toBe('61');expect(context.workspaceRole).toBe('MANAGER');expect(JSON.stringify(context.currentTeam)).not.toContain('60@example.invalid');
  const account=await (await app.request('/api/me/account',{headers:{cookie:selectedCookie}})).json();expect(account.user.id).toBe('61');expect(account.user.email).toBe('61@example.invalid');
  expect((await write('/teams/60/social-links',{website:'https://example.invalid'},selectedCookie,'PUT')).status).toBe(200);
  const roster=await write('/teams/60/roster/1',{ign:'DelegatedOne'},selectedCookie,'PUT');expect(roster.status).toBe(200);
  const memberRows=await (await app.request('/api/teams/60/authority',{headers:{cookie:owner}})).json(),target=memberRows.find((m:{userId:string})=>m.userId==='61');
  expect((await write('/teams/60/ownership',{memberId:target.id,confirmation:'Workspace 60'},selectedCookie)).status).toBe(403);
  const playerInvite=await (await write('/teams/60/invitations',{recipient:'62@example.invalid',role:'PLAYER'},owner)).json();expect((await write(`/team-invitations/${playerInvite.id}/response`,{response:'ACCEPTED'},player)).status).toBe(200);
  const playerSelected=player+'; aevic-workspace=60';expect((await write('/teams/60/social-links',{},playerSelected,'PUT')).status).toBe(403);
  expect((await write('/teams/60/leave',{reason:'Leaving read-only workspace'},playerSelected)).status).toBe(204);
  expect((await write('/teams/60/ownership',{memberId:target.id,confirmation:'Workspace 60'},owner)).status).toBe(200);
  expect((await write('/teams/60/leave',{reason:'Original account leaving workspace'},owner)).status).toBe(204);
  expect((await write('/teams/60/social-links',{},owner,'PUT')).status).toBe(403);
  const noWorkspace=await app.request('/api/me/context',{headers:{cookie:owner}});expect(noWorkspace.status).toBe(409);expect((await noWorkspace.json()).code).toBe('TEAM_WORKSPACE_REQUIRED');
  expect((await app.request('/api/me/account',{headers:{cookie:owner}})).status).toBe(200);
  expect((await write('/teams/60/archive',{reason:'Isolated archive test only',confirmation:'Workspace 60'},selectedCookie)).status).toBe(204);
  const preserved=await sql`select id::text,password_hash,email from public.teams where id in (60,61,62)`;expect(preserved).toHaveLength(3);for(const row of preserved)expect(row.password_hash).toBe(hash);
 });

 it('requires recipient consent for organization teams and owner authority for transfer',async()=>{
  const appFor=(teamId:string)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,{teamId}));await next();});app.route('/',organizationRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));return app;};
  const one=appFor('1'),two=appFor('2'),three=appFor('3');
  const write=(body:unknown,key:string,method='POST')=>({method,headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)});
  const response=await one.request('/organizations',write({name:'Integration Organization',shortName:'IO',description:'Isolated test',country:'AZ'},'organization-create'));expect(response.status).toBe(201);const org=await response.json();
  expect((await two.request(`/organizations/${org.id}/members`)).status).toBe(403);
  expect((await one.request(`/organizations/${org.id}/teams`,write({teamId:'2',gameKey:'pubg-mobile'},'org-direct'))).status).toBe(403);
  const inviteResponse=await one.request(`/organizations/${org.id}/team-invitations`,write({teamId:'2'},'org-team-invite'));expect(inviteResponse.status).toBe(201);const invite=await inviteResponse.json();
  expect((await three.request(`/organization-invitations/${invite.id}/response`,write({response:'ACCEPTED'},'org-foreign'))).status).toBe(404);
  expect((await two.request(`/organization-invitations/${invite.id}/response`,write({response:'ACCEPTED'},'org-accept'))).status).toBe(200);
  expect((await sql`select team_id from aevic_platform.organization_teams where organization_id=${org.id}`)).toHaveLength(1);
  const memberInvite=await (await one.request(`/organizations/${org.id}/member-invitations`,write({recipient:'2@example.invalid',role:'MEMBER'},'org-member-invite'))).json();
  expect((await two.request(`/organization-invitations/${memberInvite.id}/response`,write({response:'ACCEPTED'},'org-member-accept'))).status).toBe(200);
  const rows=await (await one.request(`/organizations/${org.id}/members`)).json(),target=rows.find((r:{userId:string})=>r.userId==='2');expect(target).toBeDefined();
  expect((await two.request(`/organizations/${org.id}/ownership`,write({memberId:target.id,confirmation:org.name},'org-forbidden-transfer'))).status).toBe(403);
  expect((await one.request(`/organizations/${org.id}/ownership`,write({memberId:target.id,confirmation:org.name},'org-transfer'))).status).toBe(200);
  expect((await one.request(`/organizations/${org.id}/ownership`,write({memberId:target.id,confirmation:org.name},'org-transfer-again'))).status).toBe(403);
 });

 it('keeps player claims private and serializes competing administrator approvals',async()=>{
  await sql`insert into aevic_platform.player_details(team_id,slot,pubg_id,role) values(1,1,'987654321','captain')`;
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));await next();});app.route('/',playerRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));return app;};
  const publicApp=appFor({}),one=appFor({teamId:'1'}),two=appFor({teamId:'2'}),staff=appFor(actor);
  const write=(method:string,body:unknown,key?:string)=>({method,headers:{'content-type':'application/json',...(key?{'idempotency-key':key}:{})},body:JSON.stringify(body)});
  const profile=await (await publicApp.request('/players/pubg-987654321')).json();expect(profile.ign).toBe('First');expect(profile.tournamentHistory).toEqual([]);expect(JSON.stringify(profile)).not.toMatch(/email|password|captain_contact|claims/);
  expect((await publicApp.request('/players/pubg-987654321/claims',write('POST',{verificationMethod:'ADMIN_REVIEW'},'anonymous-claim'))).status).toBe(401);
  const firstResponse=await one.request('/players/pubg-987654321/claims',write('POST',{verificationMethod:'ADMIN_REVIEW'},'claim-first'));expect(firstResponse.status).toBe(201);const first=await firstResponse.json();
  expect((await one.request('/players/pubg-987654321/claims',write('POST',{verificationMethod:'ADMIN_REVIEW'},'claim-duplicate'))).status).toBe(409);
  expect(await (await two.request('/players/pubg-987654321/claims')).json()).toEqual([]);
  expect((await (await one.request('/players/pubg-987654321/claims')).json())[0].id).toBe(first.id);
  const second=await (await two.request('/players/pubg-987654321/claims',write('POST',{verificationMethod:'PUBG_IDENTITY'},'claim-second'))).json();
  expect((await one.request('/admin/players/pubg-987654321')).status).toBe(403);
  expect((await one.request(`/admin/player-claims/${first.id}`,write('PATCH',{status:'APPROVED',reason:'Reviewed identity evidence'}))).status).toBe(403);
  const results=await Promise.all([first,second].map(claim=>staff.request(`/admin/player-claims/${claim.id}`,write('PATCH',{status:'APPROVED',reason:'Reviewed identity evidence'}))));expect(results.map(r=>r.status).sort()).toEqual([204,409]);
  const detail=await (await staff.request('/admin/players/pubg-987654321')).json();expect(detail.claims.filter((c:{status:string})=>c.status==='APPROVED')).toHaveLength(1);expect(detail.linkedAccount).toBeDefined();
 });

 it('consumes administrator setup once and revokes existing sessions',async()=>{
  const token=`adm.${actor.adminId}.${randomBytes(32).toString('base64url')}`;
  await sql`update aevic_platform.admin_accounts set reset_digest=${tokenDigest(token)},reset_expires_at=now()+interval '30 minutes' where id=${actor.adminId}`;
  await sql`insert into aevic_platform.sessions(admin_id,token_digest,expires_at) values(${actor.adminId},'isolated-existing-session',now()+interval '1 day')`;
  expect(await inspectAdminReset(sql,token)).toBe('valid');
  expect(await inspectAdminReset(sql,token.slice(0,-1)+'!')).toBe('invalid');
  await consumeAdminReset(sql,token,'IsolatedNewPassword42');
  expect(await inspectAdminReset(sql,token)).toBe('invalid');
  await expect(consumeAdminReset(sql,token,'ReplayPassword42')).rejects.toMatchObject({code:'INVALID_RESET_TOKEN'});
  const [account]=await sql`select password_hash,reset_digest from aevic_platform.admin_accounts where id=${actor.adminId}`;
  expect(account.reset_digest).toBeNull();expect(await verifyPassword('IsolatedNewPassword42',account.password_hash)).toBe(true);
  const [session]=await sql`select revoked_at from aevic_platform.sessions where token_digest='isolated-existing-session'`;
  expect(session.revoked_at).not.toBeNull();
 });
 it('rejects expired administrator setup without changing credentials',async()=>{
  const token=`adm.${actor.adminId}.${randomBytes(32).toString('base64url')}`;
  await sql`update aevic_platform.admin_accounts set reset_digest=${tokenDigest(token)},reset_expires_at=now()-interval '1 minute' where id=${actor.adminId}`;
  expect(await inspectAdminReset(sql,token)).toBe('expired');
  await expect(consumeAdminReset(sql,token,'ExpiredPassword42')).rejects.toMatchObject({code:'INVALID_RESET_TOKEN'});
 });
 it('manages administrator profiles and revokes only owned sessions',async()=>{
  const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,actor));c.set('config',{supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'isolated',siteUrl:'http://localhost',secureCookies:false});await next();});app.route('/',adminAccountRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));
  const saved=await app.request('/me/account',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({firstName:'Updated',lastName:'Administrator',phone:'0000000'})});expect(saved.status).toBe(200);expect(await saved.json()).toMatchObject({user:{firstName:'Updated',phone:'0000000'},emailVerified:true});
  await sql`insert into aevic_platform.sessions(admin_id,token_digest,expires_at) values(${actor.adminId},${tokenDigest('current-admin-fixture')},now()+interval '1 day'),(${actor.adminId},'other-admin-fixture',now()+interval '1 day')`;
  const [foreign]=await sql`insert into aevic_platform.sessions(team_id,token_digest,expires_at) values(1,'foreign-captain-fixture',now()+interval '1 day') returning id`;
  const headers={cookie:'aevic-admin=current-admin-fixture'};
  expect((await app.request('/me/sessions/'+foreign.id,{method:'DELETE',headers})).status).toBe(404);
  expect((await app.request('/me/sessions/others',{method:'DELETE',headers})).status).toBe(204);
  const sessions=await (await app.request('/me/sessions',{headers})).json();expect(sessions.some((s:{status:string})=>s.status==='current')).toBe(true);expect(sessions.some((s:{id:string})=>s.id===foreign.id)).toBe(false);
  const exportResponse=await app.request('/me/data-export',{method:'POST'});expect(exportResponse.status).toBe(201);const exported=await exportResponse.json();
  const download=await app.request(`/me/data-export/${exported.id}/download`);expect(download.status).toBe(200);const content=await download.text();expect(content).not.toMatch(/password_hash|token_digest|reset_digest|foreign-captain/);expect(JSON.parse(content).profile.user.email).toBe('admin@example.invalid');
  const deletion=await (await app.request('/me/deletion',{method:'POST'})).json();expect(deletion.blocked).toBe(true);
  const changed=await app.request('/me/account/password',{method:'PUT',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({currentPassword:'IsolatedNewPassword42',newPassword:'ChangedAdminPassword42'})});expect(changed.status).toBe(204);
  const active=await sql`select id from aevic_platform.sessions where admin_id=${actor.adminId} and revoked_at is null`;expect(active).toHaveLength(0);
  const [untouched]=await sql`select revoked_at from aevic_platform.sessions where id=${foreign.id}`;expect(untouched.revoked_at).toBeNull();
 });
 it('enrolls MFA and consumes recovery codes once while revoking other sessions',async()=>{
  const master='isolated-mfa-master-secret-000000000000000';
  const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,actor));c.set('config',{supabaseUrl:'https://nmjjibf.test',publishableKey:'isolated',siteUrl:'http://localhost',secureCookies:false,sessionSecret:master});await next();});app.route('/',mfaRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));
  await sql`insert into aevic_platform.sessions(admin_id,token_digest,expires_at) values(${actor.adminId},${tokenDigest('mfa-current-fixture')},now()+interval '1 day'),(${actor.adminId},'mfa-other-fixture',now()+interval '1 day')`;
  const headers={cookie:'aevic-admin=mfa-current-fixture','content-type':'application/json'};
  const setupResponse=await app.request('/me/2fa/setup',{method:'POST',headers,body:JSON.stringify({password:'ChangedAdminPassword42'})});expect(setupResponse.status).toBe(200);const setup=await setupResponse.json();
  expect(setup.qrSvg).toContain('<svg');const secret=fromBase32(new URL(setup.otpauthUri).searchParams.get('secret')!);
  const confirmed=await app.request('/me/2fa/setup/verification',{method:'POST',headers,body:JSON.stringify({setupId:setup.setupId,code:totp(secret,Math.floor(Date.now()/30000))})});expect(confirmed.status).toBe(200);const recovery=await confirmed.json();expect(recovery.codes).toHaveLength(10);
  const [current]=await sql`select revoked_at,mfa_verified_at from aevic_platform.sessions where token_digest=${tokenDigest('mfa-current-fixture')}`;expect(current.revoked_at).toBeNull();expect(current.mfa_verified_at).not.toBeNull();
  const [other]=await sql`select revoked_at from aevic_platform.sessions where token_digest='mfa-other-fixture'`;expect(other.revoked_at).not.toBeNull();
  await expect(sql.begin(tx=>consumeFactor(tx,actor,master))).rejects.toMatchObject({code:'MFA_REQUIRED'});
  expect(await sql.begin(tx=>consumeFactor(tx,actor,master,recovery.codes[0]))).toBe(true);
  await expect(sql.begin(tx=>consumeFactor(tx,actor,master,recovery.codes[0]))).rejects.toMatchObject({code:'MFA_INVALID'});
  const [stored]=await sql`select secret_ciphertext,recovery_digests from aevic_platform.mfa_factors where admin_id=${actor.adminId}`;expect(stored.recovery_digests).toHaveLength(9);expect(JSON.stringify(stored)).not.toContain(recovery.codes[0]);expect(stored.secret_ciphertext).not.toContain(secret.toString('base64'));
  const disabled=await app.request('/me/2fa',{method:'DELETE',headers,body:JSON.stringify({password:'ChangedAdminPassword42',code:recovery.codes[1]})});expect(disabled.status).toBe(204);
  expect((await (await app.request('/me/2fa',{headers})).json()).enabled).toBe(false);
  const expiring=await (await app.request('/me/2fa/setup',{method:'POST',headers,body:JSON.stringify({password:'ChangedAdminPassword42'})})).json();
  await sql`update aevic_platform.mfa_factors set setup_expires_at=now()-interval '1 second' where admin_id=${actor.adminId}`;
  const expired=await app.request('/me/2fa/setup/verification',{method:'POST',headers,body:JSON.stringify({setupId:expiring.setupId,code:'123456'})});expect(expired.status).toBe(409);expect((await expired.json()).code).toBe('MFA_SETUP_EXPIRED');

 });
 it('enforces MFA through the complete HTTP app with real captain cookies',async()=>{
  const password='HttpCaptainFixture42';await sql`update public.teams set password_hash=${await hashPassword(password)} where id=1`;
  const origin='http://localhost:8899';const app=createApp({supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'isolated-publishable-key',siteUrl:origin,secureCookies:false,databaseUrl:`postgres://${gateway}@127.0.0.1:55432/${database}`,sessionSecret:'isolated-http-session-secret-00000000000000'});
  const post=(path:string,body:unknown,cookie='')=>app.request('/api'+path,{method:'POST',headers:{origin,'content-type':'application/json',cookie},body:JSON.stringify(body)});
  const login=await post('/auth/login',{email:'1@example.invalid',password});expect(login.status).toBe(200);const cookie=login.headers.get('set-cookie')!.split(';')[0];
  const otherLogin=await post('/auth/login',{email:'1@example.invalid',password});expect(otherLogin.status).toBe(200);const other=otherLogin.headers.get('set-cookie')!.split(';')[0];
  const pending=await post('/me/2fa/setup',{password},cookie);expect(pending.status).toBe(200);const setup=await pending.json();
  const secret=fromBase32(new URL(setup.otpauthUri).searchParams.get('secret')!);
  const enabled=await post('/me/2fa/setup/verification',{setupId:setup.setupId,code:totp(secret,Math.floor(Date.now()/30000))},cookie);expect(enabled.status).toBe(200);const codes=(await enabled.json()).codes;
  expect((await app.request('/api/me/session',{headers:{cookie}})).status).toBe(200);
  expect((await app.request('/api/me/session',{headers:{cookie:other}})).status).toBe(401);
  const noCode=await post('/auth/login',{email:'1@example.invalid',password});expect(noCode.status).toBe(401);expect((await noCode.json()).code).toBe('MFA_REQUIRED');expect(noCode.headers.get('set-cookie')).toBeNull();
  const recovered=await post('/auth/login',{email:'1@example.invalid',password,otp:codes[0]},other);expect(recovered.status).toBe(200);const fresh=recovered.headers.get('set-cookie')!.split(';')[0];
  const replay=await post('/auth/login',{email:'1@example.invalid',password,otp:codes[0]});expect(replay.status).toBe(401);expect((await replay.json()).code).toBe('MFA_INVALID');
  const rotated=await app.request('/api/me/sessions/others',{method:'DELETE',headers:{origin,cookie:fresh}});expect(rotated.status).toBe(204);const rotatedCookie=rotated.headers.get('set-cookie')!.split(';')[0];
  expect((await app.request('/api/me/session',{headers:{cookie:rotatedCookie}})).status).toBe(200);
  const disable=await app.request('/api/me/2fa',{method:'DELETE',headers:{origin,'content-type':'application/json',cookie:rotatedCookie},body:JSON.stringify({password,code:codes[1]})});expect(disable.status).toBe(204);
 });
 it('enforces administrator MFA before granting privileged HTTP access',async()=>{
  const password='ChangedAdminPassword42',origin='http://localhost:8899';
  const app=createApp({supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'isolated-publishable-key',siteUrl:origin,secureCookies:false,databaseUrl:`postgres://${gateway}@127.0.0.1:55432/${database}`,sessionSecret:'isolated-http-session-secret-00000000000000'});
  const post=(path:string,body:unknown,cookie='')=>app.request('/api'+path,{method:'POST',headers:{origin,'content-type':'application/json',cookie},body:JSON.stringify(body)});
  const first=await post('/auth/admin/login',{email:'admin@example.invalid',password});expect(first.status).toBe(200);const current=first.headers.get('set-cookie')!.split(';')[0];
  const second=await post('/auth/admin/login',{email:'admin@example.invalid',password});expect(second.status).toBe(200);const old=second.headers.get('set-cookie')!.split(';')[0];
  const setupResponse=await post('/me/2fa/setup',{password},current);expect(setupResponse.status).toBe(200);const setup=await setupResponse.json();const secret=fromBase32(new URL(setup.otpauthUri).searchParams.get('secret')!);
  const enabled=await post('/me/2fa/setup/verification',{setupId:setup.setupId,code:totp(secret,Math.floor(Date.now()/30000))},current);expect(enabled.status).toBe(200);const codes=(await enabled.json()).codes;
  expect((await app.request('/api/admin/context',{headers:{cookie:old}})).status).toBe(401);
  expect((await app.request('/api/admin/context',{headers:{cookie:current}})).status).toBe(200);
  const denied=await post('/auth/admin/login',{email:'admin@example.invalid',password});expect(denied.status).toBe(401);expect((await denied.json()).code).toBe('MFA_REQUIRED');expect(denied.headers.get('set-cookie')).toBeNull();
  const allowed=await post('/auth/admin/login',{email:'admin@example.invalid',password,otp:codes[0]});expect(allowed.status).toBe(200);const verified=allowed.headers.get('set-cookie')!.split(';')[0];
  expect((await app.request('/api/admin/context',{headers:{cookie:verified}})).status).toBe(200);
  expect((await post('/auth/admin/login',{email:'admin@example.invalid',password,otp:codes[0]})).status).toBe(401);
  const crossSite=await app.request('/api/me/2fa',{method:'DELETE',headers:{origin:'https://untrusted.example','content-type':'application/json',cookie:verified},body:JSON.stringify({password,code:codes[1]})});expect(crossSite.status).toBe(403);
  const disable=await app.request('/api/me/2fa',{method:'DELETE',headers:{origin,'content-type':'application/json',cookie:verified},body:JSON.stringify({password,code:codes[1]})});expect(disable.status).toBe(204);
 });
 it('persists public settings while restricting writes to the super administrator',async()=>{
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));await next();});app.route('/',staffRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));return app;};
  const input={supportEmail:'support@example.invalid',registrationEnabled:false,maintenanceMessage:'Isolated tournament announcement'};
  const request={method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(input)};
  expect((await appFor({teamId:'1'}).request('/admin/settings',request)).status).toBe(403);
  expect((await appFor({...actor,role:'support-moderator'}).request('/admin/settings',request)).status).toBe(403);
  expect((await appFor(actor).request('/admin/settings',request)).status).toBe(200);
  const response=await appFor({}).request('/public/settings');expect(response.status).toBe(200);expect(await response.json()).toEqual(input);
  expect((await appFor({}).request('/admin/settings')).status).toBe(401);
  const [event]=await sql`select action from aevic_platform.audit_events where action='settings.update'`;
  expect(event.action).toBe('settings.update');
 });
 it('returns persisted social links as the complete team contract',async()=>{
  const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,{teamId:'1'}));await next();});app.route('/',profileRoutes);
  const response=await app.request('/teams/1/social-links',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({website:'https://example.invalid/team'})});
  expect(response.status).toBe(200);expect(await response.json()).toMatchObject({id:'1',socialLinks:{website:'https://example.invalid/team'}});
  expect((await new PlatformRepository(client,sql,{teamId:'1'}).team('1',true)).socialLinks).toEqual({website:'https://example.invalid/team'});
 });
 it('keeps evidence private while serving published team images',async()=>{
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));await next();});app.route('/',mediaRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));return app;};
  const image=await sharp({create:{width:40,height:20,channels:3,background:'#805020'}}).png().toBuffer();
  const upload=async(kind:string,owner='1')=>{const form=new FormData();form.set('ownerId',owner);form.set('assetType',kind);form.set('file',new File([image],'fixture.png',{type:'image/png'}));return appFor({teamId:'1'}).request('/media/uploads',{method:'POST',body:form});};
  expect((await upload('logo','2')).status).toBe(403);
  const evidence=await upload('evidence');expect(evidence.status).toBe(201);const privateImage=await evidence.json();
  expect((await appFor({}).request(privateImage.previewUrl.replace('/api',''))).status).toBe(404);
  expect((await appFor({teamId:'2'}).request('/media/'+privateImage.id+'/access')).status).toBe(404);
  expect((await appFor(actor).request('/media/'+privateImage.id+'/access')).status).toBe(200);
  expect((await appFor({teamId:'1'}).request(privateImage.previewUrl.replace('/api',''))).status).toBe(200);
  const banner=await upload('banner');expect(banner.status).toBe(201);const published=await banner.json();
  const served=await appFor({}).request(published.previewUrl.replace('/api',''));expect(served.status).toBe(200);expect(served.headers.get('content-type')).toBe('image/webp');
  const metadata=await sharp(Buffer.from(await served.arrayBuffer())).metadata();expect(metadata.width).toBe(40);expect(metadata.height).toBe(20);expect(metadata.exif).toBeUndefined();
  expect((await appFor({teamId:'1'}).request('/media/teams/1/banner',{method:'DELETE'})).status).toBe(204);
  expect((await appFor({}).request(published.previewUrl.replace('/api',''))).status).toBe(404);
 });
 it('reviews team verification with ownership and stale-decision protection',async()=>{
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));await next();});app.route('/',identityRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));return app;};
  const payload={entityType:'TEAM',entityId:'1',entityName:'Team 1',representativeName:'Fixture Captain',officialSocials:{website:'https://example.invalid/team'},notes:'Official organization identity evidence for isolated testing.',evidenceNames:[]};
  const create={method:'POST',headers:{'content-type':'application/json','idempotency-key':'verification-fixture'},body:JSON.stringify(payload)};
  expect((await appFor({teamId:'2'}).request('/verifications',create)).status).toBe(403);
  const receipt=await appFor({teamId:'1'}).request('/verifications',create);expect(receipt.status).toBe(201);const submitted=await receipt.json();expect(submitted.status).toBe('PENDING');
  const replay=await appFor({teamId:'1'}).request('/verifications',create);expect((await replay.json()).id).toBe(submitted.id);
  const review={method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'APPROVED',expectedStatus:'PENDING',reason:'Verified through official fixture records.'})};
  expect((await appFor({teamId:'1'}).request('/admin/verifications/'+submitted.id,review)).status).toBe(403);
  expect((await appFor(actor).request('/admin/verifications/'+submitted.id,review)).status).toBe(200);
  expect((await appFor(actor).request('/admin/verifications/'+submitted.id,review)).status).toBe(409);
  expect((await new PlatformRepository(client,sql).team('1')).verificationLevel).toBe('verified');
  const revoke={...review,body:JSON.stringify({status:'REVOKED',expectedStatus:'APPROVED',reason:'Fixture evidence no longer supports verification.'})};
  expect((await appFor(actor).request('/admin/verifications/'+submitted.id,revoke)).status).toBe(200);
  expect((await new PlatformRepository(client,sql).team('1')).verificationLevel).not.toBe('verified');
 });
 it('registers original accounts atomically and safely replays retries',async()=>{
  await sql`update aevic_platform.settings set value=jsonb_set(value,'{registrationEnabled}','true') where key='platform'`;
  await sql`select setval(pg_get_serial_sequence('public.teams','id'),(select max(id) from public.teams))`;
  const input={idempotencyKey:'registration-retry-fixture',password:'RegistrationFixture42',draft:{teamName:'Fixture Registration',tag:'FIX',firstName:'Fixture',lastName:'Captain',phone:'0000000',email:'registration@example.invalid',players:[{ign:'One',uid:'510000001',role:'captain' as const},{ign:'Two',uid:'510000002',role:'starter' as const},{ign:'Three',uid:'510000003',role:'starter' as const},{ign:'Four',uid:'510000004',role:'starter' as const},{ign:'',uid:'',role:'substitute' as const}]}};
  const secret='isolated-test-registration-secret-0000000000';
  const a=await registerOriginalTeam(sql,secret,input),b=await registerOriginalTeam(sql,secret,input);
  expect(b.receipt.registrationId).toBe(a.receipt.registrationId);expect(a.receipt.duplicate).toBe(false);expect(b.receipt.duplicate).toBe(true);
  const team=await new PlatformRepository(client,sql,{teamId:a.receipt.registrationId}).team(a.receipt.registrationId,true);
  expect(team.legacyHistoryIncomplete).toBe(false);expect(team.tag).toBe('FIX');expect(team.roster.map(p=>p.uid)).toEqual(input.draft.players.slice(0,4).map(p=>p.uid));expect(team.roster[0].role).toBe('captain');
  const [count]=await sql`select count(*)::int n from public.teams where email='registration@example.invalid'`;expect(count.n).toBe(1);
  await expect(registerOriginalTeam(sql,secret,{...input,draft:{...input.draft,tag:'CHANGED'}})).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
  const conflict={...input,idempotencyKey:'registration-conflict-fixture',draft:{...input.draft,teamName:'Conflicting Players',email:'conflict@example.invalid'}};
  await expect(registerOriginalTeam(sql,secret,conflict)).rejects.toMatchObject({code:'PLAYER_ALREADY_REGISTERED'});
  expect(await sql`select id from public.teams where email='conflict@example.invalid'`).toHaveLength(0);
  const [record]=await sql`select payload_digest,result from aevic_platform.idempotency where key=${input.idempotencyKey}`;expect(JSON.stringify(record)).not.toContain(input.password);
  const racing=[1,2].map(n=>({...input,idempotencyKey:'registration-race-'+n,draft:{...input.draft,teamName:'Concurrent Team',email:`race${n}@example.invalid`,players:input.draft.players.map((p,i)=>({...p,uid:p.uid?`5200000${n}${i}`:''}))}}));
  const outcomes=await Promise.allSettled(racing.map(value=>registerOriginalTeam(sql,secret,value)));
  expect(outcomes.filter(v=>v.status==='fulfilled')).toHaveLength(1);expect(outcomes.filter(v=>v.status==='rejected')).toHaveLength(1);
  const [created]=await sql`select count(*)::int n from public.teams where team_name='Concurrent Team'`;expect(created.n).toBe(1);
  await sql`update aevic_platform.settings set value=jsonb_set(value,'{registrationEnabled}','false') where key='platform'`;
  await expect(registerOriginalTeam(sql,secret,{...racing[0],idempotencyKey:'registration-closed',draft:{...racing[0].draft,teamName:'Closed Team',email:'closed@example.invalid'}})).rejects.toMatchObject({code:'REGISTRATION_CLOSED'});
  expect(await sql`select id from public.teams where email='closed@example.invalid'`).toHaveLength(0);

 });
 it('creates draft once and rejects idempotent payload changes',async()=>{
  const draft=input();const first=await createTournament(sql,actor,draft,'same-create-key'),second=await createTournament(sql,actor,draft,'same-create-key');expect(second.id).toBe(first.id);
  await expect(createTournament(sql,actor,{...draft,name:'Changed'},'same-create-key')).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
  expect((await new PlatformRepository(client,sql).tournaments()).some(t=>t.id===first.id)).toBe(false);
 });
 it('rejects entry before registration opens',async()=>{await expect(joinTournament(sql,'1',tournamentId)).rejects.toMatchObject({code:'REGISTRATION_CLOSED'});});
 it('reserves capacity atomically across concurrent teams',async()=>{
  await sql`update aevic.tournaments set status='registration-open',registration_deadline=now()+interval '10 minutes',check_in_opens_at=now()+interval '11 minutes' where id=${tournamentId}`;
  const outcomes=await Promise.allSettled([1,2,3].map(id=>joinTournament(sql,String(id),tournamentId)));
  expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(2);
  expect(outcomes.filter(r=>r.status==='rejected')).toHaveLength(1);
  const entries=await sql`select team_id::text from aevic_platform.tournament_registrations where tournament_id=${tournamentId}`;
  for(const e of entries)await reviewEntry(sql,actor,tournamentId,e.team_id,'confirmed');
  const slots=await sql`select slot_number from aevic_platform.tournament_registrations where tournament_id=${tournamentId}`;expect(slots.map(x=>x.slot_number).sort()).toEqual([1,2]);
 });
 it('requires check-in and timed room release; excludes room data from snapshots',async()=>{
  const [e]=await sql`select team_id::text from aevic_platform.tournament_registrations where tournament_id=${tournamentId} limit 1`;
  await sql`insert into aevic.match_rooms(match_id,room_id,password) values(${matchId},'123456','isolated-room-secret')`;
  await expect(room(sql,e.team_id,tournamentId,matchId)).rejects.toMatchObject({code:'ROOM_NOT_ELIGIBLE'});
  await sql`update aevic.tournaments set registration_deadline=now()-interval '10 minutes',check_in_opens_at=now()-interval '5 minutes' where id=${tournamentId}`;
  await checkIn(sql,e.team_id,tournamentId);
  expect(await room(sql,e.team_id,tournamentId,matchId)).toMatchObject({status:'locked'});
  await sql`update aevic.matches set room_release_at=now()-interval '1 minute' where id=${matchId}`;
  expect(await room(sql,e.team_id,tournamentId,matchId)).toMatchObject({status:'released',roomId:'123456'});
  expect(JSON.stringify(await new PlatformRepository(client,sql,{teamId:e.team_id}).teamSnapshot(e.team_id,e.team_id))).not.toContain('isolated-room-secret');
 });
 it('computes scoring on server and prevents partial publication',async()=>{
  await sql`update aevic.tournaments set status='ongoing' where id=${tournamentId}`;
  const entries=await sql`select team_id::text from aevic_platform.tournament_registrations where tournament_id=${tournamentId} order by slot_number`;
  const draft=(teamId:string,placement:number)=>({tournamentId,roundId:matchId,teamId,placement,finishes:4,placementPoints:9999,finishPoints:9999,totalPoints:9999,penalties:0,published:true});
  await saveResults(sql,actor,matchId,[draft(entries[0].team_id,1)]);
  await expect(publishMatch(sql,actor,matchId)).rejects.toMatchObject({code:'INCOMPLETE_RESULTS'});
  expect(await new PlatformRepository(client,sql).history()).toEqual([]);
  await saveResults(sql,actor,matchId,[draft(entries[1].team_id,2)]);await publishMatch(sql,actor,matchId);
  const standings=await new PlatformRepository(client,sql).standings(tournamentId);expect(standings.map(r=>r.totalPoints)).toEqual([14,10]);
  await expect(saveResults(sql,actor,matchId,[draft(entries[0].team_id,2)])).rejects.toMatchObject({code:'USE_RESULT_CORRECTION'});
 });
 it('preserves published standings when a result is corrected',async()=>{
  const repository=()=>new PlatformRepository(client,sql);
  const before=await repository().standingSnapshots(tournamentId);expect(before).toHaveLength(1);expect(before[0].standings[0].totalPoints).toBe(14);
  const [r]=await sql`select *,team_id::text from aevic_platform.team_match_results where match_id=${matchId} and placement=1`;
  const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,actor));await next();});app.route('/',staffRoutes);
  const response=await app.request(`/admin/results/${r.id}/corrections`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':'fixture-result-correction'},body:JSON.stringify({expectedVersion:1,reason:'Fixture penalty correction with preserved prior standings.',result:{id:r.id,tournamentId,roundId:matchId,teamId:r.team_id,placement:1,finishes:4,placementPoints:10,finishPoints:4,penalties:1,totalPoints:13,published:true}})});
  expect(response.status).toBe(200);
  const after=await repository().standingSnapshots(tournamentId);expect(after).toHaveLength(2);expect(after[0]).toEqual(before[0]);expect(after[1].standings[0].totalPoints).toBe(13);
  const [version]=await sql`select version,result from aevic_platform.result_versions where result_id=${r.id}`;expect(version.version).toBe(1);expect(version.result.totalPoints).toBe(14);
 });
 it('isolates private records and rejects stale lifecycle updates',async()=>{
  await sql`insert into aevic_platform.support_tickets(user_id,category,subject,description) values(1,'technical','Private case','Team one confidential description')`;
  expect(await new PlatformRepository(client,sql,{teamId:'2'}).rows('support_tickets')).toEqual([]);
  expect(await new PlatformRepository(client,sql).rows('support_tickets')).toEqual([]);
  const teams=await new PlatformRepository(client,sql).teams();expect(JSON.stringify(teams)).not.toContain('@example.invalid');
  await expect(editTournament(sql,actor,tournamentId,{...input(),status:'completed',rounds:[{id:matchId,map:'Erangel',startsAt:at(40)}],expectedUpdatedAt:at(-1000)})).rejects.toMatchObject({code:'STALE_VERSION'});
 });
 it('serves recorded season summaries for original teams while disclosing incomplete legacy history',async()=>{
  const created=await createTournament(sql,actor,{...input(),rounds:[30,40,50,60].map(m=>({map:'Erangel' as const,startsAt:at(m)}))},'wrapped-original-team');
  await sql`update aevic.tournaments set status='ongoing' where id=${created.id}`;
  await sql`insert into aevic_platform.tournament_registrations(tournament_id,team_id,status,slot_number,roster_lock_at,roster) values(${created.id},1,'confirmed',1,now(),'[]')`;
  const rounds=await sql`select id from aevic.matches where tournament_id=${created.id} order by round`;
  const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql));await next();});app.route('/',publicRoutes);
  const before=(await new PlatformRepository(client,sql).history('1')).length;
  for(const r of rounds)await saveResults(sql,actor,r.id,[{tournamentId:created.id,roundId:r.id,teamId:'1',placement:1,finishes:4,placementPoints:0,finishPoints:0,totalPoints:0,penalties:0,published:false}]);
  for(const r of rounds.slice(0,3))await publishMatch(sql,actor,r.id);
  const response=await app.request('/teams/1/wrapped?year='+new Date().getUTCFullYear());expect(response.status).toBe(200);const summary=await response.json();
  expect(summary.historyIncomplete).toBe(true);expect(summary.available).toBe(true);expect(summary.matches).toBe(before+3);
  expect((await app.request('/public/teams/1/form')).status).toBe(200);
 });

 it('stores decoded support images privately and makes upload retries idempotent',async()=>{
  const [ticket]=await sql`insert into aevic_platform.support_tickets(user_id,category,subject,description) values(1,'technical','Attachment test','Private evidence in an isolated support ticket') returning id`;
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));await next();});app.route('/',communityRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:422));return app;};
  const image=await sharp({create:{width:200,height:100,channels:3,background:'#aabbcc'}}).png().toBuffer();
  const upload=(who:Actor,bytes=image,mime='image/png')=>{const form=new FormData();form.append('file',new File([new Uint8Array(bytes)],'evidence.png',{type:mime}));return appFor(who).request('/me/support/tickets/'+ticket.id+'/attachments',{method:'POST',body:form});};
  expect((await upload({teamId:'2'})).status).toBe(404);expect((await upload({teamId:'1'},Buffer.from('<svg/>'))).status).toBe(422);
  const first=await upload({teamId:'1'});expect(first.status).toBe(201);const file=await first.json();expect((await(await upload({teamId:'1'})).json()).id).toBe(file.id);
  expect((await appFor({teamId:'2'}).request(file.url.replace('/api',''))).status).toBe(404);
  expect((await appFor({...actor,role:'result-operator'}).request(file.url.replace('/api',''))).status).toBe(404);
  const download=await appFor({...actor,role:'support-moderator'}).request(file.url.replace('/api',''));expect(download.status).toBe(200);expect(download.headers.get('content-disposition')).toContain('attachment');expect(download.headers.get('cache-control')).toContain('no-store');expect((await sharp(Buffer.from(await download.arrayBuffer())).metadata()).format).toBe('webp');
  const own=await(await appFor({teamId:'1'}).request('/me/support/tickets/'+ticket.id)).json();expect(own.attachments).toHaveLength(1);
  await sql`update aevic_platform.support_tickets set status='closed' where id=${ticket.id}`;expect((await upload({teamId:'1'})).status).toBe(409);
 });

 it('persists message read state per account and denies foreign team messages',async()=>{
  const [m]=await sql`insert into aevic_platform.messages(team_id,author_id,title,body) values(1,${actor.adminId!},'Private team announcement','Synthetic announcement read state') returning id`;
  const appFor=(identity:Actor)=>{const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',new PlatformRepository(client,sql,identity));await next();});app.route('/',platformRoutes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'ERROR'},e instanceof ServiceError?e.status:500));return app;};
  expect((await appFor({teamId:'2'}).request('/me/messages/'+m.id+'/read',{method:'PUT'})).status).toBe(404);
  expect((await appFor({teamId:'1',accountId:'2'}).request('/me/messages/'+m.id+'/read',{method:'PUT'})).status).toBe(204);
  expect((await new PlatformRepository(client,sql,{teamId:'1',accountId:'2'}).messages('1')).find(x=>x.id===m.id)?.read).toBe(true);
  expect((await new PlatformRepository(client,sql,{teamId:'1',accountId:'1'}).messages('1')).find(x=>x.id===m.id)?.read).toBe(false);
  expect((await appFor({teamId:'1',accountId:'2'}).request('/me/messages/'+m.id+'/read',{method:'PUT'})).status).toBe(204);
  expect(await sql`select * from aevic_platform.message_reads where message_id=${m.id}`).toHaveLength(1);
 });

});
