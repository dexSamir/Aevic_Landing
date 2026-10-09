import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { connect, projectRef } from './connection.mjs';
import { assert, sha, download, inspectImage, storageUrl, validateReference, targets, decision } from './core.mjs';
function cloudConfig(env) {
  assert(/^[a-zA-Z0-9_-]+$/.test(env.CLOUDINARY_CLOUD_NAME || '') && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET, 'CLOUDINARY_NOT_CONFIGURED');
  return { name: env.CLOUDINARY_CLOUD_NAME, key: env.CLOUDINARY_API_KEY, secret: env.CLOUDINARY_API_SECRET };
}
function validateAsset(asset, digest, cloud) {
  assert(asset.sha256 === digest && /^[a-f0-9]{64}$/.test(digest) && asset.publicId === `aevic/migrated/${projectRef}/${digest}`, 'INVALID_ASSET');
  if (asset.url) assert(asset.url === `https://res.cloudinary.com/${cloud.name}/image/upload/v${asset.version}/${asset.publicId}.${asset.format === 'jpeg' ? 'jpg' : asset.format}` && Number.isSafeInteger(asset.version), 'INVALID_CDN_URL');
}
async function verifyAsset(asset) {
  const bytes = await download(asset.url);
  assert(sha(bytes) === asset.sha256, 'CDN_CONTENT_MISMATCH');
  const info = await inspectImage(bytes);
  assert(info.width === asset.width && info.height === asset.height, 'CDN_DIMENSIONS_MISMATCH');
  return true;
}
export async function copyAsset(cloud, asset, bytes) {
  const params = { overwrite: 'false', public_id: asset.publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const signature = createHash('sha256').update(Object.entries(params).map(([k,v])=>`${k}=${v}`).join('&') + cloud.secret).digest('hex');
  const form = new FormData();
  for (const [key,value] of Object.entries(params)) form.set(key,value);
  form.set('api_key', cloud.key); form.set('signature', signature);
  form.set('file', new Blob([new Uint8Array(bytes)], { type: `image/${asset.format}` }), `image.${asset.format === 'jpeg' ? 'jpg' : asset.format}`);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud.name}/image/upload`, { method: 'POST', body: form, redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert(response.ok, `UPLOAD_HTTP_${response.status}`);
  const result = await response.json();
  assert(result.public_id === asset.publicId && result.resource_type === 'image' && Number.isSafeInteger(result.version), 'UPLOAD_RESPONSE_MISMATCH');
  const candidate = { ...asset, version: result.version, url: result.secure_url };
  assert(candidate.url, 'UPLOAD_URL_MISSING');
  validateAsset(candidate, asset.sha256, cloud);
  await verifyAsset(candidate);
  return { ...candidate, state: 'verified', verifiedAt: new Date().toISOString() };
}
async function verifySources(manifest, env) {
  const sql = connect(env);
  try {
    const checked = new Map();
    for (const ref of manifest.references.filter(r => r.status === 'ready')) {
      validateReference(ref);
      const key = JSON.stringify(ref.source);
      if (!checked.has(key)) {
        let bytes;
        if (ref.source.status === 'storage') bytes = await download(storageUrl(manifest.origin, ref.source));
        else {
          assert(ref.source.status === 'database-media', 'INVALID_SOURCE');
          const [row] = await sql`select bytes from aevic_platform.media where id=${ref.source.mediaId} and asset_type<>'evidence'`;
          assert(row, 'SOURCE_MISSING'); bytes = Buffer.from(row.bytes);
        }
        checked.set(key, sha(bytes));
      }
      assert(checked.get(key) === ref.sha256, 'SOURCE_CONTENT_CHANGED');
    }
  } finally { await sql.end(); }
}
async function protectedState(tx) {
  const teams = await tx`select id::text,md5((to_jsonb(t)-array['logo_url','player1_photo_url','player2_photo_url','player3_photo_url','player4_photo_url','player5_photo_url','updated_at'])::text) as fingerprint from public.teams t order by id`;
  const details = await tx`select team_id::text,md5((to_jsonb(d)-array['banner_url','updated_at'])::text) as fingerprint from aevic_platform.team_details d order by team_id`;
  return { teams, details };
}
export async function updateReferences(sql, manifest, rollback = false) {
  return sql.begin('isolation level repeatable read', async tx => {
    const before = JSON.stringify(await protectedState(tx));
    let updated = 0, alreadyDone = 0;
    for (const ref of manifest.references.filter(r => r.status === 'ready')) {
      validateReference(ref);
      const asset = manifest.assets[ref.sha256];
      // Failed/unverified copies never produce a DB update.
      if (asset?.state !== 'verified' || !asset.url) continue;
      const target = targets[ref.table];
      const [current] = await tx.unsafe(`select "${ref.column}" as url from ${ref.table} where "${target.key}"=$1 for update`, [ref.id]);
      assert(current, 'REFERENCE_ROW_MISSING');
      const action = decision(current.url, ref.oldUrl, asset.url, rollback);
      assert(action !== 'conflict', 'REFERENCE_CHANGED_SINCE_PLAN');
      if (action === 'already-done') { alreadyDone++; continue; }
      const [result] = await tx.unsafe(`update ${ref.table} set "${ref.column}"=$1 where "${target.key}"=$2 and "${ref.column}"=$3 returning "${target.key}"::text as id`, [rollback ? ref.oldUrl : asset.url, ref.id, rollback ? asset.url : ref.oldUrl]);
      assert(result?.id === ref.id, 'COMPARE_AND_SWAP_FAILED'); updated++;
    }
    assert(JSON.stringify(await protectedState(tx)) === before, 'NON_MEDIA_TEAM_DATA_CHANGED');
    return { updated, alreadyDone };
  });
}
export async function execute({ mode, manifest, env, directory, save }) {
  const cloud = cloudConfig(env);
  for (const [digest,asset] of Object.entries(manifest.assets)) validateAsset(asset,digest,cloud);
  if (mode !== 'rollback') await verifySources(manifest, env);
  if (mode === 'copy') {
    for (const [digest,asset] of Object.entries(manifest.assets)) {
      if (asset.state === 'verified') { await verifyAsset(asset); continue; }
      const bytes = readFileSync(join(directory, `${digest}.bin`));
      assert(sha(bytes) === digest, 'LOCAL_CACHE_CHANGED');
      manifest.assets[digest] = await copyAsset(cloud,asset,bytes);
      save(manifest); // Checkpoint each verified asset; deterministic IDs avoid duplicates after a crash.
    }
    manifest.execution = { mode, finishedAt: new Date().toISOString() }; save(manifest); return;
  }
  if (mode === 'apply') {
    assert(!manifest.issues.length, 'INVENTORY_REVIEW_REQUIRED');
    assert(Object.values(manifest.assets).every(a => a.state === 'verified'), 'COPY_NOT_COMPLETE');
    for (const asset of Object.values(manifest.assets)) await verifyAsset(asset);
  }
  // Flush the full old/new mapping before opening a write-enabled connection.
  manifest.execution = { mode, state: 'pending', startedAt: new Date().toISOString() }; save(manifest);
  const sql = connect(env, true);
  try {
    const result = await updateReferences(sql,manifest,mode === 'rollback');
    manifest.execution = { mode, state: 'complete', ...result, finishedAt: new Date().toISOString() }; save(manifest);
  } finally { await sql.end(); }
}
