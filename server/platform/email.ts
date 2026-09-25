import type {ServerConfig} from '../config';
import {ServiceError} from '../errors';
/** Plain transactional email; no remote resources or untrusted markup. */
export async function sendVerification(config:ServerConfig,to:string,link:string){
 const message={subject:'AEVIC — E-poçt ünvanınızı təsdiqləyin',text:`AEVIC hesabınızın e-poçt ünvanını təsdiqləmək üçün bu keçidi açın:\n\n${link}\n\nKeçid 30 dəqiqə etibarlıdır. Bu sorğunu siz göndərməmisinizsə, məktubu nəzərə almayın.`};
 return sendTransactional(config,to,message);
}
export async function sendTransactional(config:ServerConfig,to:string,message:{subject:string;text:string}){
 if(!config.emailFrom)throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
 if(config.smtp){
  const {default:nodemailer}=await import('nodemailer'),s=config.smtp;
  const transport=nodemailer.createTransport({host:s.host,port:s.port,secure:s.port===465,requireTLS:true,tls:{rejectUnauthorized:true},auth:{user:s.user,pass:s.pass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000,dnsTimeout:8000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  try{await transport.sendMail({from:config.emailFrom,to:[to],...message});}catch{throw new ServiceError(503,'EMAIL_DELIVERY_FAILED');}finally{transport.close();}
 }else if(config.resendKey){const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.resendKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.emailFrom,to:[to],...message}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw new ServiceError(503,'EMAIL_DELIVERY_FAILED');}
 else throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
}
