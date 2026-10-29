import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { digest, same } from '../captain/crypto';
import type { ApiContext } from '../types';
import { safeAuthReturn } from '../../src/utils/authReturn';
const name = (c: ApiContext) => c.get('config').secureCookies ? '__Host-aevic-google-return' : 'aevic-google-return';
export function saveGoogleReturn(c: ApiContext, value: unknown, remember = false) {
  const path = safeAuthReturn(value) ?? '/';
  const payload = Buffer.from(JSON.stringify({ path, remember, expires: Date.now() + 600_000 })).toString('base64url');
  const signature = digest(c.get('config').sessionSecret ?? '', 'google-return', payload);
  setCookie(c, name(c), `${payload}.${signature}`, { path: '/', httpOnly: true, secure: c.get('config').secureCookies, sameSite: 'Lax', maxAge: 600 });
}
export function readGoogleReturn(c: ApiContext) {
  try {
    const [payload, signature] = (getCookie(c, name(c)) ?? '').split('.');
    if (!payload || !signature || !same(signature, digest(c.get('config').sessionSecret ?? '', 'google-return', payload))) return;
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (value.expires > Date.now()) return safeAuthReturn(value.path);
  } catch { /* Ignore expired or malformed navigation hints. */ }
}
export function clearGoogleReturn(c: ApiContext) { deleteCookie(c, name(c), { path: '/', secure: c.get('config').secureCookies }); }

export function readGoogleRemember(c: ApiContext) {
  try {
    const [payload, signature] = (getCookie(c, name(c)) ?? '').split('.');
    if (!payload || !signature || !same(signature, digest(c.get('config').sessionSecret ?? '', 'google-return', payload))) return false;
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return value.expires > Date.now() && value.remember === true;
  } catch { return false; }
}
