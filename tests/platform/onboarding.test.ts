import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import postgres from 'postgres';
import sharp from 'sharp';
import {createApp} from '../../server/app';
import {hashPassword} from '../../server/captain/crypto';
import {MailDeliveryError} from '../../server/emailDelivery';
import {processCommunicationEmail} from '../../server/platform/communication-email';
import {sendVerification} from '../../server/platform/email';
import type {ServerConfig} from '../../server/config';
vi.mock('../../server/platform/email',()=>({sendVerification:vi.fn().mockResolvedValue(undefined),sendTransactional:vi.fn().mockResolvedValue(undefined)}));
vi.mock('../../server/auth/google-provider',async original=>({...await original<typeof import('../../server/auth/google-provider')>(),exchangeGoogleCode:vi.fn().mockResolvedValue({subject:'isolated-google-onboarding',email:'google-onboarding@example.invalid',firstName:'Google',lastName:'Identity'})}));
const bin='/opt/homebrew/opt/postgresql@18/bin',database=`aevic_onboarding_${process.pid}`,gateway=`aevic_onboarding_gateway_${process.pid}`;
const command=(name:string,args:string[])=>execFileSync(`${bin}/${name}`,['-h','/tmp','-p','55432',...args],{stdio:'pipe'});
const sql=postgres({host:'/tmp',port:55432,database,max:3,prepare:false,onnotice:()=>{}});
const origin='http://localhost:8899';
const config:ServerConfig={automaticCommunicationsEnabled:true,supabaseUrl:'http://localhost:54321',publishableKey:'isolated',siteUrl:origin,secureCookies:false,databaseUrl:`postgres://${gateway}@127.0.0.1:55432/${database}`,sessionSecret:'isolated-onboarding-secret-00000000000000',emailFrom:'test@example.invalid',smtp:{host:'smtp.example.invalid',port:587,user:'fixture',pass:'fixture'},google:{clientId:'isolated',clientSecret:'isolated'}};
const app=createApp(config);
const cookies=(response:Response)=>response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
const request=(path:string,body?:unknown,cookie='',method=body===undefined?'GET':'POST',key?:string)=>app.request('/api'+path,{method,headers:{origin,'content-type':'application/json',cookie,...(key?{'idempotency-key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});
let spectator='',teamCookie='',teamAccount='',admin='',teamId='';
const teamDraft={teamName:'Onboarding Real Team',tag:'ORT',firstName:'Captain',lastName:'Identity',phone:'+994500000001',players:Array.from({length:5},(_,i)=>({ign:i===4?'':`Player ${i}`,uid:i===4?'':`100000${i}`,role:i===0?'captain':i===4?'substitute':'starter'}))};
beforeAll(async()=>{
 command('createdb',[database]);command('psql',['-d',database,'-v','ON_ERROR_STOP=1','-f','supabase/tests/bootstrap.sql','-f','tests/fixtures/original-platform.sql',...readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort().flatMap(x=>['-f',`supabase/migrations/${x}`])]);
 await sql.unsafe(`create role ${gateway} login nosuperuser bypassrls`);
 for(const schema of ['public','aevic','aevic_private','aevic_platform','storage']){await sql.unsafe(`grant usage on schema ${schema} to ${gateway}`);await sql.unsafe(`grant all on all tables in schema ${schema} to ${gateway}`);await sql.unsafe(`grant usage,select on all sequences in schema ${schema} to ${gateway}`);}
 await sql.unsafe(`grant aevic_communications_backend to ${gateway}`);
 await sql`select aevic_platform.set_communications_enabled(true)`;
 await sql`insert into aevic_platform.admin_accounts(email,password_hash,role) values('onboarding-admin@example.invalid',${await hashPassword('ValidPassword1')},'super-admin')`;
 const response=await request('/auth/admin/login',{email:'onboarding-admin@example.invalid',password:'ValidPassword1'});expect(response.status).toBe(200);admin=cookies(response);
});
afterAll(async()=>{await sql.end();command('dropdb',['--force',database]);command('psql',['-d','postgres','-c',`drop role if exists ${gateway}`]);});
it('creates an email spectator with a real session and no team or captain privileges',async()=>{
 const response=await request('/auth/register',{firstName:'Viewer',lastName:'Identity',email:'viewer@example.invalid',password:'ValidPassword1',purpose:'spectator',idempotencyKey:'spectator-account'});expect(response.status).toBe(201);spectator=cookies(response);
 expect(await response.json()).toMatchObject({role:'visitor',user:{onboarding:{purpose:'spectator',status:'complete'}}});
 expect(await sql`select id from public.teams`).toHaveLength(0);
 expect((await request('/me/onboarding',{purpose:'spectator',revision:0},spectator,'PUT')).status).toBe(200);
 expect(await sql`select id from aevic_platform.team_authority`).toHaveLength(0);
 expect((await request('/me/notification-preferences',{channels:{'in-app':true,email:false,push:false},events:{announcements:true}},spectator,'PUT')).status).toBe(200);
 expect(await (await request('/me/session',undefined,spectator)).json()).toMatchObject({role:'visitor'});
 expect((await request('/me/context',undefined,spectator)).status).toBe(409);
 expect((await request('/admin/tournaments',{},spectator)).status).toBe(403);
 const login=await request('/auth/login',{email:'viewer@example.invalid',password:'ValidPassword1'});expect(login.status).toBe(200);expect(await login.json()).toMatchObject({role:'visitor'});
});
it('persists team intent/drafts, rejects stale saves and enforces email and roster validation',async()=>{
 const response=await request('/auth/register',{firstName:'Captain',lastName:'Identity',email:'team-account@example.invalid',password:'ValidPassword1',purpose:'team',idempotencyKey:'team-account-create'});expect(response.status).toBe(201);teamCookie=cookies(response);teamAccount=(await response.json()).user.id;
 expect(await (await request('/me/onboarding',undefined,teamCookie)).json()).toMatchObject({purpose:'team',status:'team',revision:0});
 expect((await request('/me/onboarding',{purpose:'team',revision:0,draft:teamDraft},teamCookie,'PUT')).status).toBe(200);
 expect(await (await request('/me/onboarding',undefined,teamCookie)).json()).toMatchObject({draft:{teamName:teamDraft.teamName},revision:1});
 expect((await request('/me/onboarding',{purpose:'team',revision:0,draft:{}},teamCookie,'PUT')).status).toBe(409);
 expect((await request('/me/onboarding',{purpose:'team',revision:0,draft:{}},'','PUT')).status).toBe(401);
 expect((await request('/me/onboarding/team',teamDraft,teamCookie,'POST','setup-completion')).status).toBe(403);
 expect(await sql`select id from aevic_platform.communication_email where account_id=${teamAccount}`).toHaveLength(0);
 const delivery=vi.mocked(sendVerification).mock.calls.find(call=>call[1]==='team-account@example.invalid')!;
 const token=new URLSearchParams(new URL(delivery[2]).hash.slice(1)).get('token');expect(token).toBeTruthy();
 expect((await request('/auth/email-verification/confirm',{token},teamCookie)).status).toBe(204);
 const invalid={...teamDraft,players:teamDraft.players.map((p,i)=>i===1?{...p,uid:teamDraft.players[0].uid}:p)};
 expect((await request('/me/onboarding/team',invalid,teamCookie,'POST','invalid-setup-completion')).status).toBe(422);
 expect(await sql`select id from public.teams`).toHaveLength(0);
});
it('atomically completes a real team, assigns only its owner, and replays without duplicates',async()=>{
 const response=await request('/me/onboarding/team',teamDraft,teamCookie,'POST','setup-completion');expect(response.status).toBe(201);teamId=(await response.json()).teamId;
 expect(await (await request('/me/onboarding',undefined,teamCookie)).json()).toMatchObject({status:'complete',teamId,draft:{}});
 expect(await sql`select role from aevic_platform.team_authority where account_id=${teamAccount} and team_id=${teamId}`).toEqual([{role:'OWNER'}]);
 expect(await (await request('/me/session',undefined,teamCookie)).json()).toMatchObject({role:'captain',user:{teamId,onboarding:{status:'complete'}}});
 const replay=await request('/me/onboarding/team',teamDraft,teamCookie,'POST','setup-completion');expect(replay.status).toBe(201);expect(await replay.json()).toEqual({teamId});
 expect(await sql`select id from public.teams`).toHaveLength(1);
 expect(await sql`select id from aevic_platform.accounts where id=${teamId}`).toHaveLength(0);
 expect(await sql`select event_type,action_href from aevic_platform.notifications where recipient_id=${teamAccount} and system_key is not null order by event_type`)
   .toEqual([{event_type:'team-welcome',action_href:'/team/profile'},{event_type:'welcome',action_href:'/team/setup'}]);
 expect(await sql`select kind from aevic_platform.communication_email where account_id=${teamAccount}`).toEqual([{kind:'welcome'}]);
 expect((await request('/me/context',undefined,spectator)).status).toBe(409);
 expect((await request('/me/context',undefined,teamCookie)).status).toBe(200);
});
it('does not enroll existing accounts and supports a spectator opting into setup later',async()=>{
 const [legacy]=await sql`insert into aevic_platform.accounts(email,password_hash,captain_name,verification_required) values('existing@example.invalid',${await hashPassword('ValidPassword1')},'Existing Account',false) returning id::text`;
 const login=await request('/auth/login',{email:'existing@example.invalid',password:'ValidPassword1'});expect(login.status).toBe(200);expect(await login.json()).toMatchObject({user:{id:legacy.id,onboarding:{status:'complete'}}});
 const state=await request('/me/onboarding',{purpose:'team',revision:1},spectator,'PUT');expect(state.status).toBe(200);expect(await state.json()).toMatchObject({status:'team'});
});
it('keeps approval notifications and preferences attached to the standalone owner account',async()=>{
 expect((await request(`/admin/teams/${teamId}/approval`,{status:'approved'},admin,'PATCH')).status).toBe(200);
 const inbox=await (await request('/me/notifications',undefined,teamCookie)).json();expect(inbox.some((n:any)=>n.title==='Komanda statusu yeniləndi')).toBe(true);
 expect(await sql`select recipient_id::text from aevic_platform.notifications where title='Komanda statusu yeniləndi'`).toEqual([{recipient_id:teamAccount}]);
 const preferences={channels:{'in-app':false,email:false,push:false},events:{announcements:true}};
 expect((await request('/me/notification-preferences',preferences,teamCookie,'PUT')).status).toBe(200);
 expect(await sql`select user_id::text from aevic_platform.notification_preferences where user_id=${teamAccount}`).toHaveLength(1);
 expect((await request(`/admin/teams/${teamId}/approval`,{status:'approved'},admin,'PATCH')).status).toBe(200);
 expect(await sql`select id from aevic_platform.notifications where recipient_id=${teamAccount} and title='Komanda statusu yeniləndi'`).toHaveLength(1);
});
it('allows a spectator to join only through a real addressed invitation',async()=>{
 const invite=await request(`/teams/${teamId}/invitations`,{recipient:'viewer@example.invalid',role:'PLAYER'},teamCookie,'POST','invite-spectator');expect(invite.status).toBe(201);const invitation=await invite.json();
 const delivery=vi.mocked(sendVerification).mock.calls.find(call=>call[1]==='viewer@example.invalid')!;
 const token=new URLSearchParams(new URL(delivery[2]).hash.slice(1)).get('token');expect((await request('/auth/email-verification/confirm',{token},spectator)).status).toBe(204);
 expect((await request(`/team-invitations/${invitation.id}/response`,{response:'ACCEPTED'},spectator,'POST','accept-team-invitation')).status).toBe(200);
 expect(await (await request('/me/session',undefined,spectator)).json()).toMatchObject({role:'team',user:{teamId,onboarding:{status:'complete'}}});
 expect((await request(`/teams/${teamId}/invitations`,{recipient:'team-account@example.invalid',role:'MANAGER'},spectator,'POST','spectator-cannot-manage')).status).toBe(403);
});
it('registers through the existing rotating-token protocol without captain authority',async()=>{
 const tokenApp=createApp({...config,sessionMode:'tokens'});
 const response=await tokenApp.request('/api/auth/register',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({firstName:'Token',lastName:'Viewer',email:'token-viewer@example.invalid',password:'ValidPassword1',purpose:'spectator',idempotencyKey:'token-spectator-account'})});
 expect(response.status).toBe(201);const result=await response.json();expect(result).toMatchObject({role:'visitor',sessionMode:'tokens'});expect(result.accessToken).toMatch(/^v2\./);
 expect(response.headers.get('set-cookie')).toContain('aevic-refresh-v2=');
 const verified=await tokenApp.request('/api/me/session',{headers:{authorization:`Bearer ${result.accessToken}`}});expect(verified.status).toBe(200);expect(await verified.json()).toMatchObject({role:'visitor'});
 const delivery = vi.mocked(sendVerification).mock.calls.find(call => call[1] === 'token-viewer@example.invalid')!;
 const token = new URLSearchParams(new URL(delivery[2]).hash.slice(1)).get('token');
 const confirm = await request('/auth/email-verification/confirm',{token});
 expect(confirm.status).toBe(204);
 expect(await sql`select action_href, body from aevic_platform.notifications where recipient_id=${result.user.id} and event_type='welcome'`)
   .toEqual([{action_href:'/tournaments',body:expect.stringContaining('İzləyici')}]);
});
it('denies browser database roles direct access to onboarding and staged media',async()=>{
 for(const role of ['anon','authenticated'])for(const table of ['account_onboarding','tournament_banners'])await expect(sql.begin(async tx=>{await tx.unsafe(`set local role ${role}`);return tx.unsafe(`select * from aevic_platform.${table}`);})).rejects.toMatchObject({code:'42501'});
});
it('routes new Google users to purpose selection and existing Google users through login',async()=>{
 const signIn=async()=>{const start=await request('/auth/google/start',{}),cookie=cookies(start),url=new URL((await start.json()).url);return app.request('/api/auth/google/callback?state='+url.searchParams.get('state')+'&code=isolated',{headers:{cookie}});};
 const first=await signIn();expect(first.headers.get('location')).toBe('/account/onboarding');
 const session=await request('/me/session',undefined,cookies(first));expect(await session.json()).toMatchObject({role:'visitor',user:{email:'google-onboarding@example.invalid',firstName:'Google',onboarding:{status:'choice'}}});
 const second=await signIn();expect(second.headers.get('location')).toBe('/');
 const [google] = await sql`select id from aevic_platform.accounts where email='google-onboarding@example.invalid'`;
 expect(await sql`select event_type, action_href from aevic_platform.notifications where recipient_id=${google.id}`).toEqual([{event_type:'welcome',action_href:'/account/onboarding'}]);
 expect(await sql`select kind from aevic_platform.communication_email where account_id=${google.id}`).toEqual([{kind:'welcome'}]);
 expect(await sql`select id from public.teams`).toHaveLength(1);
});
it('keeps banner uploads private until publication and refreshes public data after replacement/removal',async()=>{
 const bytes=await sharp({create:{width:1920,height:600,channels:3,background:'#333333'}}).png().toBuffer();
 const upload=async(cookie:string)=>{const form=new FormData();form.set('file',new File([bytes],'banner.png',{type:'image/png'}));return app.request('/api/admin/tournament-banners',{method:'POST',headers:{origin,cookie},body:form});};
 expect((await upload('')).status).toBe(401);expect((await upload(spectator)).status).toBe(403);
 const uploaded=await upload(admin);expect(uploaded.status).toBe(201);const banner=await uploaded.json();
 expect((await request(banner.url.replace('/api',''))).status).toBe(404);
 expect((await request(banner.url.replace('/api',''),undefined,admin)).headers.get('cache-control')).toBe('private, no-store');
 const clock=Date.now();const time=(minutes:number)=>new Date(clock+minutes*60000).toISOString();
 const input={name:'Banner Tournament',shortName:'BT',description:'Public banner test',bannerMediaId:banner.id,startsAt:time(120),endsAt:time(180),registrationOpensAt:time(10),registrationDeadline:time(60),checkInOpensAt:time(60),checkInClosesAt:time(120),maxSlots:20,rules:[],rounds:[{map:'Erangel',startsAt:time(120)}]};
 const duplicateRounds={...input,rounds:[input.rounds[0],{map:'Miramar',startsAt:input.startsAt.replace('Z','+00:00')}]};expect((await request('/admin/tournaments',duplicateRounds,admin,'POST','duplicate-round-instants')).status).toBe(422);
 const create=await request('/admin/tournaments',input,admin,'POST','banner-tournament');expect(create.status).toBe(201);let t=await create.json();
 expect(await (await request('/tournaments')).json()).toEqual([]);
 expect((await request(banner.url.replace('/api',''))).status).toBe(404);
 const [round]=await sql`select id from aevic.matches where tournament_id=${t.id}`;
 const patch=async(bannerMediaId:string|null)=>request(`/admin/tournaments/${t.id}`,{...input,bannerMediaId,status:'published',expectedUpdatedAt:t.updatedAt,rounds:[{...input.rounds[0],id:round.id}]},admin,'PATCH',crypto.randomUUID());
 let response=await patch(banner.id);expect(response.status).toBe(200);t=await response.json();
 const image=await request(banner.url.replace('/api',''));expect(image.status).toBe(200);
 expect((await app.request(banner.url,{headers:{'if-none-match':image.headers.get('etag')!}})).status).toBe(304);
 expect((await (await request('/tournaments')).json())[0].bannerUrl).toBe(banner.url);
 const replacement=await (await upload(admin)).json();response=await patch(replacement.id);expect(response.status).toBe(200);t=await response.json();
 expect((await (await request('/tournaments')).json())[0].bannerUrl).toBe(replacement.url);
 expect((await request(banner.url.replace('/api',''))).status).toBe(404);
 response=await patch(null);expect(response.status).toBe(200);t=await response.json();
 expect((await (await request('/tournaments')).json())[0].bannerUrl).toBeUndefined();
 expect((await request(replacement.url.replace('/api',''))).status).toBe(404);
 expect((await patch(crypto.randomUUID())).status).toBe(422);
});
it('rejects invalid image bytes and cross-origin onboarding writes',async()=>{
 const form=new FormData();form.set('file',new File(['not a png'],'invalid.png',{type:'image/png'}));
 expect((await app.request('/api/admin/tournament-banners',{method:'POST',headers:{origin,cookie:admin},body:form})).status).toBe(422);
 expect((await app.request('/api/me/onboarding',{method:'PUT',headers:{origin:'https://other.invalid','content-type':'application/json',cookie:spectator},body:'{"purpose":"team","revision":1}'})).status).toBe(403);
});

it('uses prior activity across devices and deduplicates concurrent returns', async () => {
 const [account] = await sql`insert into aevic_platform.accounts(email,password_hash,captain_name)
   values('returning@example.invalid','test','Ayla Viewer') returning id`;
 const session = () => sql`insert into aevic_platform.sessions(token_digest,team_id,expires_at)
   values(${crypto.randomUUID()},${account.id},now()+interval '8 hours')`;
 const returns = () => sql`select body,action_href from aevic_platform.notifications where recipient_id=${account.id} and event_type='welcome-back'`;
 await session();
 await sql`update aevic_platform.sessions set last_active_at=now()-interval '29 days' where team_id=${account.id}`;
 await session();
 expect(await returns()).toHaveLength(0);
 await sql`update aevic_platform.sessions set last_active_at=now()-interval '31 days' where team_id=${account.id}`;
 await Promise.all([session(),session()]);
 await session();
 expect(await returns()).toEqual([{body:expect.stringContaining('Ayla'),action_href:'/tournaments'}]);
 await sql`update aevic_platform.communication_rules set enabled=false where kind='welcome-back'`;
 await sql`update aevic_platform.sessions set last_active_at=now()-interval '32 days' where team_id=${account.id}`;
 await session();
 expect(await returns()).toHaveLength(1);
});

it('retries definite temporary mail failures and holds ambiguous sends for inspection', async () => {
 // Other test cases established their own accounts. Isolate this worker run.
 await sql`update aevic_platform.communication_email set next_attempt_at=now()+interval '1 day' where status='pending'`;
 const [account] = await sql`insert into aevic_platform.accounts(email,password_hash,captain_name,email_verified_at)
   values('dispatch@example.invalid','test','Ayla <Captain>',now()) returning id`;
 const row = async () => (await sql`select status,attempts from aevic_platform.communication_email where account_id=${account.id}`)[0];
 const due = () => sql`update aevic_platform.communication_email set next_attempt_at=now() where account_id=${account.id}`;
 const send = vi.fn<typeof import('../../server/emailDelivery').sendTransactional>()
   .mockRejectedValueOnce(new MailDeliveryError('retry')).mockResolvedValue(undefined);
 await processCommunicationEmail(sql,config,send);
 expect(await row()).toEqual({status:'retry',attempts:1});
 await processCommunicationEmail(sql,config,send);
 expect(send).toHaveBeenCalledTimes(1);
 await due();
 await Promise.all([processCommunicationEmail(sql,config,send),processCommunicationEmail(sql,config,send)]);
 expect(await row()).toEqual({status:'sent',attempts:2});
 expect(send).toHaveBeenCalledTimes(2);
 expect(send.mock.calls[1][1]).toBe('dispatch@example.invalid');
 expect(send.mock.calls[1][2]).toMatchObject({text:expect.stringContaining('Ayla <Captain>'),html:expect.stringContaining('Ayla &lt;Captain&gt;'),messageId:send.mock.calls[0][2].messageId});
 await sql`update aevic_platform.communication_email set status='sending',updated_at=now()-interval '11 minutes' where account_id=${account.id}`;
 await processCommunicationEmail(sql,config,send);
 expect(await row()).toEqual({status:'uncertain',attempts:2});
 expect(send).toHaveBeenCalledTimes(2);
 await sql`update aevic_platform.communication_email set status='retry', attempts=3 where account_id=${account.id}`;
 send.mockRejectedValueOnce(new MailDeliveryError('retry'));
 await processCommunicationEmail(sql,config,send);
 await processCommunicationEmail(sql,config,send);
 expect(await row()).toEqual({status:'failed',attempts:4});
 expect(send).toHaveBeenCalledTimes(3);
});

it('sends the official champion email only to current verified team leadership', async () => {
 const [tournament] = await sql`insert into aevic.tournaments(slug,name,short_name,status,starts_at,ends_at,registration_opens_at,
   registration_deadline,check_in_opens_at,check_in_closes_at,max_slots) values('email-cup','Email Cup','Cup','completed',
   now()-interval '2 hours',now()-interval '1 hour',now()-interval '2 days',now()-interval '1 day',
   now()-interval '4 hours',now()-interval '3 hours',4) returning id`;
 const [round] = await sql`insert into aevic.matches(tournament_id,round,map,scheduled_at,room_release_at,status,published_at)
   values(${tournament.id},1,'Erangel',now()-interval '2 hours',now()-interval '3 hours','completed',now()) returning id`;
 const publish = (id: string) => sql`insert into aevic_platform.leaderboard_snapshots(tournament_id,match_id,reason,standings)
   values(${tournament.id},${round.id},'correction',${sql.json([{teamId:id,rank:1,totalPoints:20}])})`;
 await publish(teamId);
 await sql`delete from aevic_platform.notification_preferences where user_id=${teamAccount}`;
 const enqueue = (key: string) => sql`select aevic_platform.emit_communication('champion',${key},null,${teamId},${tournament.id},
   ${sql.json({winnerName:'Onboarding Real Team',tournamentName:'Email Cup',contextUrl:'/tournaments/'+tournament.id})})`;
 await enqueue('champion-smtp-test');
 await enqueue('champion-smtp-test');
 expect(await sql`select account_id::text from aevic_platform.communication_email where event_key='champion-smtp-test'`).toEqual([{account_id:teamAccount}]);
 const send = vi.fn<typeof import('../../server/emailDelivery').sendTransactional>().mockResolvedValue(undefined);
 await processCommunicationEmail(sql,config,send);
 expect(send).toHaveBeenCalledTimes(1);
 expect(send.mock.calls[0][1]).toBe('team-account@example.invalid');
 expect(send.mock.calls[0][2].text).toContain('Email Cup');
 expect(send.mock.calls[0][2].html).toContain('/tournaments/'+tournament.id);
 await enqueue('champion-stale-test');
 await publish('987654321');
 await processCommunicationEmail(sql,config,send);
 expect(send).toHaveBeenCalledTimes(1);
 expect(await sql`select status from aevic_platform.communication_email where event_key='champion-stale-test'`).toEqual([{status:'skipped'}]);
});

it('welcomes a returning existing session before its prior activity is overwritten', async () => {
 await sql`update aevic_platform.communication_rules set enabled=true where kind='welcome-back'`;
 const [account]=await sql`insert into aevic_platform.accounts(email,password_hash,captain_name)
   values('returning-session@example.invalid','test','Returning Viewer') returning id`;
 const [session]=await sql`insert into aevic_platform.sessions(token_digest,team_id,expires_at)
   values(${crypto.randomUUID()},${account.id},now()+interval '1 day') returning id`;
 await sql`update aevic_platform.sessions set last_active_at=now()-interval '31 days' where id=${session.id}`;
 await sql`update aevic_platform.sessions set last_active_at=now() where id=${session.id}`;
 await sql`update aevic_platform.sessions set last_active_at=now() where id=${session.id}`;
 expect(await sql`select event_type from aevic_platform.notifications where recipient_id=${account.id}`)
   .toEqual([{event_type:'welcome-back'}]);
});

it('keeps database triggers and workers idle until activation and discards rollout backlog',async()=>{
 await sql`select aevic_platform.set_communications_enabled(false)`;
 const [account]=await sql`insert into aevic_platform.accounts(email,password_hash,email_verified_at)
   values('disabled-rollout@example.invalid','test',now()) returning id`;
 const [session]=await sql`insert into aevic_platform.sessions(token_digest,team_id,expires_at,last_active_at)
   values(${crypto.randomUUID()},${account.id},now()+interval '1 day',now()-interval '31 days') returning id`;
 await sql`update aevic_platform.sessions set last_active_at=now() where id=${session.id}`;
 expect(await sql`select id from aevic_platform.notifications where recipient_id=${account.id}`).toHaveLength(0);
 expect(await sql`select id from aevic_platform.communication_email where account_id=${account.id}`).toHaveLength(0);
 // Simulate an old queue row from an earlier release, without any SMTP call.
 const [old]=await sql`insert into aevic_platform.communication_email(kind,event_key,account_id,title,body,href)
   values('welcome','rollout-old',${account.id},'Old','Old','/tournaments') returning id`;
 const send=vi.fn().mockResolvedValue(undefined);
 await processCommunicationEmail(sql,config,send);
 expect(send).not.toHaveBeenCalled();
 expect((await sql`select status from aevic_platform.communication_email where id=${old.id}`)[0].status).toBe('pending');
 await sql`select aevic_platform.set_communications_enabled(true)`;
 expect((await sql`select status from aevic_platform.communication_email where id=${old.id}`)[0].status).toBe('skipped');
 await sql`insert into aevic_platform.accounts(email,password_hash,email_verified_at)
   values('enabled-rollout@example.invalid','test',now())`;
 await processCommunicationEmail(sql,config,send);
 expect(send).toHaveBeenCalledTimes(1);
 expect(send.mock.calls[0][1]).toBe('enabled-rollout@example.invalid');
});

it('isolates automation failures from account verification, sessions and team audit writes',async()=>{
 await sql`alter function aevic_platform.emit_communication(text,text,bigint,bigint,uuid,jsonb) rename to unavailable_communication`;
 try {
  const [a]=await sql`insert into aevic_platform.accounts(email,password_hash) values('failure-rollout@example.invalid','test') returning id`;
  await sql`update aevic_platform.accounts set email_verified_at=now() where id=${a.id}`;
  const [s]=await sql`insert into aevic_platform.sessions(token_digest,team_id,expires_at,last_active_at)
    values(${crypto.randomUUID()},${a.id},now()+interval '1 day',now()-interval '31 days') returning id`;
  await sql`update aevic_platform.sessions set last_active_at=now() where id=${s.id}`;
  await sql`insert into aevic_platform.audit_events(actor_id,action,entity_type,entity_id)
    values('test','account.team-setup','team',${teamId})`;
  expect((await sql`select email_verified_at from aevic_platform.accounts where id=${a.id}`)[0].email_verified_at).toBeTruthy();
 } finally {
  await sql`alter function aevic_platform.unavailable_communication(text,text,bigint,bigint,uuid,jsonb) rename to emit_communication`;
 }
 const stranger=`notification_only_${process.pid}`;
 await sql.unsafe(`create role ${stranger} nologin`);
 try {
  await sql.unsafe(`grant usage on schema aevic_platform to ${stranger}`);
  await sql.unsafe(`grant insert on aevic_platform.notifications to ${stranger}`);
  const [p]=await sql`select has_table_privilege(${stranger},'aevic_platform.communication_email','INSERT') as outbox,
    has_table_privilege(${stranger},'aevic_platform.communication_rules','UPDATE') as rules,
    has_function_privilege('aevic_communications_backend','aevic_platform.set_communications_enabled(boolean)','EXECUTE') as activation`;
  expect(p).toEqual({outbox:false,rules:false,activation:false});
 } finally {
  await sql.unsafe(`revoke insert on aevic_platform.notifications from ${stranger}`);
  await sql.unsafe(`revoke usage on schema aevic_platform from ${stranger}`);
  await sql.unsafe(`drop role ${stranger}`);
 }
});
