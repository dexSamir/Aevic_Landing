import {expect,it} from 'vitest';
import {Hono} from 'hono';
import type {TransactionSql} from 'postgres';
import type {Env} from '../../server/types';
import {readConfig} from '../../server/config';
import {issueTokens,saveTokens} from '../../server/auth/platform-tokens';
const env={SUPABASE_URL:'https://nmjjibifcuzjlsvfcaaz.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture',PUBLIC_SITE_URL:'https://fixture.test',AEVIC_DATABASE_URL:'postgres://fixture:fixture@localhost/fixture',AEVIC_SESSION_SECRET:'isolated-session-secret-at-least-32-characters'};
it('keeps configured Google credentials dormant without changing legacy authentication settings',()=>{
 const config=readConfig({...env,AEVIC_GOOGLE_ENABLED:'false',AEVIC_SESSION_MODE:'legacy',GOOGLE_CLIENT_ID:'configured-client',GOOGLE_CLIENT_SECRET:'configured-secret'});
 expect(config.google).toBeUndefined();expect(config.sessionMode).toBe('legacy');
 expect(config.databaseUrl).toBe(env.AEVIC_DATABASE_URL);expect(config.sessionSecret).toBe(env.AEVIC_SESSION_SECRET);
});
it('defaults to compatibility and requires an explicit transition cutoff and signing configuration',()=>{
 expect(readConfig(env).sessionMode).toBe('legacy');
 expect(()=>readConfig({...env,AEVIC_SESSION_MODE:'transition'})).toThrow();
 expect(()=>readConfig({...env,AEVIC_SESSION_MODE:'tokens',AEVIC_SESSION_SECRET:'short'})).toThrow();
 expect(readConfig({...env,AEVIC_SESSION_MODE:'transition',AEVIC_LEGACY_SESSION_UNTIL:'2026-10-12T00:00:00Z'}).sessionMode).toBe('transition');
 expect(readConfig({...env,AEVIC_SESSION_MODE:'tokens'}).secureCookies).toBe(true);
});
it('sets a strictly scoped Secure HttpOnly refresh cookie and persists only digests',async()=>{
 const values:unknown[][]=[];const tx=((_parts:TemplateStringsArray,...args:unknown[])=>{values.push(args);return Promise.resolve([]);}) as unknown as TransactionSql;
 const app=new Hono<Env>();app.post('/login',async c=>{c.set('config',readConfig({...env,AEVIC_SESSION_MODE:'tokens'}));const result=await issueTokens(c,tx,{accountId:'1'},'fixture-credential-hash',true,false);saveTokens(c,result);return c.json({accessToken:result.accessToken,accessExpiresAt:result.accessExpiresAt});});
 const response=await app.request('/login',{method:'POST'}),cookie=response.headers.get('set-cookie')!;expect(cookie).toContain('__Secure-aevic-refresh-v2=');for(const flag of ['Path=/api/auth','Secure','HttpOnly','SameSite=Strict','Max-Age=2592000'])expect(cookie).toContain(flag);expect(cookie).not.toContain('Domain=');
 const refresh=/__Secure-aevic-refresh-v2=([^;]+)/.exec(cookie)![1];expect(JSON.stringify(values)).not.toContain(refresh);expect(JSON.stringify(values)).not.toContain('fixture-credential-hash');expect(await response.text()).not.toContain(refresh);
});
