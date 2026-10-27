import { expect, it } from 'vitest';
import { emailIdentity } from '../../server/emailIdentity';
import { readConfig } from '../../server/config';
const base={SUPABASE_URL:'https://nmjjibifcuzjlsvfcaaz.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture'};
it('separates sender identity from SMTP authentication',()=>{
 const config=readConfig({...base,SMTP_HOST:'smtp.example.test',SMTP_USER:'transport-user',SMTP_PASS:'fixture',EMAIL_FROM:'sender@example.test',EMAIL_FROM_NAME:'AEVIC Esports',EMAIL_REPLY_TO:'support@example.test'});
 expect(config.smtp?.user).toBe('transport-user');
 expect(emailIdentity(config)).toEqual({from:'"AEVIC Esports" <sender@example.test>',replyTo:'support@example.test'});
});
it('preserves legacy From and rejects header injection or invalid reply addresses',()=>{
 expect(emailIdentity({emailFrom:'AEVIC <old@example.test>'})).toEqual({from:'AEVIC <old@example.test>'});
 expect(()=>readConfig({...base,EMAIL_FROM:'sender@example.test',EMAIL_FROM_NAME:'AEVIC\r\nBcc:other@example.test'})).toThrow();
 expect(()=>readConfig({...base,EMAIL_REPLY_TO:'not-an-email'})).toThrow();
});
