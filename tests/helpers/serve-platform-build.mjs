// Real application + disposable local PostgreSQL. Never accepts a database URL.
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createServer as createVite} from 'vite';
import {serve} from '@hono/node-server';
import postgres from 'postgres';
const bin='/opt/homebrew/opt/postgresql@18/bin',database=`aevic_browser_${process.pid}`,role=`aevic_browser_role_${process.pid}`;
const port=4194,origin=`http://127.0.0.1:${port}`,root=resolve('dist');
const command=(name,args)=>execFileSync(`${bin}/${name}`,['-h','/tmp','-p','55432',...args],{stdio:'pipe'});
const sql=postgres({host:'/tmp',port:55432,database,max:2,prepare:false,onnotice:()=>{}});
const mail=[];
// Only the external delivery boundary is intercepted; token creation/consumption stays real.
globalThis.fetch=async(input,init)=>{if(String(input)!=='https://api.resend.com/emails')throw new Error('External network is forbidden in isolated platform tests');mail.push(JSON.parse(init.body));return Response.json({id:'isolated-mail'});};
let vite,http,created=false,roleCreated=false,closing=false;
async function close(){if(closing)return;closing=true;http?.close();await vite?.close();await sql.end({timeout:2});if(created)command('dropdb',['--force',database]);if(roleCreated)command('psql',['-d','postgres','-c',`drop role ${role}`]);process.exit();}
process.on('SIGINT',close);process.on('SIGTERM',close);
try{
 command('createdb',[database]);created=true;
 command('psql',['-d',database,'-v','ON_ERROR_STOP=1','-f','supabase/tests/bootstrap.sql','-f','tests/fixtures/original-platform.sql',...readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort().flatMap(f=>['-f',`supabase/migrations/${f}`])]);
 await sql.unsafe(`create role ${role} login nosuperuser bypassrls`);roleCreated=true;
 for(const schema of ['public','aevic','aevic_private','aevic_platform','storage']){await sql.unsafe(`grant usage on schema ${schema} to ${role}`);await sql.unsafe(`grant all on all tables in schema ${schema} to ${role}`);await sql.unsafe(`grant usage,select on all sequences in schema ${schema} to ${role}`);}
 vite=await createVite({configFile:false,server:{middlewareMode:true},appType:'custom'});
 const {hashPassword}=await vite.ssrLoadModule('/server/captain/crypto.ts');
 const password=await hashPassword('IsolatedBrowser42');
 for(const id of [101,102])await sql`insert into public.teams(id,team_name,captain_name,captain_contact,email,password_hash,player1_ign,player2_ign,player3_ign,player4_ign,status) values(${id},${'Isolated Team '+id},'Test Captain','000000',${'captain'+id+'@example.invalid'},${password},'One','Two','Three','Four','approved')`;
 await sql`insert into aevic_platform.accounts(id,original_team_id,email_verified_at) select id,id,now() from public.teams`;
 await sql`insert into aevic_platform.team_authority(team_id,account_id,role) select id,id,'OWNER' from public.teams`;
 await sql`insert into aevic_platform.admin_accounts(id,email,password_hash,role) values('11111111-1111-4111-8111-111111111111','admin@example.invalid',${password},'super-admin')`;
 const {createApp}=await vite.ssrLoadModule('/server/app.ts');
 const app=createApp({supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'isolated-fixture-key',siteUrl:origin,secureCookies:false,indexableDeployment:false,resendKey:'isolated-delivery-key',emailFrom:'test@example.invalid',databaseUrl:`postgres://${role}@127.0.0.1:55432/${database}`,sessionSecret:'isolated-browser-session-key-not-production-00000000'},{});
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.avif':'image/avif'};
 const csp=readFileSync(resolve(root,'_headers'),'utf8').match(/Content-Security-Policy: (.+)/)[1];
 http=serve({hostname:'127.0.0.1',port,fetch:async request=>{
  const url=new URL(request.url);if(url.pathname==='/__test/mail')return Response.json(mail);if(url.pathname.startsWith('/api/'))return app.fetch(request);
  let file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+sep)&&file!==root)return new Response(null,{status:403});
  try{if(statSync(file).isDirectory())file=resolve(file,'index.html');statSync(file);}catch{file=resolve(root,'index.html');}
  return new Response(readFileSync(file),{headers:{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Security-Policy':csp,'Cache-Control':'no-store'}});
 }});console.log('Isolated platform browser server ready');
}catch(error){console.error(error.message);await close();}
