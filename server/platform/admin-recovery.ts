import {Hono} from 'hono';
import {randomBytes} from 'node:crypto';
import {deleteCookie} from 'hono/cookie';
import {z} from 'zod';
import type {Sql} from 'postgres';
import type {Env} from '../types';
import type {ServerConfig} from '../config';
import {body,email} from '../validation/input';
import {hashPassword} from '../captain/crypto';
import {createAttemptLimiter} from '../captain/limit';
import {ServiceError} from '../errors';
import {platform,tokenDigest,adminCookieName} from './context';
import {sendTransactional} from './email';
import {transaction,audit} from './competition';

const tokenPattern=/^adm\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;
const password=z.string().min(8).max(128).regex(/[A-ZƏÖÜĞÇŞİ]/).regex(/[0-9]/);
export async function issueAdminSetup(sql:Sql,config:ServerConfig,id:string){
 const token=`adm.${id}.${randomBytes(32).toString('base64url')}`,digest=tokenDigest(token);
 const rows=await sql`update aevic_platform.admin_accounts set reset_digest=${digest},reset_expires_at=now()+interval '30 minutes' where id=${id} and active returning email`;
 if(!rows.length)throw new ServiceError(404,'NOT_FOUND');
 try{await sendTransactional(config,rows[0].email,{subject:'AEVIC — Administrator hesabına giriş',text:`Administrator hesabınız üçün şifrə yaratmaq və ya yeniləmək üçün bu keçidi açın:\n\n${config.siteUrl}/reset-password#token=${token}\n\nKeçid yalnız bir dəfə istifadə edilə bilər və 30 dəqiqə etibarlıdır. Sorğunu siz göndərməmisinizsə, məktubu nəzərə almayın.`});}
 catch(error){await sql`update aevic_platform.admin_accounts set reset_digest=null,reset_expires_at=null where id=${id} and reset_digest=${digest}`;throw error;}
}
export async function inspectAdminReset(sql:Sql,token:string){
 if(!tokenPattern.test(token))return 'invalid';
 const [row]=await sql`select reset_expires_at>now() as valid from aevic_platform.admin_accounts where id=${tokenPattern.exec(token)![1]} and reset_digest=${tokenDigest(token)} and active`;
 return row?row.valid?'valid':'expired':'invalid';
}
export async function consumeAdminReset(sql:Sql,token:string,newPassword:string){
 if(await inspectAdminReset(sql,token)!=='valid')throw new ServiceError(422,'INVALID_RESET_TOKEN');
 const hash=await hashPassword(password.parse(newPassword));
 await transaction(sql,async tx=>{
  const [row]=await tx`update aevic_platform.admin_accounts set password_hash=${hash},email_verified_at=coalesce(email_verified_at,now()),reset_digest=null,reset_expires_at=null where id=${tokenPattern.exec(token)![1]} and reset_digest=${tokenDigest(token)} and reset_expires_at>now() and active returning id`;
  if(!row)throw new ServiceError(422,'INVALID_RESET_TOKEN');
  await tx`update aevic_platform.sessions set revoked_at=now() where admin_id=${row.id} and revoked_at is null`;
  await audit(tx,{adminId:row.id},'admin.password-reset','admin',row.id);
 });
}
const app=new Hono<Env>(),limit=createAttemptLimiter();
app.post('/auth/password-reset',async(c,next)=>{
 const input=await body(c,z.object({email}).strict()),sql=platform(c).sql;
 const [row]=await sql`select id from aevic_platform.admin_accounts where email=${input.email} and active`;
 if(!row)return next();
 limit('admin-reset-ip',c.req.header('x-nf-client-connection-ip')??'local',5);
 try{limit('admin-reset-account',input.email,3);}catch{return c.body(null,204);}
 const config=c.get('config');
 if(!(config.smtp||config.resendKey)||!z.email().safeParse(config.emailFrom).success)throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
 const start=Date.now();
 try{await issueAdminSetup(sql,config,row.id);}catch{console.warn('AEVIC_RESET_DELIVERY_FAILED');}
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,2000-(Date.now()-start))));
 return c.body(null,204);
});
app.post('/auth/password-reset/inspect',async(c,next)=>{
 const input=await body(c,z.object({token:z.string().max(100)}).strict());if(!input.token.startsWith('adm.'))return next();
 limit('admin-reset-inspect',c.req.header('x-nf-client-connection-ip')??'local',10);
 return c.json({state:await inspectAdminReset(platform(c).sql,input.token)});
});
app.post('/auth/password-reset/confirm',async(c,next)=>{
 const input=await body(c,z.object({token:z.string().max(100),password}).strict());if(!input.token.startsWith('adm.'))return next();
 limit('admin-reset-confirm',c.req.header('x-nf-client-connection-ip')??'local',10);
 await consumeAdminReset(platform(c).sql,input.token,input.password);
 deleteCookie(c,adminCookieName(c),{path:'/',secure:c.get('config').secureCookies});return c.body(null,204);
});
export default app;
