import type {ServerConfig} from './config';
import {ServiceError} from './errors';
import {emailIdentity} from './emailIdentity';

/** Application tokens remain owned by AEVIC, independently of Supabase Auth mail. */
export async function sendTransactional(config:ServerConfig,to:string,message:{subject:string;text:string;html?:string}) {
 if(!config.smtp||!config.emailFrom)throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
 const {default:nodemailer}=await import('nodemailer'),s=config.smtp;
 let transport: ReturnType<typeof nodemailer.createTransport> | undefined;
 try {
  transport=nodemailer.createTransport({host:s.host,port:s.port,secure:s.port===465,requireTLS:true,tls:{rejectUnauthorized:true},auth:{user:s.user,pass:s.pass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000,dnsTimeout:8000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  await transport.sendMail({...emailIdentity(config),to:[to],...message});
 }catch{throw new ServiceError(503,'EMAIL_DELIVERY_FAILED');}
 finally{transport?.close();}
}
