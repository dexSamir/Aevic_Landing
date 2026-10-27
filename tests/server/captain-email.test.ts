import {beforeEach,describe,expect,it,vi} from 'vitest';
import nodemailer from 'nodemailer';
import {resetMailer} from '../../server/captain/email';
import {readConfig} from '../../server/config';

const {sendMail}=vi.hoisted(()=>({sendMail:vi.fn()}));
vi.mock('nodemailer',()=>({default:{createTransport:vi.fn(()=>({sendMail,close:vi.fn()}))}}));
const smtp={host:'smtp.example.test',port:587,user:'sender@example.test',pass:'fixture-only'};
const config={supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'fixture',siteUrl:'https://example.test',secureCookies:true,emailFrom:smtp.user};
beforeEach(()=>{vi.clearAllMocks();sendMail.mockResolvedValue({accepted:['captain@example.test']});});
describe('captain SMTP transport',()=>{
 it('loads complete application SMTP settings',()=>{
  const actual=readConfig({SUPABASE_URL:config.supabaseUrl,SUPABASE_PUBLISHABLE_KEY:'fixture',SMTP_HOST:smtp.host,SMTP_PORT:'587',SMTP_USER:smtp.user,SMTP_PASS:smtp.pass});
  expect(actual.smtp).toEqual(smtp);

 });
 it('requires validated TLS, disables content logging and sends one reset link',async()=>{
  const mailer=resetMailer({...config,smtp});
  expect(nodemailer.createTransport).not.toHaveBeenCalled();
  const link='https://example.test/reset-password#token=fixture';
  await mailer.send('captain@example.test',link);
  const options=vi.mocked(nodemailer.createTransport).mock.calls.at(-1)![0];
  expect(options).toMatchObject({secure:false,requireTLS:true,tls:{rejectUnauthorized:true},logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({to:['captain@example.test'],from:smtp.user,text:expect.stringContaining(link)}));
 });
 it('uses implicit TLS on port 465 and redacts provider failures',async()=>{
  const mailer=resetMailer({...config,smtp:{...smtp,port:465}});
  sendMail.mockRejectedValue(new Error('fixture-private-provider-response'));
  await expect(mailer.send('captain@example.test','https://example.test')).rejects.toMatchObject({code:'EMAIL_DELIVERY_FAILED',message:'EMAIL_DELIVERY_FAILED'});
  expect(vi.mocked(nodemailer.createTransport).mock.calls.at(-1)![0]).toMatchObject({secure:true,tls:{rejectUnauthorized:true}});
 });
});

it('shares the transport and sender identity with verification and closes connections',async()=>{
 const {sendVerification,sendTransactional}=await import('../../server/platform/email');
 const identity={...config,smtp,emailFromName:'AEVIC Esports',emailReplyTo:'support@example.test'};
 await sendVerification(identity,'captain@example.test','https://example.test/verify-email#token=fixture');
 await resetMailer(identity).send('captain@example.test','https://example.test/reset-password#token=fixture');
 expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
 for(const [message] of sendMail.mock.calls)expect(message).toMatchObject({from:'"AEVIC Esports" <sender@example.test>',replyTo:'support@example.test'});
 for(const result of vi.mocked(nodemailer.createTransport).mock.results)expect(result.value.close).toHaveBeenCalledOnce();
 await expect(sendTransactional(config,'captain@example.test',{subject:'test',text:'test'})).rejects.toMatchObject({code:'EMAIL_NOT_CONFIGURED'});
 expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
});
