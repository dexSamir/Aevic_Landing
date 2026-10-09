import { createHash } from 'node:crypto';
import sharp from 'sharp';
export const originalIds = ['2', '7', '8', '9', '10', '12', '16'];
export const teamColumns = ['logo_url', ...[1, 2, 3, 4, 5].map(i => `player${i}_photo_url`)];
export const targets = {
  'public.teams': { key: 'id', columns: teamColumns },
  'aevic_platform.team_details': { key: 'team_id', columns: ['banner_url'] },
};
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function assert(condition, code) { if (!condition) throw Object.assign(new Error(code), { code }); }
export const referenceId = r => `${r.table}:${r.id}:${r.column}`;
export function validateReference(r) { assert(targets[r.table]?.columns.includes(r.column) && /^\d+$/.test(r.id) && typeof r.oldUrl === 'string', 'INVALID_REFERENCE'); }
export function resolveSource(url, objects, media, origin) {
  const uuid = url.match(/^\/api\/media\/([0-9a-f-]{36})$/i)?.[1];
  if (uuid) {
    const stored = media.find(row => row.id === uuid);
    if (stored) return stored.asset_type === 'evidence' ? { status: 'private-excluded' } : { status: 'database-media', mediaId: uuid };
    const found = objects.filter(o => o.public && (o.id === uuid || [uuid, ...['png', 'jpg', 'jpeg', 'webp'].map(ext => `${uuid}.${ext}`)].includes(o.name.split('/').at(-1))));
    return found.length === 1 ? { status: 'storage', bucket: found[0].bucket, path: found[0].name } : { status: found.length ? 'ambiguous-media-id' : 'unresolved-media-id' };
  }
  let parsed;
  try { parsed = new URL(url); } catch { return { status: url.startsWith('/') ? 'local-asset-excluded' : 'invalid-url' }; }
  if (parsed.origin === 'https://res.cloudinary.com') return { status: 'already-cloudinary' };
  if (parsed.origin !== origin || parsed.username || parsed.password) return { status: 'external-excluded' };
  const prefix = '/storage/v1/object/public/';
  if (!parsed.pathname.startsWith(prefix)) return { status: 'nonpublic-or-transformed-excluded' };
  let parts;
  try { parts = parsed.pathname.slice(prefix.length).split('/').map(decodeURIComponent); } catch { return { status: 'invalid-storage-path' }; }
  if (parts.some(p => !p || p === '.' || p === '..' || p.includes('/') || p.includes('\\'))) return { status: 'invalid-storage-path' };
  const bucket = parts.shift(), path = parts.join('/');
  const object = objects.find(o => o.bucket === bucket && o.name === path);
  if (!object) return { status: 'storage-object-missing', bucket, path };
  return object.public ? { status: 'storage', bucket, path } : { status: 'private-excluded', bucket, path };
}
export function storageUrl(origin, source) { return `${origin}/storage/v1/object/public/${[source.bucket, ...source.path.split('/')].map(encodeURIComponent).join('/')}`; }
export async function download(url, fetcher = fetch) {
  const res = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  assert(res.ok, `HTTP_${res.status}`);
  assert(Number(res.headers.get('content-length') || 0) <= 20_000_000, 'IMAGE_TOO_LARGE');
  const reader = res.body.getReader(), chunks = []; let size = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 20_000_000) { await reader.cancel(); assert(false, 'IMAGE_TOO_LARGE'); } chunks.push(value); }
  return Buffer.concat(chunks);
}
export async function inspectImage(bytes) {
  const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'warning' });
  const meta = await image.metadata();
  assert(['png', 'jpeg', 'webp', 'avif', 'gif'].includes(meta.format) && meta.width && meta.height, 'UNSUPPORTED_IMAGE');
  assert((meta.pages ?? 1) === 1, 'ANIMATED_IMAGE_REQUIRES_REVIEW');
  await image.resize(1, 1).toBuffer();
  return { sha256: sha(bytes), bytes: bytes.length, format: meta.format, width: meta.width, height: meta.height };
}
export function summary(manifest) {
  const counts = {}, status = {};
  for (const r of manifest.references) { counts[r.kind] = (counts[r.kind] || 0) + 1; status[r.status] = (status[r.status] || 0) + 1; }
  const eligible = manifest.references.filter(r => r.status === 'ready');
  return { teams: manifest.teamIds.length, originalTeamsPresent: originalIds.filter(id => manifest.teamIds.includes(id)).length, references: manifest.references.length, byKind: counts, byStatus: status, eligibleByKind: Object.fromEntries(['logo','banner','avatar'].map(kind => [kind, eligible.filter(r=>r.kind===kind).length])), uniqueEligibleFiles: new Set(eligible.map(r => r.sha256)).size, duplicateReferencesAvoided: eligible.length - new Set(eligible.map(r=>r.sha256)).size, totalMediaObjects: manifest.storageObjects.length + manifest.databaseMedia.length, uniqueAvailableMediaFiles: new Set([...manifest.storageObjects,...manifest.databaseMedia].filter(o=>o.availability==='available').map(o=>o.sha256)).size, availableObjects: [...manifest.storageObjects,...manifest.databaseMedia].filter(o=>o.availability==='available').length, unavailableObjects: [...manifest.storageObjects,...manifest.databaseMedia].filter(o=>o.availability==='unavailable').length, unreferencedObjects: [...manifest.storageObjects,...manifest.databaseMedia].filter(o=>!o.referenced).length, storageObjects: manifest.storageObjects.length, databaseMediaObjects: manifest.databaseMedia.length, storageBuckets: [...new Set(manifest.storageObjects.map(o=>o.bucket))], excludedOtherMedia: manifest.otherMedia, issues: manifest.issues };
}
export function decision(current, oldUrl, newUrl, rollback = false) {
  const expected = rollback ? newUrl : oldUrl, desired = rollback ? oldUrl : newUrl;
  return current === desired ? 'already-done' : current === expected ? 'update' : 'conflict';
}
