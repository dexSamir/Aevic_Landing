// Explicit opt-in smoke check: creates three synthetic assets, never connects to a database.
import { createServer, loadEnv } from 'vite';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
if (!process.argv.includes('--upload-test-assets')) throw new Error('Pass --upload-test-assets to create isolated diagnostic images.');
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { readConfig } = await server.ssrLoadModule('/server/config.ts');
  const { uploadCloudinaryImage } = await server.ssrLoadModule('/server/services/cloudinary.ts');
  const config = readConfig({ ...loadEnv('development', process.cwd(), ''), ...process.env });
  if (!config.cloudinary) throw new Error('Cloudinary provider is not enabled.');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.protocol !== 'https:' || !['api.cloudinary.com', 'res.cloudinary.com'].includes(url.hostname)) throw new Error('Smoke check only permits Cloudinary requests.');
    return originalFetch(input, init);
  };
  const owner = `integration-check-${randomUUID()}`;
  console.log(JSON.stringify({ provider: 'cloudinary', diagnosticOwner: owner, databaseAccess: false }));
  for (const [kind, width, height, deliveryWidth] of [['logo', 512, 512, 128], ['banner', 1600, 500, 768], ['avatar', 320, 320, 96]]) {
    const bytes = await sharp({ create: { width, height, channels: 4, background: '#b89a42' } }).webp({ quality: 88 }).toBuffer();
    const asset = await uploadCloudinaryImage(config, owner, bytes);
    const optimized = asset.url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${deliveryWidth}/`);
    const response = await fetch(optimized, { headers: { Accept: 'image/avif,image/webp,image/*' }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`CDN variant failed (${response.status}).`);
    const delivered = Buffer.from(await response.arrayBuffer());
    const info = await sharp(delivered).metadata();
    if (info.width !== deliveryWidth || info.height !== Math.round(height * deliveryWidth / width)) throw new Error('CDN dimensions did not match.');
    console.log(JSON.stringify({ kind, uploaded: true, cdnStatus: response.status, format: info.format, width: info.width, height: info.height, bytes: delivered.length }));
  }
} catch (error) {
  // Never dump vendor responses, environment values, or credential-bearing diagnostics.
  console.error(JSON.stringify({ verified: false, code: error?.code || 'CLOUDINARY_CHECK_FAILED' }));
  process.exitCode = 1;
} finally { await server.close(); }
