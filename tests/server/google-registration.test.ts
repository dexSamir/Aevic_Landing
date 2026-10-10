import {it,expect,vi} from 'vitest';
import type {TransactionSql} from 'postgres';
import {attachGoogleRegistration} from '../../server/auth/google-continuation';
function database(email='verified@example.com',conflict=false){
 const queries:string[]=[];
 const sql=vi.fn(async(parts:TemplateStringsArray)=>{const query=parts.join('?');queries.push(query);if(query.startsWith('select'))return [{email,subject:'stable-sub',token_digest:'one-use'}];if(conflict&&query.startsWith('insert'))throw Object.assign(new Error('unique violation'),{code:'23505'});return [];});
 return {sql:sql as unknown as TransactionSql,queries};
}
it('associates the verified identity and consumes it in the registration transaction',async()=>{const {sql,queries}=database();await attachGoogleRegistration(sql,'browser','16','verified@example.com');expect(queries).toHaveLength(3);expect(queries[0]).toContain('for update');expect(queries[1]).toContain('insert into aevic_platform.google_identities');expect(queries[2]).toContain("phase='consumed'");});
it('rejects modified registration email before association',async()=>{const {sql,queries}=database();await expect(attachGoogleRegistration(sql,'browser','16','changed@example.com')).rejects.toMatchObject({code:'GOOGLE_EMAIL_MISMATCH'});expect(queries).toHaveLength(1);});
it('propagates duplicate identity constraints without consuming the continuation',async()=>{const {sql,queries}=database('verified@example.com',true);await expect(attachGoogleRegistration(sql,'browser','16','verified@example.com')).rejects.toMatchObject({code:'23505'});expect(queries.some(q=>q.includes("phase='consumed'"))).toBe(false);});
