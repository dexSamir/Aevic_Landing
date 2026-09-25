import type {Sql,TransactionSql} from 'postgres';
import {PostgresCaptainStore} from '../captain/postgres';
import type {CaptainRow} from '../captain/store';
import {ServiceError} from '../errors';
/** Credential adapter. Original passwords stay exclusively in public.teams. */
export class PlatformAccountStore extends PostgresCaptainStore {
 async ready(){await super.ready();const unsafe=await this.sql`select r.rolname from pg_roles r where r.rolname in ('anon','authenticated') and (has_any_column_privilege(r.oid,'aevic_platform.accounts','select') or has_any_column_privilege(r.oid,'aevic_platform.account_identity','select') or has_any_column_privilege(r.oid,'aevic_platform.accounts','update') or has_any_column_privilege(r.oid,'aevic_platform.accounts','insert') or has_table_privilege(r.oid,'aevic_platform.accounts','delete'))`;if(unsafe.length)throw new ServiceError(503,'AUTH_DATABASE_PERMISSIONS_UNSAFE');}

 async byId(id:string){const [row]=await this.sql`select *,id::text from aevic_platform.account_identity where id=${id}`;return row as CaptainRow|undefined;}
 async byEmail(email:string){const rows=await this.sql`select *,id::text from aevic_platform.account_identity where lower(btrim(email))=${email} limit 2`;return rows.length===1?rows[0] as CaptainRow:undefined;}
 async issueReset(row:CaptainRow,value:string){if(row.original_team_id!==null)return super.issueReset(row,value);const rows=await this.sql`update aevic_platform.accounts set reset_token=${value} where id=${row.id} and original_team_id is null and password_hash=${row.password_hash} and reset_token is not distinct from ${row.reset_token} returning id`;return rows.length===1;}
 async consumeReset(id:string,expected:string,hash:string,expires:number){const row=await this.byId(id);if(!row)return false;if(row.original_team_id!==null)return super.consumeReset(id,expected,hash,expires);const rows=await this.sql`update aevic_platform.accounts set password_hash=${hash},reset_token=null where id=${id} and original_team_id is null and reset_token=${expected} and clock_timestamp()<to_timestamp(${expires}) returning id`;return rows.length===1;}
 async changeHash(id:string,expected:string,hash:string){const row=await this.byId(id);if(!row)return false;if(row.original_team_id!==null)return super.changeHash(id,expected,hash);const rows=await this.sql`update aevic_platform.accounts set password_hash=${hash},reset_token=null where id=${id} and original_team_id is null and password_hash=${expected} returning id`;return rows.length===1;}
}
export async function accountRecord(sql:Sql|TransactionSql,id:string){const [row]=await sql`select *,id::text from aevic_platform.account_identity where id=${id}`;if(!row)throw new ServiceError(401,'UNAUTHORIZED');return row;}
export function accountUser(row:Record<string,any>){const name=String(row.captain_name??'').trim().split(/\s+/);return{id:String(row.id),firstName:name.shift()??'',lastName:name.join(' '),email:String(row.email),phone:String(row.captain_contact??''),role:'captain' as const};}
export async function lockAccount(tx:TransactionSql,id:string){const [row]=await tx`select original_team_id from aevic_platform.accounts where id=${id} for update`;if(!row)throw new ServiceError(401,'UNAUTHORIZED');if(row.original_team_id!==null)await tx`select id from public.teams where id=${row.original_team_id} for update`;return await accountRecord(tx,id);}
