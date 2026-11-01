import { afterEach, expect, it, vi } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = { ...publicKey.export({ format: 'jwk' }), kid: 'exchange-fixture', alg: 'RS256', use: 'sig' };
const config = { clientId: 'fixture-client', clientSecret: 'fixture-secret' };
const callback = 'https://aevic-esports.netlify.app/api/auth/google/callback';
function idToken(patch: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = [{ alg: 'RS256', kid: key.kid }, { iss: 'https://accounts.google.com', aud: config.clientId, sub: 'existing-google-subject', email: 'verified@example.test', email_verified: true, nonce: 'bound-nonce', iat: now, exp: now + 3600, ...patch }].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return payload + '.' + sign('RSA-SHA256', Buffer.from(payload), privateKey).toString('base64url');
}
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
it('exchanges with the exact application callback, client secret and PKCE verifier, then verifies the signed identity', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id_token: idToken() })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ keys: [key] })));
  vi.stubGlobal('fetch', fetcher);
  const { exchangeGoogleCode } = await import('../../server/auth/google-provider');
  expect(await exchangeGoogleCode(config, 'one-use-code', 'bound-verifier', 'bound-nonce', callback)).toMatchObject({ subject: 'existing-google-subject', email: 'verified@example.test' });
  expect(fetcher.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
  expect(Object.fromEntries(fetcher.mock.calls[0][1].body)).toEqual({ grant_type: 'authorization_code', client_id: config.clientId, client_secret: config.clientSecret, code: 'one-use-code', code_verifier: 'bound-verifier', redirect_uri: callback });
  expect(fetcher.mock.calls[1][0]).toBe('https://www.googleapis.com/oauth2/v3/certs');
});
it.each(['invalid_grant', 'invalid_client'])('rejects %s without obtaining identity keys', async error => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error }), { status: 400 }));
  vi.stubGlobal('fetch', fetcher);
  const { exchangeGoogleCode } = await import('../../server/auth/google-provider');
  await expect(exchangeGoogleCode(config, 'expired-or-reused-code', 'verifier', 'nonce', callback)).rejects.toMatchObject({ code: 'GOOGLE_EXCHANGE_FAILED' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([{ nonce: 'other-browser' }, { aud: 'other-client' }, { exp: 0 }, { email_verified: false }])('rejects an exchanged identity with invalid claims %j', async patch => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id_token: idToken(patch) }))).mockResolvedValueOnce(new Response(JSON.stringify({ keys: [key] }))));
  const { exchangeGoogleCode } = await import('../../server/auth/google-provider');
  await expect(exchangeGoogleCode(config, 'code', 'verifier', 'bound-nonce', callback)).rejects.toMatchObject({ code: 'GOOGLE_IDENTITY_INVALID' });
});
