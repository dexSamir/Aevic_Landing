import type {ServerConfig} from './config';
import {ServiceError} from './errors';
import {emailIdentity} from './emailIdentity';

// SMTP can lose the final acceptance reply after the server has accepted DATA.
// Preserve only the delivery disposition, never the provider response or address.
export class MailDeliveryError extends ServiceError {
 constructor(readonly disposition: 'retry' | 'failed' | 'uncertain') { super(503, 'EMAIL_DELIVERY_FAILED'); }
}

function smtpDisposition(error: unknown): MailDeliveryError['disposition'] {
 const e = error as { responseCode?: number; code?: string; command?: string; errno?: string } | null;
 if (e?.responseCode && e.responseCode >= 400 && e.responseCode < 500) return 'retry';
 if (e?.responseCode && e.responseCode >= 500 && e.responseCode < 600) return 'failed';
 if (['EDNS', 'EAUTH', 'ETLS'].includes(e?.code ?? '') || ['AUTH', 'MAIL FROM', 'RCPT TO'].includes(e?.command ?? '')) return 'retry';
 if (e?.errno === 'ECONNREFUSED' || e?.code === 'ECONNREFUSED') return 'retry';
 return 'uncertain';
}

/** Application tokens remain owned by AEVIC, independently of Supabase Auth mail. */
export async function sendTransactional(config:ServerConfig,to:string,message:{subject:string;text:string;html?:string;messageId?:string}) {
 if(!config.smtp||!config.emailFrom)throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
 const {default:nodemailer}=await import('nodemailer'),s=config.smtp;
 let transport: ReturnType<typeof nodemailer.createTransport> | undefined;
 try {
  transport=nodemailer.createTransport({host:s.host,port:s.port,secure:s.port===465,requireTLS:true,tls:{rejectUnauthorized:true},auth:{user:s.user,pass:s.pass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000,dnsTimeout:8000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  await transport.sendMail({...emailIdentity(config),to:[to],...message});
 }catch(error){throw new MailDeliveryError(smtpDisposition(error));}
 finally{transport?.close();}
}
