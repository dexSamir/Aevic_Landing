import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
const bin=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@18/bin';
const name=`aevic_platform_test_${process.pid}`;
const args=['-h','/tmp','-p','55432'];
const run=(command,argv)=>execFileSync(`${bin}/${command}`,argv,{stdio:'inherit'});
run('createdb',[...args,name]);
try{run('psql',[...args,'-d',name,'-v','ON_ERROR_STOP=1','-f','supabase/tests/bootstrap.sql','-f','tests/fixtures/original-platform.sql',...readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort().flatMap(x=>['-f',`supabase/migrations/${x}`]),'-f','supabase/tests/platform.sql']);}
finally{run('dropdb',[...args,name]);}
