import {describe,it,expect,vi,afterEach} from 'vitest';
import {passwordResetEmail} from '../../server/captain/reset-email';
describe('AEVIC reset email',()=>{
 afterEach(()=>vi.unstubAllEnvs());
 it('rejects local links in production and hosted deployments',()=>{
  for(const env of ['NODE_ENV','CONTEXT']){
   vi.stubEnv(env,env==='NODE_ENV'?'production':'deploy-preview');
   for(const host of ['localhost','127.0.0.1','[::1]'])expect(()=>passwordResetEmail(`https://${host}/reset-password`)).toThrow('INVALID_RESET_ORIGIN');
   expect(passwordResetEmail('https://example.test/reset-password').html).toContain('https://example.test/reset-password');
   vi.unstubAllEnvs();
  }
 });
 it('provides branded HTML and a plain-text alternative without token-bearing previews or assets',()=>{
  const link='https://example.test/reset-password#token=16.fixture';
  const mail=passwordResetEmail(link);
  expect(mail.html).toContain('Şifrəni yenilə');expect(mail.text).toContain(link);
  expect(mail.html).toContain('#101014');expect(mail.html).toContain('#F3C450');expect(mail.html).toContain('30 dəqiqə');
  expect(mail.html.match(/href=/g)).toHaveLength(6);
  expect(mail.html).not.toMatch(/<script|<iframe|utm_|onclick|@font-face/i);
  expect(mail.html.split('<table')[0]).not.toContain('16.fixture');expect(mail.subject).not.toContain('fixture');
  expect(mail.html).toContain('role="presentation"');expect(mail.html).toContain('max-width:480px');
 });
 it('escapes the actual href and rejects unsafe origins',()=>{
  const mail=passwordResetEmail('https://example.test/reset-password?a=1&b=2#token=16.fixture');
  expect(mail.html).toContain('a=1&amp;b=2');expect(()=>passwordResetEmail('javascript:alert(1)')).toThrow();
 });
});
