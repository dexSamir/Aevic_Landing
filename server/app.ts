import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { ZodError } from 'zod';
import type { Env } from './types';
import { readConfig, type ServerConfig } from './config';
import { client } from './db';
import { ServiceError } from './errors';
import production from './routes/production';
import {captainRoutes,type CaptainDependencies} from './routes/captain';

export function createApp(config?:ServerConfig, env: NodeJS.ProcessEnv = process.env, captainDependencies:CaptainDependencies = {}) {
 const app=new Hono<Env>().basePath('/api');
 app.use('*',async(c,next)=>{
  c.set('requestId',crypto.randomUUID());c.header('X-Request-Id',c.get('requestId'));c.header('Cache-Control','private, no-store');c.header('X-Content-Type-Options','nosniff');c.header('Referrer-Policy','no-referrer');
  let settings:ServerConfig;try{settings=config??readConfig(env);}catch{throw new ServiceError(503,'SERVER_NOT_CONFIGURED');}
  c.set('config',settings);c.set('db',client(settings));
  if(!['GET','HEAD','OPTIONS'].includes(c.req.method)) {
   const origin=c.req.header('origin');
   // Same-origin BFF only; no permissive CORS or cookie-bearing cross-site writes.
   if(origin!==settings.siteUrl || c.req.header('sec-fetch-site')==='cross-site')throw new ServiceError(403,'ORIGIN_REJECTED');
   if(!c.req.header('content-type')?.startsWith('application/json') && !c.req.header('content-type')?.startsWith('multipart/form-data') && c.req.header('content-length')!=='0' && c.req.header('content-length')!=null) throw new ServiceError(415,'UNSUPPORTED_CONTENT_TYPE');
  }
  await next();
 });
 app.use('*',bodyLimit({maxSize:4_100_000,onError:c=>c.json({code:'FILE_TOO_LARGE',requestId:c.get('requestId')},413)}));
 app.route('/',captainRoutes(captainDependencies));app.route('/',production);
 app.notFound(c=>c.json({code:'NOT_FOUND',message:'Məlumat tapılmadı.',requestId:c.get('requestId')},404));
 app.onError((error,c)=>{
  const e=error instanceof ZodError?new ServiceError(422,'VALIDATION_ERROR',Object.fromEntries(error.issues.map(i=>[i.path.join('.'),'Dəyəri yoxlayın.']))):error instanceof ServiceError?error:new ServiceError(503,'SERVICE_UNAVAILABLE');
  // Deliberately no request body/error logging: auth, room and private fields can occur in errors.
  return c.json({code:e.code,message:e.status>=500?'Xidmət müvəqqəti əlçatan deyil.':'Sorğu tamamlanmadı.',fieldErrors:e.fieldErrors,requestId:c.get('requestId')},e.status);
 });
 return app;
}
