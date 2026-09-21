#!/usr/bin/env node
import {readFileSync,readdirSync,openSync,closeSync,ftruncateSync,fsyncSync,writeSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {userInfo} from 'node:os';
import {hash,MigrationError,planImport,validateTarget} from './core.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
const root=resolve(dir,'../..');
const load=name=>readFileSync(join(dir,name),'utf8');
const literal=s=>`convert_from(decode('${Buffer.from(s).toString('hex')}','hex'),'UTF8')`;
export const catalogExpression=`md5((${load('target-catalog.sql').trim().replace(/;$/,'')})::text)`;
const codes=new Set(['AUTH_IDENTITY_MISSING','OWNER_AUTH_MISSING','MAPPED_SOURCE_CHANGED','TARGET_TEAM_CHANGED','TARGET_OWNER_CHANGED','TARGET_ROSTER_CHANGED','TARGET_TEAM_CONFLICT','TARGET_OWNER_CONFLICT','TARGET_PLAYER_CONFLICT','TARGET_NOT_ENROLLED','TARGET_SCHEMA_DIFFERENCE','TARGET_IDENTITY_MISMATCH']);
export function sql(target,query){
 target=validateTarget(target);
 // No URLs, host override, source connection, PG service files or inherited libpq
 // settings. Unix socket and a restricted database name are mandatory.
 const result=spawnSync(join(process.env.PG_BIN||'/opt/homebrew/opt/postgresql@18/bin','psql'),['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-h','/tmp','-p',String(target.port),'-U',userInfo().username,'-d',target.database],{input:query,encoding:'utf8',maxBuffer:8*1024*1024,env:{PATH:process.env.PATH,LC_ALL:'C',PGCONNECT_TIMEOUT:'5'}});
 if(result.status!==0){const code=[...codes].find(c=>result.stderr?.includes(c));throw new MigrationError(code||'DATABASE_VALIDATION_FAILED');}
 return result.stdout.trim();
}
function contract(){
 const approved=JSON.parse(load('target-contract.json'));
 const actual=Object.fromEntries(readdirSync(join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort().map(f=>[f,hash(readFileSync(join(root,'supabase/migrations',f),'utf8'))]));
 if(JSON.stringify(actual)!==JSON.stringify(approved.migrations))throw new MigrationError('LOCAL_MIGRATIONS_CHANGED');
 return approved.catalogHash;
}
export function enroll(target){
 const expected=contract();
 // No IF NOT EXISTS: an existing marker cannot be silently repurposed.
 sql(target,`begin; set local lock_timeout='5s'; set local statement_timeout='30s';
 do $$ begin if current_database()<>${literal(target.database)} or inet_server_addr() is not null or ${catalogExpression}<>${literal(expected)} then raise exception 'TARGET_SCHEMA_DIFFERENCE';end if;end $$;
 ${load('local-ledger.sql')}
 insert into aevic_private.legacy_import_environment(instance_id,database_name,environment,contract_hash) values((${literal(target.instanceId)})::uuid,${literal(target.database)},'local',${literal(expected)});commit;`);
}
export function execute(target,plan,apply=false){
 const expected=contract();
 const exists=sql(target,"select to_regclass('aevic_private.legacy_import_environment') is not null;");
 if(exists!=='t')throw new MigrationError('TARGET_NOT_ENROLLED');
 const output=sql(target,`begin; set local log_min_messages='panic'; set local log_min_error_statement='panic'; set local log_statement='none'; set local lock_timeout='5s'; set local statement_timeout='60s';
 select pg_advisory_xact_lock(726124198);
 lock table aevic_private.legacy_import_environment,aevic_private.legacy_import_map,aevic_private.legacy_team_holdings,aevic.profiles,aevic.teams,aevic.team_members,aevic.players,aevic.player_identities,aevic.team_players in share row exclusive mode;
 do $$ begin
 if current_database()<>${literal(target.database)} or inet_server_addr() is not null or not exists(select 1 from aevic_private.legacy_import_environment where instance_id=(${literal(target.instanceId)})::uuid and database_name=current_database() and environment='local' and contract_hash=${literal(expected)}) then raise exception 'TARGET_IDENTITY_MISMATCH';end if;
 if ${catalogExpression}<>${literal(expected)} then raise exception 'TARGET_SCHEMA_DIFFERENCE';end if;
 end $$;
 create temp table import_outcome(reference text,action text) on commit drop;
 create temp table import_profile_outcome(reference text,action text) on commit drop;
 do $$ begin perform set_config('aevic.legacy_import_payload',${literal(JSON.stringify({teams:plan.ready,accounts:plan.accounts,unclaimed:plan.unclaimed??[]}))},true);end $$;
 ${load('import.sql')}
 select jsonb_build_object('teams',(select coalesce(jsonb_agg(jsonb_build_object('reference',reference,'action',action) order by reference),'[]'::jsonb) from import_outcome),'profiles',(select coalesce(jsonb_agg(jsonb_build_object('reference',reference,'action',action) order by reference),'[]'::jsonb) from import_profile_outcome));
 ${apply?'commit':'rollback'};`);
 const result=JSON.parse(output.split('\n').filter(Boolean).at(-1));const outcomes=result.teams;
 return {...plan.report,mode:apply?'apply':'dry-run',committed:apply,targetInstanceHash:hash(target.instanceId),targetCatalogHash:expected,outcomes,profileOutcomes:result.profiles,counts:{...plan.report.counts,profilesCreated:result.profiles.filter(o=>o.action==='created').length,profilesRetained:result.profiles.filter(o=>o.action==='retained').length,created:outcomes.filter(o=>o.action==='created').length,unchanged:outcomes.filter(o=>o.action==='unchanged').length}};
}
function jsonFile(path){try{return JSON.parse(readFileSync(path,'utf8'));}catch{throw new MigrationError('INVALID_INPUT_FILE');}}
function main(){
 const args=process.argv.slice(2);if(args.length===1&&args[0]==='--help'){console.log('Local-only legacy rehearsal.\nnode scripts/legacy-migration/cli.mjs enroll --target FILE\nnode scripts/legacy-migration/cli.mjs dry-run|apply --target FILE --source FILE --review FILE --report NEW_FILE\nNo remote targets or source connections are supported. Reports are created with mode 0600.');return;}
 const command=args.shift(),options={};for(let i=0;i<args.length;i+=2){if(!['--target','--source','--review','--report'].includes(args[i])||!args[i+1]||options[args[i]])throw new MigrationError('INVALID_ARGUMENTS');options[args[i]]=args[i+1];}
 if(!['enroll','dry-run','apply'].includes(command)||!options['--target'])throw new MigrationError('INVALID_ARGUMENTS');
 const target=validateTarget(jsonFile(options['--target']));
 if(command==='enroll'){if(Object.keys(options).length!==1)throw new MigrationError('INVALID_ARGUMENTS');enroll(target);console.log('Local rehearsal target enrolled.');return;}
 if(Object.keys(options).length!==4)throw new MigrationError('INVALID_ARGUMENTS');
 const plan=planImport(jsonFile(options['--source']),jsonFile(options['--review']));
 // Keep the exclusive descriptor open: a path replacement cannot redirect writes.
 const reportFd=openSync(options['--report'],'wx',0o600);
 const save=report=>{ftruncateSync(reportFd,0);const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');let offset=0;while(offset<bytes.length)offset+=writeSync(reportFd,bytes,offset,bytes.length-offset,offset);fsyncSync(reportFd);};
 let report;
 try{
  save({status:'INCOMPLETE',...plan.report});
  try{report=execute(target,plan,command==='apply');}catch(error){
   const known=error instanceof MigrationError&&codes.has(error.code);
   report={...plan.report,status:known?'ROLLED_BACK':'OUTCOME_NOT_CONFIRMED',code:error instanceof MigrationError?error.code:'MIGRATION_FAILED',committed:known?false:null};save(report);throw error;
  }
  save(report);
 }finally{closeSync(reportFd);}
 console.log(JSON.stringify({mode:report.mode,committed:report.committed,counts:report.counts}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){console.error(JSON.stringify({status:'FAILED',code:error instanceof MigrationError?error.code:'MIGRATION_FAILED'}));process.exitCode=1;}
