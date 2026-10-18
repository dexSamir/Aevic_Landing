import {describe,it,expect,vi} from 'vitest';
import postgres from 'postgres';
import {boundedSql,databaseMetrics} from '../../server/captain/bounded-sql';
import {databaseGate} from '../../server/captain/database-gate';
import {PlatformRepository} from '../../server/platform/repository';
import type {DbClient} from '../../server/db';

it('bounds queued acquisitions, expires waiters, and recovers without leaking permits',async()=>{
 const acquire=databaseGate(1,1,20),release=await acquire();
 const waiting=expect(acquire()).rejects.toMatchObject({code:'POOL_QUEUE_FULL'});
 await expect(acquire()).rejects.toMatchObject({code:'POOL_QUEUE_FULL'});
 await waiting;release();const next=await acquire();next();
});
it('scopes a private team and all supporting reads to its id',async()=>{
 const calls:Array<{text:string;values:unknown[]}>=[];
 const sql=Object.assign(vi.fn(async(parts:TemplateStringsArray,...values:unknown[])=>{calls.push({text:parts.join('?'),values});return [];}),{
  unsafe:vi.fn(async(text:string,values:unknown[])=>{calls.push({text,values});return [{id:'16',team_name:'Own team',status:'approved',created_at:new Date(),captain_name:'Captain',email:'fixture@example.test'}];})
 });
 const repo=new PlatformRepository({} as DbClient,sql as unknown as postgres.Sql,{teamId:'16',accountId:'16'});
 const team=await repo.team('16',true);
 expect(team.id).toBe('16');expect(team.captain.email).toBe('fixture@example.test');
 expect(calls).toHaveLength(5);
 for(const call of calls){expect(call.text).toMatch(/where/);expect(call.values).toContain('16');}
 expect(calls[0].text).toContain('id=$3::bigint');
});

// Opt-in, isolated local PostgreSQL only; never reads AEVIC_DATABASE_URL.
describe.skipIf(!process.env.AEVIC_RELIABILITY_LOCAL)('real driver lifecycle',()=>{
 const make=(deadline=8000)=>{
  const raw=postgres('postgres://127.0.0.1:55439/postgres',{max:1,prepare:false,...{max_pipeline:1},connect_timeout:1,idle_timeout:1});
  return {raw,sql:boundedSql(raw,deadline)};
 };
 it('bounds a failed local connection attempt without retrying indefinitely',async()=>{
  const raw=postgres('postgres://127.0.0.1:1/postgres',{max:1,connect_timeout:1});
  try{await expect(boundedSql(raw,1500)`select 1`).rejects.toMatchObject({code:'ECONNREFUSED'});}
  finally{await raw.end({timeout:1});}
 });
 it('serves 32 concurrent reads through one connection and reports timing',async()=>{
  const {raw,sql}=make(),metrics={queries:0,queryMs:0,timeouts:0,queueWaitMs:0};
  try{
   const start=performance.now();
   const rows=await databaseMetrics.run(metrics,()=>Promise.all(Array.from({length:32},()=>sql`select pg_backend_pid() as pid, pg_sleep(0.005)`)));
   expect(new Set(rows.map(r=>r[0].pid)).size).toBe(1);expect(metrics.queries).toBe(32);expect(metrics.timeouts).toBe(0);
   process.stdout.write(JSON.stringify({fixture:'32 concurrent local reads',requests:32,connections:1,errors:0,elapsedMs:Math.round(performance.now()-start),...metrics})+'\n');
  }finally{await raw.end({timeout:1});}
 });
 it('cancels timed-out SQL and reuses the pool',async()=>{
  const {raw,sql}=make(100);
  try{await sql`select 1`;await expect(sql`select pg_sleep(1)`).rejects.toMatchObject({code:'QUERY_TIMEOUT'});expect((await sql`select 42 as value`)[0].value).toBe(42);}
  finally{await raw.end({timeout:1});}
 });
 it('rolls back failed transactions, applies local timeouts, and releases their connection',async()=>{
  const {raw,sql}=make();
  try{
   await sql`create temporary table reliability_test(value int)`;
   await expect(sql.begin(async tx=>{await tx`insert into reliability_test values(1)`;throw new Error('rollback');})).rejects.toThrow('rollback');
   expect((await sql`select count(*)::int as n from reliability_test`)[0].n).toBe(0);
   await sql.begin(async tx=>{expect((await tx`show statement_timeout`)[0].statement_timeout).toBe('8s');await tx`insert into reliability_test values(2)`;});
   expect((await sql`select count(*)::int as n from reliability_test`)[0].n).toBe(1);
  }finally{await raw.end({timeout:1});}
 });
 it('recovers after SQL errors and transaction cancellation',async()=>{
  const {raw,sql}=make(100);
  try{
   await expect(sql`select 1/0`).rejects.toMatchObject({code:'22012'});
   await expect(sql.begin(async tx=>{await tx`select pg_sleep(1)`;})).rejects.toMatchObject({code:'QUERY_TIMEOUT'});
   expect((await sql`select 7 as value`)[0].value).toBe(7);
  }finally{await raw.end({timeout:1});}
 });
});

it('expires queued work before executing it after the owner releases',async()=>{
 const acquire=databaseGate(1,4,20);const release=await acquire();let executed=false;
 await expect((async()=>{const done=await acquire();try{executed=true;}finally{done();}})()).rejects.toMatchObject({code:'POOL_QUEUE_FULL'});
 release();await new Promise(r=>setTimeout(r,5));expect(executed).toBe(false);
});
