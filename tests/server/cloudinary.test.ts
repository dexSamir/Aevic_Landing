import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { uploadCloudinaryImage } from '../../server/services/cloudinary';
import { readConfig, type ServerConfig } from '../../server/config';
const config: ServerConfig = { supabaseUrl: 'https://nmjjibifcuzjlsvfcaaz.supabase.co', publishableKey: 'fixture', siteUrl: 'https://example.test', secureCookies: true, cloudinary: { cloudName: 'fixture', apiKey: 'key', apiSecret: 'fixture-secret' } };
const id = '00000000-0000-4000-8000-000000000001';
const publicId = `aevic/teams/2/${id}`;
const url = `https://res.cloudinary.com/fixture/image/upload/v123/${publicId}.webp`;
const response = { public_id: publicId, version: 123, secure_url: url, resource_type: 'image', format: 'webp' };
afterEach(() => vi.unstubAllGlobals());
describe('optional Cloudinary public media adapter', () => {
  it('keeps the existing provider by default and leaves database URL/port unchanged', () => {
    const result = readConfig({ SUPABASE_URL: config.supabaseUrl, SUPABASE_ANON_KEY: 'fixture', AEVIC_DATABASE_URL: 'postgres://fixture:fixture@localhost:5432/fixture' });
    expect(result.cloudinary).toBeUndefined();
    expect(result.databaseUrl).toBe('postgres://fixture:fixture@localhost:5432/fixture');
  });
  it('signs an immutable upload and verifies delivery before returning a reference', async () => {
    const fetcher = vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.method === 'HEAD') return new Response(null, { headers: { 'content-type': 'image/webp' } });
      const form = init?.body as FormData;
      expect(form.get('overwrite')).toBe('false');
      expect(form.get('public_id')).toBe(publicId);
      const expected = createHash('sha256').update(`overwrite=false&public_id=${publicId}&timestamp=${form.get('timestamp')}fixture-secret`).digest('hex');
      expect(form.get('signature')).toBe(expected);
      expect(form.get('api_secret')).toBeNull();
      return Response.json(response);
    });
    vi.stubGlobal('fetch', fetcher);
    expect(await uploadCloudinaryImage(config, '2', Buffer.from('processed fixture'), id)).toEqual({ id, url });
    expect(fetcher).toHaveBeenLastCalledWith(url, expect.objectContaining({ method: 'HEAD', redirect: 'error' }));
  });
  it.each(['upload', 'foreign-url', 'missing-delivery'])('rejects %s without returning a replacement or deleting assets', async failure => {
    const fetcher = vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.method === 'HEAD') return new Response(null, { status: 404 });
      return failure === 'upload' ? new Response(null, { status: 503 }) : Response.json({ ...response, secure_url: failure === 'foreign-url' ? 'https://other.test/image.webp' : url });
    });
    vi.stubGlobal('fetch', fetcher);
    await expect(uploadCloudinaryImage(config, '2', Buffer.from('fixture'), id)).rejects.toMatchObject({ code: 'MEDIA_UPLOAD_FAILED' });
    expect(fetcher.mock.calls.every(([input]) => !String(input).includes('destroy'))).toBe(true);
  });
});
