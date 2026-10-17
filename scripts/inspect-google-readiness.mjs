/** Read-only metadata only. Never print environment values, cookies or records. */
import postgres from 'postgres';
const site = process.env.SITE_URL || process.env.URL || 'https://aevic-demo.netlify.app';
console.log(JSON.stringify({googleEnabled:process.env.AEVIC_GOOGLE_ENABLED==='true',sessionMode:process.env.AEVIC_SESSION_MODE||'legacy',clientIdPresent:Boolean(process.env.GOOGLE_CLIENT_ID),clientSecretPresent:Boolean(process.env.GOOGLE_CLIENT_SECRET),callbackMatchesExpected:new URL(site).origin+'/api/auth/google/callback'==='https://aevic-demo.netlify.app/api/auth/google/callback'}));
if(!process.env.AEVIC_DATABASE_URL) { console.log('Database metadata unavailable: no configured connection'); process.exit(0); }
const sql=postgres(process.env.AEVIC_DATABASE_URL,{max:1,connect_timeout:8,idle_timeout:1,onnotice:()=>{}});
try {
 await sql.begin('read only',async tx=>{
  await tx`set local statement_timeout='8s'`;
  const rows=await tx`select c.relname as table_name,c.relrowsecurity as rls_enabled,has_table_privilege(current_user,c.oid,'SELECT') as can_select,has_table_privilege(current_user,c.oid,'INSERT') as can_insert,has_table_privilege(current_user,c.oid,'UPDATE') as can_update,has_table_privilege(current_user,c.oid,'DELETE') as can_delete from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='aevic_platform' and c.relname in ('google_flows','google_identities')`;
  console.log(JSON.stringify({configuredConnectionMetadata:rows}));
 });
} catch(error) { console.log(JSON.stringify({metadataCheckFailed:true,code:/^[A-Z0-9_]{2,40}$/.test(error.code??'')?error.code:'UNAVAILABLE'}));process.exitCode=1; }
finally { await sql.end({timeout:1}); }
