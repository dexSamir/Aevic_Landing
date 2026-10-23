import postgres from 'postgres';
import {pathToFileURL} from 'node:url';

export const initialAdminEmail = 'aevicesports@gmail.com';
// Owner-only, fixed identity. Never change credentials, reactivate, or promote a row.
export async function bootstrapFirstAdmin(sql) {
  return sql.begin(async tx => {
    const [owner] = await tx`select pg_has_role(current_user, relowner, 'USAGE') as allowed from pg_class where oid='aevic_platform.admin_accounts'::regclass`;
    if (!owner?.allowed) throw new Error('Database table owner access required');
    await tx`select pg_advisory_xact_lock(hashtextextended('admin-account-management',0))`;
    await tx`lock table aevic_platform.admin_accounts in share row exclusive mode`;
    const [existing] = await tx`select id,role,active from aevic_platform.admin_accounts where email=${initialAdminEmail}`;
    if (existing) {
      if (!existing.active || existing.role !== 'super-admin') throw new Error('Existing account requires explicit owner review; no changes made');
      return {status:'already-provisioned'};
    }
    const [other] = await tx`select id from aevic_platform.admin_accounts where active and role='super-admin' limit 1`;
    if (other) throw new Error('An active super-admin already exists; use its administrator invitation workflow');
    const [created] = await tx`insert into aevic_platform.admin_accounts(email,role,active) values(${initialAdminEmail},'super-admin',true) returning id`;
    await tx`insert into aevic_platform.audit_events(actor_id,action,entity_type,entity_id,metadata) values('database-owner','admin.bootstrap','admin',${created.id},'{}'::jsonb)`;
    return {status:'created'};
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || process.argv[2] !== '--confirm-first-admin=aevicesports@gmail.com' || !process.env.AEVIC_DATABASE_URL) {
    console.error('Set AEVIC_DATABASE_URL using an owner connection, then run: node --env-file=.netlify/captain.production.env scripts/bootstrap-first-admin.mjs --confirm-first-admin=aevicesports@gmail.com');
    process.exitCode=1;
  } else {
    const sql=postgres(process.env.AEVIC_DATABASE_URL,{max:1,prepare:false,connect_timeout:10,onnotice:()=>{}});
    try { console.log(await bootstrapFirstAdmin(sql)); }
    catch { console.error('Bootstrap refused or failed. Verify owner access, schema, and existing admin state. No credentials are printed.');process.exitCode=1; }
    finally { await sql.end(); }
  }
}
