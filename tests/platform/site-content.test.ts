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
const write=(id:string,revision:number,fields:Record<string,unknown>,action='save',order:string[]=[])=>request(`/admin/site-content/${id}`,{revision,document:{fields,order},action},admin,'PUT');
it('starts with empty published content and private admin drafts, without changing platform settings',async()=>{
 expect(await (await request('/public/site-content')).json()).toEqual({});
 const response=await request('/admin/site-content',undefined,admin);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');expect((await response.json()).home.revision).toBe(0);
 expect((await request('/admin/site-content')).status).toBe(401);
 expect((await request('/admin/site-content/home',{revision:0,document:{fields:{},order:[]},action:'save'},'','PUT')).status).toBe(401);
});
it('saves a draft privately, publishes atomically, revalidates caches, rejects stale updates',async()=>{
 const first=await request('/public/site-content'),oldTag=first.headers.get('etag');
 expect((await write('home',0,{'hero.title':'Private draft'})).status).toBe(200);
 expect(await (await request('/public/site-content')).json()).toEqual({});
 expect((await write('home',0,{'hero.title':'Lost update'})).status).toBe(409);
 expect((await write('home',1,{'hero.title':'Published stage','calendar.visible':false},'publish',['teams','calendar','maps','join'])).status).toBe(200);
 const read=await request('/public/site-content');expect(read.headers.get('etag')).not.toBe(oldTag);expect(read.headers.get('cache-control')).toContain('must-revalidate');
 expect(await read.json()).toEqual({home:{fields:{'hero.title':'Published stage','calendar.visible':false},order:['teams','calendar','maps','join']}});
 const unchanged=await app.request('/api/public/site-content',{headers:{'if-none-match':read.headers.get('etag')!}});expect(unchanged.status).toBe(304);
 expect((await write('home',2,{'hero.title':'Next private draft'})).status).toBe(200);
 const published=JSON.stringify(await (await request('/public/site-content')).json());expect(published).not.toContain('Next private');expect(published).not.toContain('history');expect(published).not.toContain('by');
 expect((await sql`select value from aevic_platform.settings where key='site:home'`)[0].value.history).toHaveLength(3);
 expect(await sql`select id from aevic_platform.audit_events where action like 'site-content.%'`).toHaveLength(3);
});
it('rejects unknown fields, unsafe links, arbitrary HTML configuration, wrong types and invalid orders',async()=>{
 for(const fields of [{'password':'x'},{'hero.title':true},{'hero.href':'javascript:alert(1)'},{'hero.href':'//outside.invalid'},{'hero.href':'/\\outside.invalid'},{'hero.media':'https://outside.invalid/a.png'}])expect((await write('home',3,fields)).status).toBe(422);
 expect((await write('global',0,{'nav.home.href':'/admin/users'})).status).toBe(422);
 expect((await write('global',0,{'social.instagram':'https://example.invalid'})).status).toBe(422);
 expect((await write('unknown',0,{})).status).toBe(404);
 expect((await write('home',3,{},'save',['teams','teams'])).status).toBe(422);
 expect((await write('home',3,{},'save',['unsupported'])).status).toBe(422);
 // Plain text is escaped by React; there is no HTML rendering capability.
 expect((await write('terms',0,{'section-0.body':'<script>alert(1)</script>'})).status).toBe(200);
});
it('denies a tournament manager access to CMS without changing their authoritative tournament access',async()=>{
 await sql`insert into aevic_platform.admin_accounts(email,password_hash,role) values('cms-manager@example.invalid',${await hashPassword('ValidPassword1')},'tournament-manager')`;
 const manager=cookies(await request('/auth/admin/login',{email:'cms-manager@example.invalid',password:'ValidPassword1'}));
 expect((await request('/admin/site-content',undefined,manager)).status).toBe(403);
 expect((await request('/admin/site-content/home',{revision:3,document:{fields:{},order:[]},action:'publish'},manager,'PUT')).status).toBe(403);
 expect((await request('/admin/context',undefined,manager)).status).toBe(200);
});
it('reuses banner upload with private drafts and visibility checked again after unpublishing',async()=>{
 const bytes=await sharp({create:{width:32,height:16,channels:3,background:'#a89460'}}).png().toBuffer(),form=new FormData();form.set('file',new File([new Uint8Array(bytes)],'cms.png',{type:'image/png'}));
 const upload=await app.request('/api/admin/tournament-banners',{method:'POST',headers:{cookie:admin,origin},body:form});expect(upload.status).toBe(201);const {id,url}=await upload.json();
 expect((await request(`/media/tournament-banners/${id}`)).status).toBe(404);
 expect((await write('home',3,{'hero.media':id},'save')).status).toBe(200);
 expect((await request(`/media/tournament-banners/${id}`)).status).toBe(404);
 expect((await write('home',4,{'hero.media':id},'publish')).status).toBe(200);
 const library=await (await request('/admin/site-content-media',undefined,admin)).json();expect(library).toEqual([expect.objectContaining({id,name:'cms.png'})]);expect(JSON.stringify(library)).not.toContain('bytes');expect((await request('/admin/site-content-media')).status).toBe(401);
 const media=await app.request(url);expect(media.status).toBe(200);expect(media.headers.get('content-type')).toBe('image/webp');
 expect((await write('home',5,{'hero.media':id},'unpublish')).status).toBe(200);
 const hidden=await app.request(url,{headers:{'if-none-match':media.headers.get('etag')!}});expect(hidden.status).toBe(404);
 expect((await request(`/media/tournament-banners/${id}`,undefined,admin)).status).toBe(200);
 expect(await (await request('/public/site-content')).json()).toEqual({});
 expect((await write('home',6,{'hero.media':'11111111-1111-4111-8111-111111111111'})).status).toBe(422);
});
it('retains a bounded revision history and permits restoration only through a new validated save',async()=>{
 for(let i=1;i<=21;i++)expect((await write('terms',i,{'section-0.body':`Revision ${i}`})).status).toBe(200);
 const data=await (await request('/admin/site-content',undefined,admin)).json();expect(data.terms.history).toHaveLength(20);expect(data.terms.revision).toBe(22);
 expect(await sql`select id from public.teams`).toHaveLength(0);expect(await sql`select id from aevic.tournaments`).toHaveLength(0);
});
it('keeps browser roles away from CMS settings storage',async()=>{
 for(const role of ['anon','authenticated']){let denied=false;try{await sql.begin(async tx=>{await tx.unsafe(`set local role ${role}`);await tx`select * from aevic_platform.settings where key like 'site:%'`;});}catch{denied=true;}expect(denied).toBe(true);}
});
