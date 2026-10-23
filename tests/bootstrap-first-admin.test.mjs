import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapFirstAdmin,initialAdminEmail} from '../scripts/bootstrap-first-admin.mjs';
function database({existing,other=false,owner=true}={}){
 let row=existing;const writes=[];
 const sql=async(parts,...args)=>{const q=parts.join('?');
  if(q.includes('pg_has_role'))return [{allowed:owner}];
  if(q.includes('where email='))return row?[row]:[];
  if(q.includes("where active and role="))return other?[{id:'other'}]:[];
  if(q.includes('insert into aevic_platform.admin_accounts')){assert.equal(args[0],initialAdminEmail);assert.match(q,/'super-admin',true/);row={id:'first',active:true,role:'super-admin'};writes.push(q);return [row];}
  return [];
 };sql.begin=fn=>fn(sql);return {sql,writes};
}
test('first administrator is fixed, passwordless, audited and idempotent',async()=>{const d=database();assert.deepEqual(await bootstrapFirstAdmin(d.sql),{status:'created'});assert.deepEqual(await bootstrapFirstAdmin(d.sql),{status:'already-provisioned'});assert.equal(d.writes.length,1);assert.ok(!d.writes[0].includes('password_hash'));});
for(const role of ['captain','super_admin','support-moderator'])test('refuses existing role '+role,async()=>{const d=database({existing:{active:true,role}});await assert.rejects(bootstrapFirstAdmin(d.sql));assert.equal(d.writes.length,0);});
test('refuses inactive accounts, other super-admins and non-owner execution',async()=>{for(const input of [{existing:{active:false,role:'super-admin'}},{other:true},{owner:false}]){const d=database(input);await assert.rejects(bootstrapFirstAdmin(d.sql));assert.equal(d.writes.length,0);}});
