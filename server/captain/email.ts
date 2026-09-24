import type {ResetMailer} from './service';
import {ServiceError} from '../errors';
import nodemailer from 'nodemailer';
import type {ServerConfig} from '../config';
import {passwordResetEmail} from './reset-email';

export function resetMailer(config:ServerConfig):ResetMailer {
 return config.smtp?new SmtpResetMailer(config.smtp,config.emailFrom??''):new ResendResetMailer(config.resendKey??'',config.emailFrom??'');
}
export class SmtpResetMailer implements ResetMailer {
 private transport;
 constructor(smtp:NonNullable<ServerConfig['smtp']>,private from:string) {
  this.transport=nodemailer.createTransport({host:smtp.host,port:smtp.port,
   secure:smtp.port===465,requireTLS:true,tls:{rejectUnauthorized:true},
   auth:{user:smtp.user,pass:smtp.pass},connectionTimeout:8000,greetingTimeout:8000,
   socketTimeout:10000,dnsTimeout:8000,logger:false,debug:false,
   disableFileAccess:true,disableUrlAccess:true});
 }
 async send(to:string,link:string) {
  if(!this.from)throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
  try {
   await this.transport.sendMail({from:this.from,to:[to],...passwordResetEmail(link)});
  }catch{throw new ServiceError(503,'EMAIL_DELIVERY_FAILED');}
 }
}
export class ResendResetMailer implements ResetMailer {
 constructor(private apiKey:string,private from:string) {}
 async send(to:string,link:string) {
  if(!this.apiKey||!this.from)throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:this.from,to:[to],...passwordResetEmail(link)}),signal:AbortSignal.timeout(1500)});
  // Provider bodies can contain message contents/addresses; never log or forward them.
  if(!response.ok)throw new ServiceError(503,'EMAIL_DELIVERY_FAILED');
 }
}
