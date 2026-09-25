import postgres from 'postgres';
import type {CaptainRow,CaptainStore,TeamPatch} from './store';
import {ServiceError} from '../errors';
import {databaseCa} from './database-ca';

// Existing objects only: catalog reads, SELECT, INSERT and UPDATE. No DDL/RPC/migrations.
const projection='id::text,team_name,captain_name,captain_contact,email,password_hash,reset_token,player1_ign,player2_ign,player3_ign,player4_ign,player5_ign,logo_url,tier,status,created_at,rejection_reason,player1_photo_url,player2_photo_url,player3_photo_url,player4_photo_url,player5_photo_url,match_results';
const allowed=new Set(['team_name','captain_name','captain_contact','logo_url',...[1,2,3,4,5].flatMap(i=>[`player${i}_ign`,`player${i}_photo_url`])]);
const clean=(r:Record<string,unknown>)=>({...r,created_at:r.created_at instanceof Date?r.created_at.toISOString():r.created_at}) as unknown as CaptainRow;
export class PostgresCaptainStore implements CaptainStore {
 readonly sql:ReturnType<typeof postgres>;
 private readiness?:Promise<void>;
 constructor(url:string,allowLocal=false) {
  const u=new URL(url);const ref='nmjjibifcuzjlsvfcaaz';
  const local=allowLocal&&['localhost','127.0.0.1'].includes(u.hostname);
  if(!['postgres:','postgresql:'].includes(u.protocol)||!(local||u.hostname===`db.${ref}.supabase.co`||(u.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(u.username).endsWith(`.${ref}`))))throw new ServiceError(503,'PRIVATE_DATABASE_NOT_CONFIGURED');
  this.sql=postgres(url,{ssl:local?false:{rejectUnauthorized:true,ca:databaseCa},max:3,prepare:false,idle_timeout:20,connect_timeout:20,onnotice:()=>{},connection:{application_name:'aevic-captain',statement_timeout:8000,lock_timeout:3000}});
 }
 ready() {
  // Concurrent requests share only the in-progress catalog check. Never retain
  // a successful result: later requests must still detect permission changes.
  if(!this.readiness) {
   const pending=this.checkReadiness();
   this.readiness=pending;
   void pending.finally(()=>{if(this.readiness===pending)this.readiness=undefined;}).catch(()=>{});
  }
  return this.readiness;
 }
 private async checkReadiness() {
  // No long-lived positive cache: permission/column changes must fail closed.
  const columns=await this.sql`select column_name,data_type,character_maximum_length,column_default,is_identity,is_nullable from information_schema.columns where table_schema='public' and table_name='teams'`;
  for(const field of ['password_hash','reset_token']) {
   const c=columns.find(c=>c.column_name===field);
   if(!c||(field==='reset_token'&&c.is_nullable!=='YES')||!['text','character varying'].includes(c.data_type)||c.character_maximum_length!==null&&Number(c.character_maximum_length)<(field==='reset_token'?80:169))throw new ServiceError(503,'AUTH_COLUMN_CONTRACT_UNAVAILABLE');
  }
  const id=columns.find(c=>c.column_name==='id');
  // A BEFORE INSERT trigger can generate the bigint without a default/identity.
  // Registration omits id and uses RETURNING inside a transaction; PostgreSQL
  // enforces the existing generator/constraints. Reads and resets need no generator.
  if(id?.data_type!=='bigint')throw new ServiceError(503,'TEAM_ID_CONTRACT_UNAVAILABLE');
  const roles=await this.sql`select rolsuper from pg_roles where rolname=current_user`;
  if(roles[0]?.rolsuper)throw new ServiceError(503,'PRIVATE_DATABASE_ROLE_TOO_BROAD');
  const unsafe=await this.sql`select r.rolname from pg_roles r where r.rolname in ('anon','authenticated') and (
   has_column_privilege(r.oid,'public.teams','password_hash','select') or has_column_privilege(r.oid,'public.teams','reset_token','select') or has_column_privilege(r.oid,'public.teams','email','select') or has_column_privilege(r.oid,'public.teams','captain_contact','select') or has_column_privilege(r.oid,'public.teams','room_password','select') or
   has_any_column_privilege(r.oid,'public.teams','update') or has_any_column_privilege(r.oid,'public.teams','insert') or has_table_privilege(r.oid,'public.teams','delete'))`;
  if(unsafe.length)throw new ServiceError(503,'AUTH_DATABASE_PERMISSIONS_UNSAFE');
 }
 async byEmail(email:string) { const rows=await this.sql.unsafe(`select ${projection} from public.teams where lower(btrim(email))=$1 limit 2`,[email]);return rows.length===1?clean(rows[0]):undefined; }
 async byId(id:string) {const rows=await this.sql.unsafe(`select ${projection} from public.teams where id=$1`,[id]);return rows[0]?clean(rows[0]):undefined;}
 async issueReset(row:CaptainRow,value:string) {
  const rows=await this.sql`update public.teams set reset_token=${value} where id=${row.id} and password_hash is not distinct from ${row.password_hash} and reset_token is not distinct from ${row.reset_token} returning id::text`;return rows.length===1;
 }
 async consumeReset(id:string,expected:string,hash:string,expires:number) {
  // One conditional statement consumes token + changes password. Concurrent/replayed calls lose.
  const rows=await this.sql`update public.teams set password_hash=${hash},reset_token=null where id=${id} and reset_token=${expected} and clock_timestamp()<to_timestamp(${expires}) returning id::text`;return rows.length===1;
 }
 async changeHash(id:string,expected:string,hash:string) {
  const rows=await this.sql`update public.teams set password_hash=${hash},reset_token=null where id=${id} and password_hash=${expected} returning id::text`;return rows.length===1;
 }
 async update(id:string,expectedHash:string,patch:TeamPatch) {
  if(!Object.keys(patch).length||Object.keys(patch).some(k=>!allowed.has(k)))throw new ServiceError(422,'UNSUPPORTED_TEAM_FIELD');
  return await this.sql.begin(async sql=>{
   // Shares the registration name lock, so concurrent renames/registrations cannot duplicate names.
   await sql`select pg_advisory_xact_lock(184621,1)`;
   if(patch.team_name){const duplicates=await sql`select id from public.teams where lower(btrim(team_name))=lower(${patch.team_name}) and id<>${id} limit 1`;if(duplicates.length)throw new ServiceError(409,'TEAM_NAME_TAKEN');}
   const rows=await sql`update public.teams set ${sql(patch)} where id=${id} and password_hash=${expectedHash} returning id::text`;
   if(rows.length!==1)throw new ServiceError(401,'UNAUTHORIZED');
   const result=await sql.unsafe(`select ${projection} from public.teams where id=$1`,[id]);return clean(result[0]);
  }) as unknown as CaptainRow;
 }
 async register(values:TeamPatch) {
  const keys=new Set([...allowed,'email','password_hash','status','tier']);
  if(Object.keys(values).some(k=>!keys.has(k)))throw new ServiceError(422,'VALIDATION_ERROR');
  return await this.sql.begin(async sql=>{
   await sql`select pg_advisory_xact_lock(184621,1)`;
   const duplicate=await sql`select id from public.teams where lower(btrim(email))=lower(${values.email}) or lower(btrim(team_name))=lower(${values.team_name}) limit 1`;
   if(duplicate.length)throw new ServiceError(409,'REGISTRATION_CONFLICT');
   const rows=await sql`insert into public.teams ${sql(values)} returning id::text`;
   const result=await sql.unsafe(`select ${projection} from public.teams where id=$1`,[rows[0].id]);return clean(result[0]);
  }) as unknown as CaptainRow;
 }
 async publicMedia(id:string) {
  // Resolve only IDs referenced by a public team image and only already-public buckets.
  const references=await this.sql`select id from public.teams where ${'/api/media/'+id} in (logo_url,player1_photo_url,player2_photo_url,player3_photo_url,player4_photo_url,player5_photo_url) limit 1`;
  if(!references.length)return undefined;
  const objects=await this.sql`select o.bucket_id as bucket,o.name from storage.objects o join storage.buckets b on b.id=o.bucket_id where b.public=true and (o.id::text=${id} or regexp_replace(o.name,'^.*/','')=any(${[id,id+'.png',id+'.jpg',id+'.jpeg',id+'.webp']})) limit 2`;
  if(objects.length!==1)return undefined;return {bucket:String(objects[0].bucket),name:String(objects[0].name)};
 }
}
