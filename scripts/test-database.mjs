import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const dir=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@18/bin';
const host=process.env.AEVIC_TEST_PG_HOST||'/tmp';
if(!['/tmp','localhost','127.0.0.1'].includes(host))throw new Error('Database tests require an isolated local PostgreSQL server.');
const port=process.env.AEVIC_TEST_PG_PORT||'55432';
const name=`aevic_test_${process.pid}`;const connection=['-h',host,'-p',port];
const run=(command,args)=>execFileSync(`${dir}/${command}`,args,{stdio:'inherit'});
run('createdb',[...connection,name]);
try{run('psql',[...connection,'-d',name,'-v','ON_ERROR_STOP=1','-f','supabase/tests/bootstrap.sql',...readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort().flatMap(f=>['-f',`supabase/migrations/${f}`]),'-f','supabase/tests/policies.sql','-f','supabase/tests/integration.sql']);}
finally{run('dropdb',[...connection,name]);}
