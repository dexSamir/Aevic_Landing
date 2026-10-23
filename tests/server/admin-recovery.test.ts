import {beforeEach,expect,it,vi} from 'vitest';
import {issueAdminSetup,inspectAdminReset,consumeAdminReset} from '../../server/platform/admin-recovery';
import {sendTransactional} from '../../server/platform/email';
import {verifyPassword} from '../../server/captain/crypto';
vi.mock('../../server/platform/email',()=>({sendTransactional:vi.fn().mockResolvedValue(undefined)}));
let row:any,revoked:boolean,audited:boolean;
const sql:any=async(parts:TemplateStringsArray,...args:any[])=>{const q=parts.join('?');
 if(q.includes('set reset_digest=')&&!q.includes('null')){if(!row.active)return [];row.digest=args[0];row.expires=Date.now()+1800000;return [{email:'aevicesports@gmail.com'}];}
 if(q.includes('select reset_expires_at'))return row.active&&args[1]===row.digest?[{valid:row.expires>Date.now()}]:[];
 if(q.includes('set password_hash=')){if(!row.active||row.digest!==args[2]||row.expires<=Date.now())return [];row.hash=args[0];row.digest=null;return [{id:row.id}];}
 if(q.includes('update aevic_platform.sessions'))revoked=true;
 if(q.includes('insert into aevic_platform.audit_events'))audited=true;
 if(q.includes('set reset_digest=null'))row.digest=null;
 return [];
};sql.begin=(fn:any)=>fn(sql);sql.json=(v:any)=>v;
const config={supabaseUrl:'https://example.supabase.co',publishableKey:'fixture',siteUrl:'https://aevic-esports.netlify.app',secureCookies:true};
beforeEach(()=>{row={id:'00000000-0000-4000-8000-000000000001',active:true};revoked=false;audited=false;vi.mocked(sendTransactional).mockClear();});
async function setup(){await issueAdminSetup(sql,config,row.id);const mail=vi.mocked(sendTransactional).mock.calls.at(-1)![2];return /#token=(\S+)/.exec(mail.text)![1];}
it('initializes passwordless admin through a single-use emailed token and revokes sessions',async()=>{const token=await setup();expect(row.digest).not.toBe(token);expect(await inspectAdminReset(sql,token)).toBe('valid');await consumeAdminReset(sql,token,'PersonalPassword1');expect(await verifyPassword('PersonalPassword1',row.hash)).toBe(true);expect(await verifyPassword('incorrect',row.hash)).toBe(false);expect(revoked&&audited).toBe(true);await expect(consumeAdminReset(sql,token,'OtherPassword1')).rejects.toThrow();});
it('rejects expired, malformed and inactive recovery',async()=>{const token=await setup();row.expires=0;expect(await inspectAdminReset(sql,token)).toBe('expired');await expect(consumeAdminReset(sql,token,'Password1')).rejects.toThrow();row.active=false;expect(await inspectAdminReset(sql,token)).toBe('invalid');await expect(issueAdminSetup(sql,config,row.id)).rejects.toThrow();expect(await inspectAdminReset(sql,'bad')).toBe('invalid');expect(revoked).toBe(false);});
it('invalidates failed delivery and replaces earlier reset tokens',async()=>{const first=await setup();const second=await setup();expect(await inspectAdminReset(sql,first)).toBe('invalid');expect(await inspectAdminReset(sql,second)).toBe('valid');vi.mocked(sendTransactional).mockRejectedValueOnce(new Error('fixture delivery failure'));await expect(setup()).rejects.toThrow();expect(row.digest).toBeNull();});
