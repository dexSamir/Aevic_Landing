import { createHash } from 'node:crypto';
import type { ServerConfig } from '../config';
import { ServiceError } from '../errors';

/** Only processed public team artwork is accepted here; private evidence stays private. */
export async function uploadCloudinaryImage(config: ServerConfig, teamId: string, bytes: Buffer, id = crypto.randomUUID(), signal?:AbortSignal) {
  if (!bytes.length || bytes.length > 4_000_000) throw new ServiceError(413, 'FILE_TOO_LARGE');
  const cloud = config.cloudinary;
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(teamId)) throw new ServiceError(503, 'MEDIA_UPLOAD_NOT_CONFIGURED');
  const publicId = `aevic/teams/${teamId}/${id}`;
  const params = { overwrite: 'false', public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const signature = createHash('sha256').update(Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&') + cloud.apiSecret).digest('hex');
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.set(key, value);
  form.set('api_key', cloud.apiKey);
  form.set('signature', signature);
  form.set('file', new Blob([new Uint8Array(bytes)], { type: 'image/webp' }), `${id}.webp`);
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/upload`, { method: 'POST', body: form, redirect: 'error', signal: signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('upload');
    const asset = await response.json() as { public_id?: string; version?: number; secure_url?: string; resource_type?: string; format?: string };
    // Validate the response against our generated immutable path before writing any DB reference.
    if (asset.public_id !== publicId || !Number.isSafeInteger(asset.version) || Number(asset.version) < 1 || asset.resource_type !== 'image' || asset.format !== 'webp') throw new Error('response');
    const url = `https://res.cloudinary.com/${cloud.cloudName}/image/upload/v${asset.version}/${publicId}.webp`;
    if (asset.secure_url !== url) throw new Error('url');
    const available = await fetch(url, { method: 'HEAD', redirect: 'error', signal: signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000) });
    if (!available.ok || !available.headers.get('content-type')?.startsWith('image/')) throw new Error('delivery');
    return { id, url };
  } catch {
    console.warn(JSON.stringify({event:'media_upload_unconfirmed',mediaId:id}));
    // No deletion, fallback overwrite, or credentials in errors. Previous references survive failure.
    throw new ServiceError(503, 'MEDIA_UPLOAD_FAILED');
  }
}
