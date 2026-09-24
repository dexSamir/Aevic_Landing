import {beforeEach,describe,expect,it,vi} from 'vitest';
import nodemailer from 'nodemailer';
import {resetMailer,SmtpResetMailer,ResendResetMailer} from '../../server/captain/email';
import {readConfig} from '../../server/config';

const {sendMail}=vi.hoisted(()=>({sendMail:vi.fn()}));
vi.mock('nodemailer',()=>({default:{createTransport:vi.fn(()=>({sendMail}))}}));
const smtp={host:'smtp.example.test',port:587,user:'sender@example.test',pass:'fixture-only'};
const config={supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'fixture',siteUrl:'https://example.test',secureCookies:true,emailFrom:smtp.user};
beforeEach(()=>{vi.clearAllMocks();sendMail.mockResolvedValue({accepted:['captain@example.test']});});
describe('captain SMTP transport',()=>{
 it('uses complete existing SMTP settings ahead of an unusable Resend key',()=>{
  const actual=readConfig({SUPABASE_URL:config.supabaseUrl,SUPABASE_PUBLISHABLE_KEY:'fixture',SMTP_HOST:smtp.host,SMTP_PORT:'587',SMTP_USER:smtp.user,SMTP_PASS:smtp.pass,RESEND_API_KEY:'fixture'});
  expect(actual.smtp).toEqual(smtp);
  expect(resetMailer(actual)).toBeInstanceOf(SmtpResetMailer);
  expect(resetMailer({...config,resendKey:'fixture'})).toBeInstanceOf(ResendResetMailer);
 });
 it('requires validated TLS, disables content logging and sends one reset link',async()=>{
  const mailer=new SmtpResetMailer(smtp,smtp.user);
  expect(nodemailer.createTransport).not.toHaveBeenCalled();
  const link='https://example.test/reset-password#token=fixture';
  await mailer.send('captain@example.test',link);
  const options=vi.mocked(nodemailer.createTransport).mock.calls.at(-1)![0];
  expect(options).toMatchObject({secure:false,requireTLS:true,tls:{rejectUnauthorized:true},logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({to:['captain@example.test'],from:smtp.user,text:expect.stringContaining(link)}));
 });
 it('uses implicit TLS on port 465 and redacts provider failures',async()=>{
  const mailer=new SmtpResetMailer({...smtp,port:465},smtp.user);
  sendMail.mockRejectedValue(new Error('fixture-private-provider-response'));
  await expect(mailer.send('captain@example.test','https://example.test')).rejects.toMatchObject({code:'EMAIL_DELIVERY_FAILED',message:'EMAIL_DELIVERY_FAILED'});
  expect(vi.mocked(nodemailer.createTransport).mock.calls.at(-1)![0]).toMatchObject({secure:true,tls:{rejectUnauthorized:true}});
 });
});
