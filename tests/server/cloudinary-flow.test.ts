import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import type { Sql } from 'postgres';
import { createHttpApp } from '../../server/http';
import mediaRoutes from '../../server/platform/media';
import type { PlatformRepository } from '../../server/platform/repository';
import { createApiServices } from '../../src/services/apiAdapter';

const config = { supabaseUrl: 'https://nmjjibifcuzjlsvfcaaz.supabase.co', publishableKey: 'fixture', siteUrl: 'http://localhost:8888', secureCookies: false, cloudinary: { cloudName: 'fixture', apiKey: 'fixture', apiSecret: 'fixture' } };
afterEach(() => vi.unstubAllGlobals());
function harness({ actor = 'fixture-team', failUpload = false } = {}) {
  const writes: { query: string; values: unknown[] }[] = [];
  const sql = Object.assign((strings: TemplateStringsArray | string, ...values: unknown[]) => {
    if (typeof strings === 'string') return strings;
    const query = strings.join('?');
    if (/^(insert|update)/.test(query.trim())) writes.push({ query, values });
    return Promise.resolve([{ id: 'fixture-team' }]);
  }, { json: (value: unknown) => value, begin: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(sql)) });
  const app = createHttpApp(config, {});
  app.use('*', async (c, next) => { c.set('platform', { actor: actor ? { teamId: actor } : {}, sql: sql as unknown as Sql } as PlatformRepository); await next(); });
  app.route('/', mediaRoutes);
  const vendorCalls: string[] = [];
  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('/api/')) return app.request(url, { ...init, headers: { ...Object.fromEntries(new Headers(init?.headers)), origin: config.siteUrl } });
    vendorCalls.push(url);
    if (url.startsWith('https://api.cloudinary.com/')) {
      if (failUpload) return new Response(null, { status: 503 });
      const form = init?.body as FormData;
      const publicId = form.get('public_id');
      return Response.json({ public_id: publicId, version: 1, secure_url: `https://res.cloudinary.com/fixture/image/upload/v1/${publicId}.webp`, resource_type: 'image', format: 'webp' });
    }
    if (url.startsWith('https://res.cloudinary.com/') && init?.method === 'HEAD') return new Response(null, { headers: { 'content-type': 'image/webp' } });
    throw new Error('Network outside isolated upload harness is forbidden');
  });
  vi.stubGlobal('fetch', fetcher);
  return { services: createApiServices('/api'), writes, vendorCalls, app };
}
async function file(type = 'image/png') {
  const bytes = await sharp({ create: { width: 960, height: 512, channels: 4, background: '#ffcc44' } }).png().toBuffer();
  return new File([new Uint8Array(bytes)], 'fixture.png', { type });
}
async function upload(h: ReturnType<typeof harness>, kind: 'logo' | 'banner' | 'player-photo', image: File) {
  return kind === 'player-photo' ? h.services.media.uploadPlayerPhoto('fixture-team', 3, image) : h.services.media.uploadBrandAsset({ ownerType: 'team', ownerId: 'fixture-team', assetType: kind, fileName: image.name, mimeType: image.type, sizeBytes: image.size, width: 960, height: 512 }, image);
}
describe('frontend upload contract through the platform API, with an isolated SQL substitute', () => {
  it.each(['logo', 'banner', 'player-photo'] as const)('persists the verified CDN reference in the correct %s field', async kind => {
    const h = harness(); const result = await upload(h, kind, await file());
    expect(result.previewUrl).toMatch(/^https:\/\/res.cloudinary.com\/fixture\/image\/upload\/v1\/aevic\/teams\/fixture-team\//);
    const target = h.writes.find(write => write.query.includes(kind === 'banner' ? 'team_details' : 'update public.teams'))!;
    expect(target.values).toContain(result.previewUrl);
    if (kind !== 'banner') expect(target.values).toContain(kind === 'logo' ? 'logo_url' : 'player3_photo_url');
    expect(h.vendorCalls).toHaveLength(2);
    expect(h.writes.some(write => /delete|storage/i.test(write.query))).toBe(false);
  });
  it.each(['', 'another-team'])('rejects missing/foreign identity before upload or writes (%s)', async actor => {
    const h = harness({ actor });
    await expect(upload(h, 'logo', await file())).rejects.toMatchObject({ status: actor ? 403 : 401 });
    expect(h.vendorCalls).toEqual([]); expect(h.writes).toEqual([]);
  });
  it('rejects a MIME mismatch and oversized input before contacting Cloudinary', async () => {
    const h = harness();
    await expect(upload(h, 'logo', await file('image/jpeg'))).rejects.toMatchObject({ status: 422 });
    await expect(upload(h, 'logo', new File([new Uint8Array(4_000_001)], 'large.png', { type: 'image/png' }))).rejects.toMatchObject({ status: 413 });
    expect(h.vendorCalls).toEqual([]); expect(h.writes).toEqual([]);
  });
  it('preserves stored references and exposes the safe error code on upload failure', async () => {
    const h = harness({ failUpload: true });
    await expect(upload(h, 'banner', await file())).rejects.toMatchObject({ code: 'MEDIA_UPLOAD_FAILED', status: 503 });
    expect(h.writes).toEqual([]);
  });
  it('keeps private evidence on the existing private-media path', async () => {
    const h = harness(); await h.services.media.uploadEvidence('fixture-team', await file());
    expect(h.vendorCalls).toEqual([]);
    expect(h.writes.some(write => write.query.includes('aevic_platform.media'))).toBe(true);
  });
});
