import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';
import type { Env } from '../types';
import { body } from '../validation/input';
import { passwordFeedback } from '../../src/utils/passwordStrength';
import { digest, hashPassword, makeSession, verifyPassword } from '../captain/crypto';
import { account, actor, captainCookieName, currentCaptainCookie, currentSessionDigest, platform, tokenDigest } from './context';
import { lockAccount } from './account-store';
import { audit, transaction } from './competition';
import { persistentLimit } from '../auth/persistent-limit';
import { ServiceError } from '../errors';

const app = new Hono<Env>();
app.put('/me/account/password', async (c, next) => {
  if (actor(c).adminId) return next();
  const owner = account(c), sql = platform(c).sql;
  await persistentLimit(c, sql, 'password-change', owner, 5);
  const input = await body(c, z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().refine(value => passwordFeedback(value).valid) }).strict());
  const current = currentSessionDigest(c), secret = c.get('config').sessionSecret!;
  // Verify outside the transaction, then lock and compare the credential to prevent races.
  const [credential] = await sql`select password_hash from aevic_platform.account_identity where id=${owner}`;
  if (!credential || !await verifyPassword(input.currentPassword, credential.password_hash)) throw new ServiceError(401, 'PASSWORD_CHANGE_FAILED');
  const hash = await hashPassword(input.newPassword);
  const fresh = await transaction(sql, async tx => {
    const row = await lockAccount(tx, owner);
    if (row.password_hash !== credential.password_hash) throw new ServiceError(409, 'ACCOUNT_CHANGED');
    const [session] = await tx`select * from aevic_platform.sessions where token_digest=${current} and team_id=${owner} and revoked_at is null and expires_at>clock_timestamp() for update`;
    if (!session) throw new ServiceError(401, 'SESSION_REVOKED');
    if (row.original_team_id !== null) await tx`update public.teams set password_hash=${hash},reset_token=null where id=${row.original_team_id}`;
    else await tx`update aevic_platform.accounts set password_hash=${hash},reset_token=null where id=${owner}`;
    await tx`update aevic_platform.sessions set revoked_at=clock_timestamp() where team_id=${owner} and token_digest<>${current} and revoked_at is null`;
    let cookie: string | undefined;
    if (c.get('sessionId')) {
      await tx`update aevic_platform.sessions set credential_digest=${digest(secret,'credential-v2',hash)} where id=${session.id}`;
    } else {
      const remaining = Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000);
      if (remaining <= 0) throw new ServiceError(401, 'SESSION_REVOKED');
      cookie = makeSession(owner, hash, secret, remaining);
      await tx`update aevic_platform.sessions set token_digest=${tokenDigest(cookie)} where id=${session.id}`;
    }
    await audit(tx, actor(c), 'account.password-change', 'account', owner);
    return { cookie, expires: new Date(session.expires_at), persistent: Number(currentCaptainCookie(c)?.split('.')[1] ?? 0) * 1000 - Date.now() > 8 * 3600_000 };
  });
  if (fresh.cookie) setCookie(c, captainCookieName(c), fresh.cookie, { path:'/', httpOnly:true, secure:c.get('config').secureCookies, sameSite:'Strict', ...(fresh.persistent ? { expires:fresh.expires } : {}) });
  return c.body(null, 204);
});
export default app;
