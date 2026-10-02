// Read-only catalog/config inspection. Never changes schema, grants, migrations or data.
import postgres from 'postgres';
import {writeFileSync,readdirSync} from 'node:fs';
if(!process.env.AEVIC_DATABASE_URL)throw new Error('AEVIC_DATABASE_URL is required');
const sql=postgres(process.env.AEVIC_DATABASE_URL,{max:1,prepare:false,connect_timeout:15,onnotice:()=>{}});
try{
 const catalog=await sql.begin('read only',async tx=>{
  const schemas=['aevic','aevic_private','aevic_platform'];
  const relations=await tx`select n.nspname as schema,c.relname as name,c.relkind as kind,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls,has_table_privilege(current_user,c.oid,'SELECT') as can_select,has_table_privilege(current_user,c.oid,'INSERT') as can_insert,has_table_privilege(current_user,c.oid,'UPDATE') as can_update,has_table_privilege(current_user,c.oid,'DELETE') as can_delete from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname=any(${schemas}) or (n.nspname='public' and c.relname='teams')) and c.relkind in ('r','p','v') order by 1,2`;
  const columns=await tx`select table_schema as schema,table_name as table,column_name as name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema=any(${schemas}) or (table_schema='public' and table_name='teams') order by table_schema,table_name,ordinal_position`;
  const indexes=await tx`select schemaname as schema,tablename as table,indexname as name,indexdef as definition from pg_indexes where schemaname=any(${schemas}) or (schemaname='public' and tablename='teams') order by 1,2,3`;
  const grants=await tx`select table_schema as schema,table_name as table,grantee,privilege_type from information_schema.role_table_grants where table_schema=any(${schemas}) or (table_schema='public' and table_name='teams') order by 1,2,3,4`;
  const policies=await tx`select schemaname as schema,tablename as table,policyname,roles,cmd from pg_policies where schemaname=any(${schemas}) order by 1,2,3`;
  const [role]=await tx`select rolsuper as superuser,rolbypassrls as bypass_rls from pg_roles where rolname=current_user`;
  const [history]=await tx`select to_regclass('supabase_migrations.schema_migrations') is not null as present`;
  const versions=history.present?await tx`select version from supabase_migrations.schema_migrations order by version`:[];
  return {relations,columns,indexes,grants,policies,applicationConnectionRole:role,migrationHistoryPresent:history.present,migrationVersions:versions.map(x=>x.version)};
 });
 const env=process.env,names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_ANON_KEY','PUBLIC_SITE_URL','AEVIC_DATABASE_URL','AEVIC_SESSION_SECRET','ADMIN_SERVER_KEY','RESEND_API_KEY','EMAIL_FROM','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SUPABASE_SERVICE_ROLE_KEY','TEAM_MEDIA_BUCKET'];
 const present=Object.fromEntries(names.map(n=>[n,Boolean(env[n])]));
 const publicSecretNames=Object.keys(env).filter(n=>n.startsWith('VITE_')&&/SECRET|SERVICE_ROLE|DATABASE|PASSWORD|SMTP_PASS|RESEND_API_KEY|ADMIN_SERVER_KEY/i.test(n));
 const origin=env.PUBLIC_SITE_URL?new URL(env.PUBLIC_SITE_URL).origin:null;
 const report={observedAt:new Date().toISOString(),scope:'Production catalog in a READ ONLY transaction; local .env presence, not deployed Netlify environment certification.',configuration:{present,publicSecretNames,siteOrigin:origin,sessionSecretMinimumLength:(env.AEVIC_SESSION_SECRET||env.ADMIN_SERVER_KEY||'').length>=32},expectedMigrationVersions:readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).map(n=>n.split('_')[0]),...catalog};
 writeFileSync('docs/quality/phase2-release-catalog.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({relations:catalog.relations.length,columns:catalog.columns.length,indexes:catalog.indexes.length,privateClientTableGrants:catalog.grants.filter(g=>g.schema==='aevic_platform'&&['anon','authenticated','PUBLIC'].includes(g.grantee)).length,platformTablesWithoutRls:catalog.relations.filter(r=>r.schema==='aevic_platform'&&r.kind==='r'&&!r.rls).map(r=>r.name),configuration:report.configuration,migrationHistoryPresent:catalog.migrationHistoryPresent,migrationVersions:catalog.migrationVersions},null,2));
}catch(error){console.error('Read-only readiness inspection failed:',error.code||error.name,String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[database URL redacted]')); process.exitCode=1;}finally{await sql.end();}
