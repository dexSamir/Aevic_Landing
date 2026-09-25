import {workspaceRequest,selectWorkspace,requireWorkspaceWrite} from './workspace';
import {Hono} from 'hono';
import {getCookie} from 'hono/cookie';
import type {Sql} from 'postgres';
import type {Env} from '../types';
import {PlatformAccountStore as PostgresCaptainStore} from './account-store';
import {CaptainService} from '../captain/service';
import {resetMailer} from '../captain/email';
import {ServiceError} from '../errors';
import {PlatformRepository,type Actor} from './repository';
import {adminCookieName,currentCaptainCookie,tokenDigest} from './context';
const stores=new Map<string,PostgresCaptainStore>();
export function platformMiddleware(testSql?:Sql){
 const app=new Hono<Env>();
 app.use('*',async(c,next)=>{
  const config=c.get('config');if(!config.databaseUrl&&!testSql)return next();
  let store:PostgresCaptainStore|undefined;
  if(config.databaseUrl){store=stores.get(config.databaseUrl);if(!store){store=new PostgresCaptainStore(config.databaseUrl,!config.secureCookies);stores.set(config.databaseUrl,store);}}
  const sql=testSql??store!.sql;
  await sql.begin(async tx=>{
   const expired=await tx`select id,team_id,previous_status from aevic_platform.sanctions where expires_at<=now() and revoked_at is null for update skip locked`;
   for(const s of expired){await tx`update public.teams set status=${s.previous_status},rejection_reason=null where id=${s.team_id} and status='banned'`;await tx`update aevic_platform.sanctions set revoked_at=now() where id=${s.id}`;}
  });
  const identity:Actor={};
  const adminToken=getCookie(c,adminCookieName(c));
  if(adminToken){const rows=await sql`select a.id,a.role from aevic_platform.sessions s join aevic_platform.admin_accounts a on a.id=s.admin_id where s.token_digest=${tokenDigest(adminToken)} and s.expires_at>now() and s.revoked_at is null and a.active and not exists(select 1 from aevic_platform.mfa_factors f where f.admin_id=a.id and f.enabled_at is not null and (s.mfa_verified_at is null or s.mfa_verified_at<f.enabled_at))`;if(rows[0]){identity.adminId=String(rows[0].id);identity.role=String(rows[0].role);}}
  const captainToken=currentCaptainCookie(c);
  if(captainToken&&store&&!identity.adminId){
   try{const auth=new CaptainService(store,config.sessionSecret??'',config.siteUrl,resetMailer(config));const row=await auth.authenticate(captainToken);
    const revoked=await sql`select id from aevic_platform.sessions where token_digest=${tokenDigest(captainToken)} and (revoked_at is not null or expires_at<=now())`;
    if(revoked.length)throw new ServiceError(401,'SESSION_REVOKED');
    const [factor]=await sql`select f.enabled_at,s.mfa_verified_at from aevic_platform.mfa_factors f left join aevic_platform.sessions s on s.token_digest=${tokenDigest(captainToken)} where f.team_id=${row.id} and f.enabled_at is not null`;
    if(factor&&(!factor.mfa_verified_at||factor.mfa_verified_at<factor.enabled_at))throw new ServiceError(401,'MFA_REQUIRED');
    identity.accountId=row.id;identity.teamId=row.id;
    await sql`insert into aevic_platform.sessions(token_digest,team_id,expires_at,device) values(${tokenDigest(captainToken)},${row.id},to_timestamp(${Number(captainToken.split('.')[1])}),${(c.req.header('user-agent')??'Browser').slice(0,300)}) on conflict(token_digest) do update set last_active_at=case when aevic_platform.sessions.last_active_at<now()-interval '5 minutes' then now() else aevic_platform.sessions.last_active_at end`;
   }catch(error){if(error instanceof ServiceError&&['SESSION_REVOKED','MFA_REQUIRED'].includes(error.code)&&!c.req.path.startsWith('/api/auth/'))throw error;
    if(!(error instanceof ServiceError&&error.status===401))throw error;}
  }
  if(identity.accountId&&workspaceRequest(c.req.path)){await selectWorkspace(sql,identity,getCookie(c,'aevic-workspace'));if(!['GET','HEAD','OPTIONS'].includes(c.req.method)&&!/^\/api\/teams\/[^/]+\/(authority|invitations|ownership|leave|archive)(\/|$)/.test(c.req.path))requireWorkspaceWrite(identity);}
  c.set('platform',new PlatformRepository(c.get('db'),sql,identity));
  await next();
 });return app;
}
