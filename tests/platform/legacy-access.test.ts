import {beforeAll,afterAll,it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import postgres from 'postgres';

// Only a newly created local fixture database; never accepts a connection URL.
const bin='/opt/homebrew/opt/postgresql@18/bin',database=`aevic_legacy_access_${process.pid}`;
const args=['-h','/tmp','-p','55432'];
const command=(name:string,extra:string[])=>execFileSync(`${bin}/${name}`,[...args,...extra],{stdio:'pipe'});
const sql=postgres({host:'/tmp',port:55432,database,max:1,prepare:false,onnotice:()=>{}});
beforeAll(async()=>{
 command('createdb',[database]);
 command('psql',['-d',database,'-v','ON_ERROR_STOP=1','-f','supabase/tests/bootstrap.sql']);
 await sql.unsafe(`
  grant usage on schema public,storage to anon,authenticated,service_role;
  create table public.teams(id integer primary key,name text);
  insert into public.teams values(1,'Public fixture');
  grant select on public.teams to anon,authenticated;
  create table public.admin_sessions(id integer primary key,token text);
  create table public.rate_limits(id integer primary key,token text);
  create table public.tournament_state(id integer primary key,token text);
  insert into public.admin_sessions values(1,'synthetic');
  insert into public.rate_limits values(1,'synthetic');
  insert into public.tournament_state values(1,'synthetic');
  grant all on public.admin_sessions,public.rate_limits,public.tournament_state to anon,authenticated,service_role;
  grant select(token) on public.admin_sessions to public;
  alter table public.admin_sessions enable row level security;
  alter table public.rate_limits enable row level security;
  alter table public.tournament_state enable row level security;
  create policy legacy_open on public.admin_sessions for all using(true) with check(true);
  create policy legacy_open on public.rate_limits for all using(true) with check(true);
  create policy legacy_open on public.tournament_state for all using(true) with check(true);
  grant all on storage.objects to anon,authenticated,service_role;
  insert into storage.buckets(id,public) values('aevic-media',true),('other-safe',true);
  insert into storage.objects(bucket_id,name) values('aevic-media','public.webp');
  create policy aevic_media_public_read on storage.objects for select using(bucket_id='aevic-media');
  create policy aevic_media_public_write on storage.objects for insert to anon,authenticated with check(bucket_id='aevic-media');
  create policy aevic_media_public_update on storage.objects for update to anon,authenticated using(bucket_id='aevic-media');
  create policy aevic_media_public_delete on storage.objects for delete to anon,authenticated using(bucket_id='aevic-media');
  create policy other_safe_upload on storage.objects for insert to authenticated with check(bucket_id='other-safe');
 `);
 command('psql',['-d',database,'-v','ON_ERROR_STOP=1','-f','supabase/migrations/20261106144342_restrict_legacy_browser_access.sql']);
});
afterAll(async()=>{await sql.end();command('dropdb',[database]);});
const asRole=(role:'anon'|'authenticated'|'service_role',query:string)=>sql.begin(async tx=>{
 await tx.unsafe(`set local role ${role}`);return tx.unsafe(query);
});
it('denies browser table and column privileges on the three legacy resources',async()=>{
 for(const role of ['anon','authenticated'] as const)for(const table of ['admin_sessions','rate_limits','tournament_state']){
  const [privileges]=await sql`select has_table_privilege(${role},${'public.'+table},'SELECT,INSERT,UPDATE,DELETE') as any_grant`;
  expect(privileges.any_grant).toBe(false);
  await expect(asRole(role,`select token from public.${table}`)).rejects.toMatchObject({code:'42501'});
 }
});
it('retains ordinary public identities and public image reads',async()=>{
 expect(await asRole('anon','select name from public.teams')).toMatchObject([{name:'Public fixture'}]);
 expect(await asRole('anon','select name from storage.objects')).toMatchObject([{name:'public.webp'}]);
});
it('denies anonymous and authenticated media mutations without removing objects',async()=>{
 for(const role of ['anon','authenticated'] as const){
  await expect(asRole(role,"insert into storage.objects(bucket_id,name) values('aevic-media','blocked.webp')")).rejects.toMatchObject({code:'42501'});
  expect(await asRole(role,"update storage.objects set name='blocked.webp' where bucket_id='aevic-media' returning name")).toHaveLength(0);
  expect(await asRole(role,"delete from storage.objects where bucket_id='aevic-media' returning name")).toHaveLength(0);
 }
 expect((await sql`select name from storage.objects where bucket_id='aevic-media'`)[0].name).toBe('public.webp');
});
it('preserves service media operations, server grants and all existing fixture rows',async()=>{
 await asRole('service_role',"insert into storage.objects(bucket_id,name) values('aevic-media','authorized.webp')");
 expect(await asRole('service_role',"update storage.objects set name='updated.webp' where name='authorized.webp' returning name")).toHaveLength(1);
 expect(await asRole('service_role',"delete from storage.objects where name='updated.webp' returning name")).toHaveLength(1);
 for(const table of ['admin_sessions','rate_limits','tournament_state'])expect(await asRole('service_role',`select id from public.${table}`)).toHaveLength(1);
});
it('leaves authorization policies for other buckets untouched',async()=>{
 await expect(asRole('authenticated',"insert into storage.objects(bucket_id,name) values('other-safe','authorized.webp')")).resolves.toBeDefined();
 expect(await sql`select name from storage.objects where bucket_id='other-safe'`).toHaveLength(1);
});
