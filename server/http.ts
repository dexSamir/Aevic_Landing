import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { ZodError } from 'zod';
import type { Env } from './types';
import { readConfig, type ServerConfig } from './config';
import { client } from './db';
import { ServiceError } from './errors';

/** Shared same-origin, bounded-body and sanitized-error HTTP boundary. */
export function createHttpApp(config?:ServerConfig, env:NodeJS.ProcessEnv=process.env) {
 const app=new Hono<Env>().basePath('/api');
 let firstRequest=true;
 app.use('*',async(c,next)=>{
  const started=performance.now(),coldStart=firstRequest;firstRequest=false;
  await next();
  const durationMs=Math.round((performance.now()-started)*10)/10;
  c.header('Server-Timing',`app;dur=${durationMs}`);
  // Route templates only: never log URLs, query strings, bodies, cookies or errors.
  console.info(JSON.stringify({event:'api_request',requestId:c.get('requestId'),route:c.req.routePath??'unmatched',method:c.req.method,status:c.res.status,durationMs,coldStart,version:/^[a-f0-9]{7,40}$/i.test(env.COMMIT_REF??'')?env.COMMIT_REF:/^[a-zA-Z0-9_-]{1,80}$/.test(env.DEPLOY_ID??'')?env.DEPLOY_ID:env.NETLIFY?'netlify-unknown':'local',code:c.get('operationalError'),database:c.get('platform')?.metrics,databaseFailure:c.get('databaseFailure')}));
 });
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
 app.notFound(c=>c.json({code:'NOT_FOUND',message:'Məlumat tapılmadı.',requestId:c.get('requestId')},404));
 app.onError((error,c)=>{
  const databaseCode=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  const timedOut=['CONNECT_TIMEOUT','ETIMEDOUT','57014'].includes(databaseCode);
  const e=error instanceof ZodError?new ServiceError(422,'VALIDATION_ERROR',Object.fromEntries(error.issues.map(i=>[i.path.join('.'),'Dəyəri yoxlayın.']))):error instanceof ServiceError?error:new ServiceError(timedOut?504:503,timedOut?'REQUEST_TIMEOUT':'SERVICE_UNAVAILABLE');
  c.set('operationalError',e.code);
  // Allowlisted error codes only: never exception messages, SQL or connection URLs.
  const cause=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  if(['CONNECT_TIMEOUT','CONNECTION_CLOSED','CONNECTION_ENDED','CONNECTION_DESTROYED','ECONNRESET','ECONNREFUSED','ETIMEDOUT','57P01','57P02','57P03','53300','53400','57014','55P03','42501','42P01','42703','XX000'].includes(cause))c.set('databaseFailure',cause);
  if(e.status>=500){
   let database: {endpoint:string;port:string}|undefined;
   try{const url=new URL(c.get('config')?.databaseUrl??'');database={endpoint:url.hostname.endsWith('.pooler.supabase.com')?'supavisor':'postgres',port:url.port||'5432'};}catch{}
   const errorType=['PostgresError','TypeError','RangeError','ServiceError','Error'].includes(error.name)?error.name:'Error';
   const errorCode=/^(?:[0-9A-Z]{5}|CONNECT_TIMEOUT|CONNECTION_CLOSED|CONNECTION_ENDED|CONNECTION_DESTROYED|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|CERT_HAS_EXPIRED|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|ERR_TLS_CERT_ALTNAME_INVALID)$/.test(cause)?cause:undefined;
   console.error(JSON.stringify({event:'api_failure',requestId:c.get('requestId'),route:c.req.routePath??'unmatched',method:c.req.method,errorType,errorCode,code:e.code,database,runtime:env.AWS_LAMBDA_FUNCTION_NAME?'lambda':env.NETLIFY?'netlify':'node'}));
  }
  if(e.status===503)c.header('Retry-After','3');
  if(/(?:NOT_CONFIGURED|CONTRACT_UNAVAILABLE|PERMISSIONS_UNSAFE)$/.test(e.code)||['42501','42P01','42703'].includes(cause))c.header('X-Retryable','false');
  // Deliberately no request body/error logging: auth, room and private fields can occur in errors.
  return c.json({code:e.code,message:e.status>=500?'Xidmət müvəqqəti əlçatan deyil.':'Sorğu tamamlanmadı.',fieldErrors:e.fieldErrors,requestId:c.get('requestId')},e.status);
 });
 return app;
}
