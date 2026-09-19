import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Session } from '@supabase/supabase-js';
import type { ApiContext } from '../types';
import { client } from '../db';
import { ServiceError } from '../errors';
const names = (c: ApiContext) => c.get('config').secureCookies ? ['__Host-aevic-access','__Host-aevic-refresh','__Host-aevic-remember'] : ['aevic-access','aevic-refresh','aevic-remember'];
export function saveSession(c: ApiContext, session: Session, remember: boolean) {
 const [access,refresh,keep] = names(c); const options = { httpOnly: true, secure:c.get('config').secureCookies,sameSite:'Lax' as const,path:'/' };
 setCookie(c,access,session.access_token,{...options,maxAge:session.expires_in});
 setCookie(c,refresh,session.refresh_token,{...options,...(remember?{maxAge:30*86400}:{})});
 setCookie(c,keep,remember?'1':'0',{...options,...(remember?{maxAge:30*86400}:{})});
 c.set('accessToken',session.access_token); c.set('user',session.user); c.set('db',client(c.get('config'),session.access_token));
}
export function clearSession(c: ApiContext) { names(c).forEach(name=>deleteCookie(c,name,{path:'/',secure:c.get('config').secureCookies,httpOnly:true,sameSite:'Lax'})); }
export async function authenticate(c: ApiContext, required = true) {
 if(c.get('user')) return c.get('user')!;
 const [access,refresh,keep]=names(c); const accessToken=getCookie(c,access); const refreshToken=getCookie(c,refresh);
 const auth=client(c.get('config'));
 if(accessToken) {
  const {data,error}=await auth.auth.getUser(accessToken);
  if(!error && data.user) { c.set('user',data.user); c.set('accessToken',accessToken); c.set('db',client(c.get('config'),accessToken)); return data.user; }
  if(error && (!error.status || error.status>=500)) throw new ServiceError(503,'AUTH_UNAVAILABLE');
 }
 if(refreshToken) {
  const {data,error}=await auth.auth.refreshSession({refresh_token:refreshToken});
  if(!error && data.session) { saveSession(c,data.session,getCookie(c,keep)==='1'); return data.session.user; }
  if(error && (!error.status || error.status>=500)) throw new ServiceError(503,'AUTH_UNAVAILABLE');
 }
 if(accessToken||refreshToken) clearSession(c);
 if(required) throw new ServiceError(401,'UNAUTHORIZED');
 return undefined;
}
export async function requireAdmin(c: ApiContext, roles?: string[]) {
 const user=await authenticate(c); const {data,error}=await c.get('db').from('admin_roles').select('role').eq('user_id',user!.id).maybeSingle();
 if(error) throw new ServiceError(503,'DATA_UNAVAILABLE');
 if(!data || (roles && data.role!=='super-admin' && !roles.includes(data.role))) throw new ServiceError(403,'FORBIDDEN');
 return data.role as string;
}
export async function requireTeam(c: ApiContext, teamId?: string, roles?: string[]) {
 const user=await authenticate(c); let query=c.get('db').from('team_members').select('team_id,role,status').eq('user_id',user!.id).eq('status','ACTIVE');
 if(teamId) query=query.eq('team_id',teamId);
 const {data,error}=await query.maybeSingle();
 if(error) throw new ServiceError(503,'DATA_UNAVAILABLE');
 if(!data || (roles && !roles.includes(data.role))) throw new ServiceError(403,'FORBIDDEN');
 const {data:team}=await c.get('db').from('teams').select('approval_status,archived_at').eq('id',data.team_id).maybeSingle();
 if(!team || team.archived_at || team.approval_status==='banned') throw new ServiceError(403,'TEAM_UNAVAILABLE');
 return data.team_id as string;
}
export const managers=['OWNER','CAPTAIN','MANAGER','CO_CAPTAIN'];
