import {supabaseGoogleUrl,exchangeSupabaseGoogle} from './supabase-google';
import {Hono} from 'hono';
import {getCookie,setCookie} from 'hono/cookie';
import {z} from 'zod';
import type {Env,ApiContext} from '../types';
import {body} from '../validation/input';
import {ServiceError} from '../errors';
import {platform,tokenDigest,captainCookieName} from '../platform/context';
import {transaction,audit} from '../platform/competition';
import {lockAccount} from '../platform/account-store';
import {consumeFactor} from '../platform/mfa';
import {verifyPassword,makeSession} from '../captain/crypto';
import {issueTokens,saveTokens,tokensEnabled} from './platform-tokens';
import {persistentLimit} from './persistent-limit';
import {randomToken,pkceChallenge,exchangeGoogleCode} from './google-provider';
import {googleCookie,googleBrowser,clearGoogle,continuation} from './google-continuation';
import {selectWorkspace} from '../platform/workspace';
import type {Actor} from '../platform/repository';
import {authorizedAuthReturn} from '../../src/utils/authReturn';
import {saveGoogleReturn,readGoogleReturn,clearGoogleReturn} from './google-return';
const app=new Hono<Env>();
app.get('/auth/google/status',c=>c.json({enabled:Boolean(c.get('config').google)}));
app.post('/auth/google/start',async c=>{
 const config=c.get('config'),google=config.google;if(!google)throw new ServiceError(503,'GOOGLE_NOT_CONFIGURED');
 const input=await body(c,z.object({returnTo:z.string().max(2048).optional()}).strict());
 saveGoogleReturn(c,input.returnTo);
 const sql=platform(c).sql;
 await persistentLimit(c,sql,'google-start',c.req.header('x-nf-client-connection-ip')??'local',10,true);
 const state=randomToken(),browser=randomToken(),nonce=(google.provider==='supabase'?'supabase:':'')+randomToken(),verifier=randomToken();
 await sql`delete from aevic_platform.google_flows where expires_at<now()`;
 const old=googleBrowser(c);if(old)await sql`delete from aevic_platform.google_flows where browser_digest=${tokenDigest(old)}`;
 await sql`insert into aevic_platform.google_flows(token_digest,browser_digest,nonce,verifier,expires_at) values(${tokenDigest(state)},${tokenDigest(browser)},${nonce},${verifier},now()+interval '10 minutes')`;
 setCookie(c,googleCookie(c),browser,{path:'/',httpOnly:true,secure:config.secureCookies,sameSite:'Lax',maxAge:600});
 if(google.provider==='supabase')return c.json({url:supabaseGoogleUrl(config,state,verifier).href});
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:google.clientId,redirect_uri:config.siteUrl+'/api/auth/google/callback',response_type:'code',scope:'openid email profile',state,nonce,code_challenge:pkceChallenge(verifier),code_challenge_method:'S256',prompt:'select_account'}).toString();
 return c.json({url:url.href});
});
app.get('/auth/google/callback',async c=>{
 const config=c.get('config'),browser=googleBrowser(c),state=c.req.query('state');
 try{
  if(!config.google||!browser||!state||state.length>128)throw new ServiceError(401,'GOOGLE_STATE_INVALID');
  // Delete before network exchange: even concurrent callback replays get one attempt.
  const [flow]=await platform(c).sql`delete from aevic_platform.google_flows where token_digest=${tokenDigest(state)} and browser_digest=${tokenDigest(browser)} and phase='authorization' and expires_at>clock_timestamp() returning *`;
  if(!flow||c.req.query('error'))throw new ServiceError(401,'GOOGLE_STATE_INVALID');
  const code=c.req.query('code');if(!code||code.length>4096)throw new ServiceError(401,'GOOGLE_STATE_INVALID');
  if(flow.nonce.startsWith('supabase:')!==(config.google.provider==='supabase'))throw new ServiceError(401,'GOOGLE_STATE_INVALID');
  const identity=config.google.provider==='supabase'
   ?await exchangeSupabaseGoogle(config,code,flow.verifier)
   :await exchangeGoogleCode(config.google,code,flow.verifier,flow.nonce,config.siteUrl+'/api/auth/google/callback');
  const next=randomToken();
  await platform(c).sql`insert into aevic_platform.google_flows(token_digest,browser_digest,nonce,verifier,expires_at,phase,subject,email,first_name,last_name) values(${tokenDigest(randomToken())},${tokenDigest(next)},'','',now()+interval '10 minutes','continuation',${identity.subject},${identity.email},${identity.firstName},${identity.lastName})`;
  setCookie(c,googleCookie(c),next,{path:'/',httpOnly:true,secure:config.secureCookies,sameSite:'Lax',maxAge:600});
  const linked=await platform(c).sql`select account_id from aevic_platform.google_identities where subject=${identity.subject}`;
  if(linked.length){
   try { const result=await completeGoogle(c,next,{remember:false},false); return c.redirect(result.redirectTo,303); }
   catch(error){ if(error instanceof ServiceError&&error.code==='MFA_REQUIRED')return c.redirect('/login?google=continue&mfa=required',303); throw error; }
  }
  const matching=await platform(c).sql`select id from aevic_platform.account_identity where lower(btrim(email))=${identity.email}`;
  return c.redirect(linked.length||matching.length?'/login?google=continue':'/register?google=continue',303);
 }catch{
  clearGoogle(c);clearGoogleReturn(c);return c.redirect('/login?google=failed',303);
 }
});
app.get('/auth/google/continuation',async c=>{
 if(!c.get('config').google)throw new ServiceError(503,'GOOGLE_NOT_CONFIGURED');
 const browser=googleBrowser(c);if(!browser)throw new ServiceError(401,'GOOGLE_CONTINUATION_EXPIRED');
 const sql=platform(c).sql,flow=await continuation(sql,browser);
 const linked=await sql`select account_id from aevic_platform.google_identities where subject=${flow.subject}`;
 const matching=await sql`select id from aevic_platform.account_identity where lower(btrim(email))=${flow.email}`;
 return c.json({email:flow.email,firstName:flow.first_name,lastName:flow.last_name,mode:linked.length?'login':matching.length?'link':'register'});
});
app.post('/auth/google/complete',async c=>{
 const config=c.get('config');if(!config.google)throw new ServiceError(503,'GOOGLE_NOT_CONFIGURED');
 const browser=googleBrowser(c);if(!browser)throw new ServiceError(401,'GOOGLE_CONTINUATION_EXPIRED');
 const input=await body(c,z.object({password:z.string().max(128).optional(),otp:z.string().max(40).optional(),remember:z.boolean().default(false)}).strict());
 return c.json(await completeGoogle(c,browser,input,true));
});
async function completeGoogle(c:ApiContext,browser:string,input:{password?:string;otp?:string;remember:boolean},allowLink:boolean){
 const config=c.get('config');
 const sql=platform(c).sql;
 await persistentLimit(c,sql,'google-complete',c.req.header('x-nf-client-connection-ip')??'local',10,true);
 const pending=await continuation(sql,browser);
 await persistentLimit(c,sql,'google-account',pending.subject,10,true);
 const result=await transaction(sql,async tx=>{
  const flow=await continuation(tx,browser,true);
  await tx`select pg_advisory_xact_lock(hashtextextended(${'google:'+flow.subject},0))`;
  const [linked]=await tx`select account_id::text from aevic_platform.google_identities where subject=${flow.subject}`;
  const matching=linked?[]:await tx`select id::text from aevic_platform.account_identity where lower(btrim(email))=${flow.email} limit 2`;
  if(!linked&&(!allowLink||matching.length!==1))throw new ServiceError(409,'GOOGLE_REGISTRATION_REQUIRED');
  const row=await lockAccount(tx,linked?.account_id??matching[0].id);
  if(row.status==='banned')throw new ServiceError(401,'LOGIN_FAILED');
  if(!linked&&(String(row.email).trim().toLowerCase()!==flow.email||!await verifyPassword(input.password??'',row.password_hash)))throw new ServiceError(401,'LOGIN_FAILED');
  const verified=await consumeFactor(tx,{teamId:row.id},config.sessionSecret??'',input.otp);
  if(!linked){
   const conflict=await tx`select subject from aevic_platform.google_identities where account_id=${row.id}`;
   if(conflict.length)throw new ServiceError(409,'GOOGLE_ALREADY_LINKED');
   await tx`insert into aevic_platform.google_identities(subject,account_id) values(${flow.subject},${row.id})`;
   await audit(tx,{accountId:row.id},'account.google-link','account',row.id);
  }
  await tx`update aevic_platform.google_flows set phase='consumed' where token_digest=${flow.token_digest}`;
  const identity:Actor={accountId:row.id};
  await selectWorkspace(tx,identity,getCookie(c,'aevic-workspace'));
  const redirectTo=authorizedAuthReturn(readGoogleReturn(c),Boolean(identity.teamId));
  if(tokensEnabled(c))return {redirectTo,issued:await issueTokens(c,tx,{accountId:row.id},row.password_hash,input.remember,verified)};
  const cookie=makeSession(row.id,row.password_hash,config.sessionSecret??'',input.remember?30*86400:8*3600);
  await tx`insert into aevic_platform.sessions(token_digest,team_id,expires_at,device,mfa_verified_at) values(${tokenDigest(cookie)},${row.id},to_timestamp(${Number(cookie.split('.')[1])}),${(c.req.header('user-agent')??'Browser').slice(0,300)},case when ${verified} then clock_timestamp() else null end)`;
  return {cookie,redirectTo};
 });
 clearGoogle(c);clearGoogleReturn(c);
 if(result.issued){saveTokens(c,result.issued);return {redirectTo:result.redirectTo,sessionMode:'tokens' as const,accessToken:result.issued.accessToken,accessExpiresAt:result.issued.accessExpiresAt};}
 setCookie(c,captainCookieName(c),result.cookie!,{path:'/',httpOnly:true,secure:config.secureCookies,sameSite:'Strict',...(input.remember?{maxAge:30*86400}:{})});
 return {redirectTo:result.redirectTo,sessionMode:'legacy' as const};
}
app.post('/auth/logout',async(c,next)=>{
 const browser=googleBrowser(c);if(browser&&c.get('config').google)await platform(c).sql`delete from aevic_platform.google_flows where browser_digest=${tokenDigest(browser)}`;
 clearGoogle(c);clearGoogleReturn(c);return next();
});
export default app;
