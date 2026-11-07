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
