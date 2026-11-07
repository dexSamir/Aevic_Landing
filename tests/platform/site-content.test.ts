import {beforeAll,afterAll,it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import postgres from 'postgres';
import sharp from 'sharp';
import {createApp} from '../../server/app';
import {hashPassword} from '../../server/captain/crypto';
import type {ServerConfig} from '../../server/config';
const bin='/opt/homebrew/opt/postgresql@18/bin',database=`aevic_cms_${process.pid}`,gateway=`aevic_cms_gateway_${process.pid}`;
const command=(name:string,args:string[])=>execFileSync(`${bin}/${name}`,['-h','/tmp','-p','55432',...args],{stdio:'pipe'});
const sql=postgres({host:'/tmp',port:55432,database,max:3,prepare:false,onnotice:()=>{}});
const origin='http://localhost:8899';
const config:ServerConfig={supabaseUrl:'http://localhost:54321',publishableKey:'isolated',siteUrl:origin,secureCookies:false,databaseUrl:`postgres://${gateway}@127.0.0.1:55432/${database}`,sessionSecret:'isolated-onboarding-secret-00000000000000',emailFrom:'test@example.invalid',smtp:{host:'smtp.example.invalid',port:587,user:'fixture',pass:'fixture'},google:{clientId:'isolated',clientSecret:'isolated'}};
const app=createApp(config);
const cookies=(response:Response)=>response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
const request=(path:string,body?:unknown,cookie='',method=body===undefined?'GET':'POST',key?:string)=>app.request('/api'+path,{method,headers:{origin,'content-type':'application/json',cookie,...(key?{'idempotency-key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});
let admin='';
beforeAll(async()=>{
 command('createdb',[database]);command('psql',['-d',database,'-v','ON_ERROR_STOP=1','-f','supabase/tests/bootstrap.sql','-f','tests/fixtures/original-platform.sql',...readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort().flatMap(x=>['-f',`supabase/migrations/${x}`])]);
 await sql.unsafe(`create role ${gateway} login nosuperuser bypassrls`);
 for(const schema of ['public','aevic','aevic_private','aevic_platform','storage']){await sql.unsafe(`grant usage on schema ${schema} to ${gateway}`);await sql.unsafe(`grant all on all tables in schema ${schema} to ${gateway}`);await sql.unsafe(`grant usage,select on all sequences in schema ${schema} to ${gateway}`);}
 await sql`insert into aevic_platform.admin_accounts(email,password_hash,role) values('onboarding-admin@example.invalid',${await hashPassword('ValidPassword1')},'super-admin')`;
 const response=await request('/auth/admin/login',{email:'onboarding-admin@example.invalid',password:'ValidPassword1'});expect(response.status).toBe(200);admin=cookies(response);
});
afterAll(async()=>{await sql.end();command('dropdb',['--force',database]);command('psql',['-d','postgres','-c',`drop role if exists ${gateway}`]);});
it('preserves published content and stored drafts/history while retiring all editor endpoints',async()=>{
 const record={revision:7,draft:{fields:{'hero.title':'Private draft'},order:[]},published:{fields:{'hero.title':'Published stage','calendar.visible':false},order:['teams','calendar','maps','join']},history:[{by:'private-admin',document:{fields:{secret:'private revision'}}}]};
 await sql`insert into aevic_platform.settings(key,value) values('site:home',${sql.json(record)})`;
 const response=await request('/public/site-content');
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('must-revalidate');
 expect(await response.json()).toEqual({home:record.published});
 expect((await app.request('/api/public/site-content',{headers:{'if-none-match':response.headers.get('etag')!}})).status).toBe(304);
 for(const path of ['/admin/site-content','/admin/site-content-media'])expect((await request(path,undefined,admin)).status).toBe(404);
 expect((await request('/admin/site-content/home',{revision:7,document:{fields:{},order:[]},action:'publish'},admin,'PUT')).status).toBe(404);
 expect((await sql`select value from aevic_platform.settings where key='site:home'`)[0].value).toEqual(record);
 // Required platform settings and the audit journal remain available.
 expect((await request('/admin/settings',undefined,admin)).status).toBe(200);
 expect((await request('/admin/audit',undefined,admin)).status).toBe(200);
});
it('continues serving already published media without exposing draft-only images',async()=>{
 const bytes=await sharp({create:{width:32,height:16,channels:3,background:'#a89460'}}).png().toBuffer();
 async function upload(){const form=new FormData();form.set('file',new File([new Uint8Array(bytes)],'banner.png',{type:'image/png'}));const response=await app.request('/api/admin/tournament-banners',{method:'POST',headers:{cookie:admin,origin},body:form});expect(response.status).toBe(201);return response.json();}
 const published=await upload(),draft=await upload();
 const record={revision:8,draft:{fields:{'hero.media':draft.id},order:[]},published:{fields:{'hero.media':published.id},order:[]},history:[]};
 await sql`update aevic_platform.settings set value=${sql.json(record)} where key='site:home'`;
 const response=await request(published.url.slice(4));expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('image/webp');
 expect((await request(draft.url.slice(4))).status).toBe(404);
 expect((await (await request('/public/site-content')).json()).home).toEqual(record.published);
});
it('filters malformed public documents and unsafe links and preserves browser storage permissions',async()=>{
 await sql`insert into aevic_platform.settings(key,value) values('site:terms',${sql.json({published:{fields:{'section-0.body':'<script>alert(1)</script>',href:'javascript:alert(1)','hero.media':'bad-id'},order:['section-0']}})})`;
 await sql`insert into aevic_platform.settings(key,value) values('site:unknown',${sql.json({published:{fields:{title:'Unknown'},order:[]}})}),('site:support',${sql.json({published:{fields:[]}})})`;
 const pages=await (await request('/public/site-content')).json();expect(pages.terms).toEqual({fields:{'section-0.body':'<script>alert(1)</script>'},order:['section-0']});expect(pages.unknown).toBeUndefined();expect(pages.support).toBeUndefined();
 for(const role of ['anon','authenticated']){let denied=false;try{await sql.begin(async tx=>{await tx.unsafe(`set local role ${role}`);await tx`select * from aevic_platform.settings where key like 'site:%'`;});}catch{denied=true;}expect(denied).toBe(true);}
});

it('publishes only validated brand settings and media through super-admin authority',async()=>{
 const initial=await (await request('/admin/settings/branding',undefined,admin)).json();
 const path='/admin/settings/branding';
 const image=await sharp({create:{width:48,height:48,channels:3,background:'#b39655'}}).png().toBuffer();
 async function upload(cookie:string,bytes:Uint8Array){const form=new FormData();form.set('file',new File([new Uint8Array(bytes)],'logo.png',{type:'image/png'}));return app.request('/api'+path+'/images',{method:'POST',headers:{origin,cookie},body:form});}
 expect((await upload('',image)).status).toBe(401);
 expect((await upload(admin,new Uint8Array([0,1,2]))).status).toBe(422);
 const staged=await upload(admin,image);expect(staged.status).toBe(201);
 const asset=await staged.json();expect((await request(asset.url.slice(4))).status).toBe(404);
 const draft={...initial,name:'AEVIC Arena',assets:{logo:asset.id},links:{header:[{label:'Arena',href:'/matches',visible:true}]}};
 for(const href of ['javascript:alert(1)','//instagram.com','/admin/settings','https://instagram.com.evil.test/','https://user@youtube.com','/\\evil.test','https://example.invalid/']){
  expect((await request(path,{...draft,links:{footer:[{href,label:'Link',visible:true}]}},admin,'PUT')).status).toBe(422);
 }
 expect((await request(path,draft,'','PUT')).status).toBe(401);
 expect((await request(path,draft,admin,'PUT')).status).toBe(200);
 expect((await request(path,draft,admin,'PUT')).status).toBe(409);
 expect(await (await request('/public/settings')).json()).toMatchObject({branding:{name:draft.name,assets:draft.assets,links:draft.links,revision:1}});
 expect((await request(asset.url.slice(4))).status).toBe(200);
 expect((await request(path,{...draft,assets:{},revision:1},admin,'PUT')).status).toBe(200);
 expect((await request(asset.url.slice(4))).status).toBe(404);
});

it('snapshots sender and team audience, delivers once and isolates individual reads across workspaces',async()=>{
 const hash=await hashPassword('ValidPassword1');
 const [moderator]=await sql`insert into aevic_platform.admin_accounts(email,password_hash,role) values('mod@example.invalid',${hash},'support-moderator') returning id`;
 const mod=cookies(await request('/auth/admin/login',{email:'mod@example.invalid',password:'ValidPassword1'}));
 const alias='/admin/profile/alias';
 expect((await request(alias,{alias:'Marshal'},mod,'PUT')).status).toBe(200);
 expect((await request(alias,{alias:'MARSHAL'},admin,'PUT')).status).toBe(409);
 expect((await request(alias,{alias:'a'},mod,'PUT')).status).toBe(422);
 expect((await request('/admin/settings/branding',undefined,mod)).status).toBe(403);
 for(const [id,status] of [[11,'approved'],[12,'pending'],[13,'banned'],[14,'rejected'],[15,'approved']] as const){
  await sql`insert into public.teams(id,team_name,captain_name,captain_contact,email,password_hash,player1_ign,player2_ign,player3_ign,player4_ign,status)
   values(${id},${'Arena '+id},'Owner','contact',${id+'@example.invalid'},${hash},'P1','P2','P3','P4',${status})`;
  await sql`insert into aevic_platform.accounts(id,original_team_id,verification_required) values(${id},${id},false)`;
  await sql`insert into aevic_platform.team_authority(team_id,account_id,role) values(${id},${id},'OWNER')`;
 }
 await sql`insert into aevic_platform.team_details(team_id,archived_at) values(15,now())`;
 async function login(email:string){const result=await request('/auth/login',{email,password:'ValidPassword1'});expect(result.status).toBe(200);return cookies(result);}
 const teamA=await login('11@example.invalid'),teamB=await login('12@example.invalid');
 const [viewer]=await sql`insert into aevic_platform.accounts(email,password_hash,verification_required) values('fan@example.invalid',${hash},false) returning id`;
 const fan=await login('fan@example.invalid');
 expect((await request(alias,{alias:'usurp'},teamA,'PUT')).status).toBe(403);
 const recipients=await (await request('/admin/messages/recipients',undefined,mod)).json();
 expect(recipients.map((team:{id:string})=>team.id)).toEqual(['11','12']);
 const input={title:'Final briefing',body:'Check the rules.',audience:'team',teamId:'11',severity:'critical',expectedCount:1};
 const send=(payload:unknown,key:string)=>request('/admin/messages',payload,mod,'POST',key);
 expect((await send({...input,authorId:moderator.id},'spoof-key')).status).toBe(422);
 expect((await send({...input,teamId:'13'},'banned-team')).status).toBe(409);
 const replay=await Promise.all([send(input,'private-team'),send(input,'private-team')]);
 expect(replay.map(r=>r.status)).toEqual([200,200]);
 const message=await replay[0].json();expect(await replay[1].json()).toEqual(message);
 expect((await send({...input,title:'Changed'},'private-team')).status).toBe(409);
 expect((await request(alias,{alias:'Referee'},mod,'PUT')).status).toBe(200);
 const broadcast=await send({title:'All teams',body:'Ready',audience:'all',severity:'info',expectedCount:2},'broadcast-all');
 expect(broadcast.status).toBe(200);expect((await broadcast.json()).recipientCount).toBe(2);
 const list=async(path:string,cookie:string)=>(await request(path,undefined,cookie)).json();
 const messages=await list('/me/messages',teamA);
 expect(messages).toContainEqual(expect.objectContaining({id:message.id,senderAlias:'Marshal',recipientCount:1,deliveryCount:1,read:false}));
 expect(await list('/me/messages',teamB)).toHaveLength(1);
 expect((await request('/me/messages',undefined,fan)).status).toBe(403);
 expect(await list('/me/notifications',fan)).toHaveLength(0);
 const privateNotice=(await list('/me/notifications',teamA)).find((n:{title:string})=>n.title===input.title);
 expect(privateNotice).toMatchObject({senderAlias:'Marshal',severity:'critical',read:false});
 expect((await request('/me/notifications/'+privateNotice.id+'/read',{},teamB,'PUT')).status).toBe(404);
 expect((await request('/me/messages/'+message.id+'/read',{},teamB,'PUT')).status).toBe(404);
 expect((await request('/me/notifications/'+privateNotice.id+'/read',{},teamA,'PUT')).status).toBe(204);
 expect(await list('/me/messages',teamA)).toContainEqual(expect.objectContaining({id:message.id,read:true}));
 expect((await request('/me/notifications/'+privateNotice.id+'/read',undefined,teamA,'DELETE')).status).toBe(204);
 expect(await list('/me/messages',teamA)).toContainEqual(expect.objectContaining({id:message.id,read:false}));
 expect((await request('/me/messages/'+message.id+'/read',{},teamA,'PUT')).status).toBe(204);
 const all=messages.find((m:{audience:string})=>m.audience==='all');
 expect((await request('/me/messages/'+all.id+'/read',{},teamA,'PUT')).status).toBe(204);
 expect((await list('/me/notifications',teamA)).every((n:{read:boolean})=>n.read)).toBe(true);
 expect(await list('/me/messages',teamB)).toContainEqual(expect.objectContaining({id:all.id,read:false}));
 await sql`insert into aevic_platform.team_authority(team_id,account_id,role) values(11,${viewer.id},'PLAYER')`;
 expect(await list('/me/messages',fan)).toContainEqual(expect.objectContaining({id:message.id,read:false}));
 expect((await request('/me/messages/'+message.id+'/read',{},fan,'PUT')).status).toBe(204);
 await sql`delete from aevic_platform.team_authority where account_id=11`;
 expect(await list('/me/notifications',teamA)).toHaveLength(0);
 expect(await sql`select author_id from aevic_platform.messages where id=${message.id}`).toMatchObject([{author_id:moderator.id}]);
 expect(await sql`select actor_id from aevic_platform.audit_events where action='message.send' and entity_id=${message.id}`).toMatchObject([{actor_id:'admin:'+moderator.id}]);
});
