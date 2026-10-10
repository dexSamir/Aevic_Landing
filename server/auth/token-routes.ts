import {Hono} from 'hono';
import type {Env} from '../types';
import {platform,tokenDigest} from '../platform/context';
import {clearLegacyCookies,clearTokenCookies,refreshCookie,rotateTokens,saveTokens,tokensEnabled} from './platform-tokens';
import {ServiceError} from '../errors';
const app=new Hono<Env>();
app.post('/auth/refresh',async c=>{
 if(!tokensEnabled(c))return c.json({sessionMode:'legacy'});
 const token=refreshCookie(c);if(!token)throw new ServiceError(401,'UNAUTHORIZED');
 const result=await rotateTokens(c,platform(c).sql,token);saveTokens(c,result);
 return c.json({accessToken:result.accessToken,accessExpiresAt:result.accessExpiresAt,sessionMode:'tokens'});
});
app.post('/auth/logout',async(c,next)=>{
 if(!tokensEnabled(c))return next();
 const token=refreshCookie(c);
 if(token)await platform(c).sql`update aevic_platform.sessions set revoked_at=clock_timestamp() where id in (select session_id from aevic_platform.refresh_tokens where token_digest=${tokenDigest(token)}) and revoked_at is null`;
 clearTokenCookies(c);clearLegacyCookies(c);return next();
});
export default app;
