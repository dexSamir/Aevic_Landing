import {Hono} from 'hono';
import {getCookie,setCookie,deleteCookie} from 'hono/cookie';
import {z} from 'zod';
import type {Env,ApiContext} from '../types';
import {ServiceError} from '../errors';
import {body,email,text} from '../validation/input';
import {CaptainService,privateTeam,type ResetMailer} from '../captain/service';
import {PostgresCaptainStore} from '../captain/postgres';
import {resetMailer} from '../captain/email';
import {SupabaseCaptainMedia,type CaptainMedia} from '../captain/media';
import {createAttemptLimiter} from '../captain/limit';
import type {CaptainStore} from '../captain/store';
import {originalTeamId,ProductionTeams} from '../services/productionTeams';
import {clearSession} from '../auth/session';

export type CaptainDependencies={store?:CaptainStore;mailer?:ResetMailer;media?:CaptainMedia;now?:()=>number};
const stores=new Map<string,CaptainStore>();
const cookieName=(c:ApiContext)=>c.get('config').secureCookies?'__Host-aevic-captain':'aevic-captain';
const cookie=(c:ApiContext)=>getCookie(c,cookieName(c));
const cookieOptions=(c:ApiContext)=>({path:'/',httpOnly:true,secure:c.get('config').secureCookies,sameSite:'Strict' as const});
function save(c:ApiContext,value:string,remember:boolean){setCookie(c,cookieName(c),value,{...cookieOptions(c),...(remember?{maxAge:30*86400}:{})});}
function clear(c:ApiContext){deleteCookie(c,cookieName(c),cookieOptions(c));clearSession(c);}
const password=z.string().min(8).max(128).regex(/[A-ZƏÖÜĞÇŞİ]/).regex(/[0-9]/);
const token=z.string().max(100).regex(/^[1-9]\d{0,18}\.[A-Za-z0-9_-]{43}$/);
const slot=z.coerce.number().int().min(1).max(5);
export function captainRoutes(deps:CaptainDependencies={}) {
 const app=new Hono<Env>(),limit=createAttemptLimiter(deps.now);
 const store=(c:ApiContext)=>{
  if(deps.store)return deps.store;
  const url=c.get('config').databaseUrl;if(!url)throw new ServiceError(503,'PRIVATE_DATABASE_NOT_CONFIGURED');
  if(!stores.has(url))stores.set(url,new PostgresCaptainStore(url));return stores.get(url)!;
 };
 const service=(c:ApiContext)=>{
  const config=c.get('config');return new CaptainService(store(c),config.sessionSecret??'',config.siteUrl,deps.mailer??resetMailer(config),deps.now);
 };
 const media=(c:ApiContext)=>deps.media??new SupabaseCaptainMedia(c.get('config'));
 const attempt=(c:ApiContext,category:string,emailAddress?:string)=>{
  c.header('Retry-After','60');limit(category,c.req.header('x-nf-client-connection-ip')??'local',category==='reset'?5:10);
  if(emailAddress)limit(category+':account',emailAddress,category==='reset'?3:10);
  c.res.headers.delete('Retry-After');
 };
 app.post('/auth/login',async c=>{
  attempt(c,'login');const input=await body(c,z.object({email,password:z.string().min(1).max(128),remember:z.boolean().default(false)}).strict());
  limit('login-account',input.email,10);const auth=service(c),result=await auth.login(input.email,input.password,input.remember);save(c,result.cookie,input.remember);return c.json(auth.sessionView(result.row));
 });
 app.get('/me/session',async c=>{
  if(!cookie(c))return c.json(null);
  try{const auth=service(c);return c.json(auth.sessionView(await auth.authenticate(cookie(c))));}catch(error){if(error instanceof ServiceError&&error.status===401){clear(c);return c.json(null);}throw error;}
 });
 app.post('/auth/logout',async c=>{try{if(cookie(c))await service(c).logout(cookie(c));}finally{clear(c);}return c.body(null,204);});
 app.post('/auth/password-reset',async c=>{
  attempt(c,'reset');const input=await body(c,z.object({email}).strict());
  // Sender setup is checked for every request, independently of account existence.
  if(!deps.mailer&&(!(c.get('config').smtp||c.get('config').resendKey)||!z.email().safeParse(c.get('config').emailFrom).success))throw new ServiceError(503,'EMAIL_NOT_CONFIGURED');
  // Account-specific throttles never reveal whether a record exists.
  try{limit('reset-account',input.email,3);}catch{return c.body(null,204);}
  await service(c).requestReset(input.email);return c.body(null,204);
 });
 app.post('/auth/password-reset/inspect',async c=>{attempt(c,'reset-inspect');const input=await body(c,z.object({token:z.string().max(100)}).strict());return c.json({state:await service(c).inspectReset(input.token)});});
 app.post('/auth/password-reset/confirm',async c=>{attempt(c,'reset-confirm');const input=await body(c,z.object({token,password}).strict());await service(c).resetPassword(input.token,input.password);clear(c);return c.body(null,204);});
 app.post('/registrations',async c=>{
  attempt(c,'register');
  const input=await body(c,z.object({draft:z.object({teamName:text(2,60),tag:z.literal('').optional(),firstName:text(1,80),lastName:text(1,80),phone:text(6,30),email,players:z.array(z.object({ign:text(0,40),uid:z.literal('').optional(),role:z.enum(['captain','starter','substitute']).optional()}).strict()).length(5)}).strict(),password,idempotencyKey:text(8,128)}).strict());
  if(input.draft.players.slice(0,4).some(p=>p.ign.length<2))throw new ServiceError(422,'ROSTER_INCOMPLETE');
  const {draft}=input,auth=service(c);
  const row=await auth.register({team_name:draft.teamName,email:draft.email,captain_name:`${draft.firstName} ${draft.lastName}`,captain_contact:draft.phone,...Object.fromEntries(draft.players.map((p,i)=>[`player${i+1}_ign`,p.ign||null]))},input.password);
  save(c,auth.sessionCookie(row),false);
  return c.json({registrationId:row.id,status:'submitted',duplicate:false,source:'backend'},201);
 });
 app.get('/me/team',async c=>c.json(privateTeam(await service(c).authenticate(cookie(c)))));
 app.get('/me/context',async c=>{
  const row=await service(c).authenticate(cookie(c)),currentTeam=privateTeam(row),profile=await new ProductionTeams(c.get('db')).profile(row.id);
  return c.json({currentTeam,dataSource:'public.teams',unavailable:{competition:true,room:true,notifications:true,achievements:true},publicTeams:[],participations:[],tournaments:[],leaderboard:[],leaderboardTeams:[],matchHistory:profile.recentMatches,historyAvailable:profile.historyAvailable,matchSchedule:[],notifications:[],adminMessages:[],teamAnnouncements:[],teamAchievements:[],teamLegacyStats:profile.legacy,careerSummary:{teamId:row.id,scopeLabel:'Yarış tarixçəsi əlçatan deyil',metrics:[]},teamComparisonRecords:[]});
 });
 app.patch('/teams/:id',async c=>{
  const id=originalTeamId(c.req.param('id'));const input=await body(c,z.object({name:text(2,60)}).strict());
  return c.json(privateTeam(await service(c).update(cookie(c),id,{team_name:input.name})));
 });
 app.put('/teams/:id/roster/:slot',async c=>{
  const id=originalTeamId(c.req.param('id')),position=slot.parse(c.req.param('slot')),input=await body(c,z.object({ign:text(position===5?0:2,40)}).strict());
  return c.json(privateTeam(await service(c).update(cookie(c),id,{[`player${position}_ign`]:input.ign||null})));
 });
 app.delete('/me/sessions/others',async c=>{save(c,await service(c).revokeOthers(cookie(c)),false);return c.body(null,204);});
 app.get('/me/2fa',async c=>{await service(c).authenticate(cookie(c));return c.json({enabled:false,required:false,setupAvailable:false});});
 app.get('/me/account',async c=>{const row=await service(c).authenticate(cookie(c));return c.json({user:privateTeam(row).captain,emailVerified:false,dataExportStatus:'backend-required'});});
 app.patch('/me/account',async c=>{
  const input=await body(c,z.object({firstName:text(1,80),lastName:text(1,80),phone:text(6,30)}).strict());const auth=service(c),row=await auth.authenticate(cookie(c));
  const updated=await auth.update(cookie(c),row.id,{captain_name:`${input.firstName} ${input.lastName}`,captain_contact:input.phone});return c.json({user:privateTeam(updated).captain,emailVerified:false,dataExportStatus:'backend-required'});
 });
 app.put('/me/account/password',async c=>{
  attempt(c,'password');const input=await body(c,z.object({currentPassword:z.string().min(1).max(128),newPassword:password}).strict());await service(c).changePassword(cookie(c),input.currentPassword,input.newPassword);clear(c);return c.body(null,204);
 });
 app.get('/media/:id',async c=>{
  const id=z.uuid().parse(c.req.param('id'));const reference=await store(c).publicMedia(id);if(!reference)throw new ServiceError(404,'MEDIA_NOT_FOUND');
  const image=await media(c).read(reference.bucket,reference.name);
  return new Response(new Uint8Array(image.bytes).buffer,{headers:{'Content-Type':image.type,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=3600'}});
 });
 app.post('/media/uploads',async c=>{
  attempt(c,'upload');const auth=service(c),row=await auth.authenticate(cookie(c));
  const form=await c.req.formData();const id=originalTeamId(form.get('ownerId'));if(id!==row.id)throw new ServiceError(403,'FORBIDDEN');
  const kind=z.enum(['logo','player-photo']).parse(form.get('assetType'));const playerSlot=kind==='player-photo'?slot.parse(form.get('slot')):undefined;
  const file=form.get('file');if(!(file instanceof File)||!file.size||file.size>4_000_000)throw new ServiceError(422,'INVALID_IMAGE');
  const uploaded=await media(c).upload(row.id,file);
  await auth.update(cookie(c),row.id,{[kind==='logo'?'logo_url':`player${playerSlot}_photo_url`]:uploaded.url});
  return c.json({id:uploaded.id,previewUrl:uploaded.url,status:'uploaded'},201);
 });
 return app;
}
