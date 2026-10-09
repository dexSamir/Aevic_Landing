import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, fsyncSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { connect, environment, projectRef } from './connection.mjs';
import { inventory } from './inventory.mjs';
import { assert, sha, inspectImage, download, storageUrl, summary } from './core.mjs';
const mode = process.argv[2] || 'dry-run';
assert(['dry-run', 'copy', 'apply', 'rollback'].includes(mode), 'UNKNOWN_MODE');
const directory = resolve(process.argv.find(arg=>arg.startsWith('--state='))?.slice(8) || 'work/media-migration');
mkdirSync(directory, { recursive: true, mode: 0o700 });
const manifestPath = join(directory, 'manifest.json');
let lock, sql;
export function save(manifest) {
  const temp = manifestPath + '.tmp';
  writeFileSync(temp, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  const file = openSync(temp, 'r'); fsyncSync(file); closeSync(file); renameSync(temp, manifestPath);
  const dir = openSync(directory, 'r'); fsyncSync(dir); closeSync(dir);
}
try {
  const lockPath = join(directory, 'run.lock');
  if (existsSync(lockPath)) {
    const pid = Number(readFileSync(lockPath,'utf8'));
    assert(Number.isInteger(pid) && pid > 0, 'INVALID_RUN_LOCK');
    try { process.kill(pid,0); assert(false,'ANOTHER_RUN_ACTIVE'); }
    catch (error) { if(error.code === 'ESRCH') unlinkSync(lockPath); else throw error; }
  }
  lock = openSync(lockPath, 'wx', 0o600);
  writeFileSync(lock, String(process.pid));
  const env = environment(), origin = `https://${projectRef}.supabase.co`;
  assert(env.SUPABASE_URL === origin, 'SOURCE_PROJECT_MISMATCH');
  if (mode === 'dry-run') {
    if (existsSync(manifestPath)) {
      const previous = JSON.parse(readFileSync(manifestPath, 'utf8'));
      assert(!Object.values(previous.assets || {}).some(a => a.url), 'USE_NEW_STATE_DIRECTORY_AFTER_COPY');
    }
    sql = connect(env);
    const manifest = await inventory(sql, origin);
    const cache = new Map();
    for (const ref of manifest.references) {
      if (!['storage', 'database-media'].includes(ref.source.status)) continue;
      const key = JSON.stringify(ref.source);
      try {
        if (!cache.has(key)) {
          let bytes;
          if (ref.source.status === 'storage') bytes = await download(storageUrl(origin, ref.source));
          else {
            const [row] = await sql`select bytes from aevic_platform.media where id=${ref.source.mediaId} and asset_type<>'evidence'`;
            assert(row, 'MEDIA_DISAPPEARED'); bytes = Buffer.from(row.bytes);
          }
          const info = await inspectImage(bytes);
          writeFileSync(join(directory, `${info.sha256}.bin`), bytes, { mode: 0o600 });
          cache.set(key, info);
        }
        const info = cache.get(key); ref.sha256 = info.sha256; ref.status = 'ready';
        manifest.assets[info.sha256] = { ...info, publicId: `aevic/migrated/${projectRef}/${info.sha256}`, state: 'planned' };
      } catch (error) { ref.status = 'unavailable'; ref.problem = /^[A-Z0-9_]+$/.test(error.code || error.message) ? error.code || error.message : 'SOURCE_READ_FAILED'; }
    }
    // Inventory historical/unreferenced objects too, without assigning them to a team or migrating them.
    const allSources = [
      ...manifest.storageObjects.map(object => ({ record: object, source: { status: 'storage', bucket: object.bucket, path: object.name }, public: object.public })),
      ...manifest.databaseMedia.map(object => ({ record: object, source: { status: 'database-media', mediaId: object.id }, public: object.asset_type !== 'evidence' })),
    ];
    for (const item of allSources) {
      item.record.referenced = manifest.references.some(ref => JSON.stringify(ref.source) === JSON.stringify(item.source));
      if (!item.public) { item.record.availability = 'private-excluded'; continue; }
      try {
        const key = JSON.stringify(item.source);
        if (!cache.has(key)) {
          let bytes;
          if (item.source.status === 'storage') bytes = await download(storageUrl(origin,item.source));
          else { const [row] = await sql`select bytes from aevic_platform.media where id=${item.source.mediaId} and asset_type<>'evidence'`; assert(row,'MEDIA_DISAPPEARED'); bytes=Buffer.from(row.bytes); }
          cache.set(key,await inspectImage(bytes));
        }
        Object.assign(item.record,cache.get(key),{availability:'available'});
      } catch(error) { item.record.availability='unavailable'; item.record.problem=/^[A-Z0-9_]+$/.test(error.code||error.message)?error.code||error.message:'SOURCE_READ_FAILED'; }
    }
    // Immutable review digest excludes timestamps/progress, and includes every exact old URL and owner.
    manifest.planHash = sha(JSON.stringify({ origin, references: manifest.references, protectedTeams: manifest.protectedTeams }));
    save(manifest);
    console.log(JSON.stringify({ mode, planHash: manifest.planHash, ...summary(manifest) }, null, 2));
  } else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert(manifest.version === 1 && manifest.origin === origin, 'INVALID_MANIFEST');
    assert(manifest.planHash === sha(JSON.stringify({ origin, references: manifest.references, protectedTeams: manifest.protectedTeams })), 'PLAN_CHANGED');
    assert(process.argv.includes(`--approve-plan=${manifest.planHash}`), 'EXPLICIT_PLAN_APPROVAL_REQUIRED');
    assert(process.argv.includes(mode === 'copy' ? '--approve-copy' : '--approve-db'), 'EXPLICIT_STAGE_APPROVAL_REQUIRED');
    const { execute } = await import('./execute.mjs');
    await execute({ mode, manifest, env, directory, save });
    console.log(JSON.stringify({ mode, ...summary(manifest), execution: manifest.execution }, null, 2));
  }
} catch (error) {
  console.error(JSON.stringify({ mode, code: /^[A-Z0-9_]+$/.test(error.code || error.message) ? error.code || error.message : 'MIGRATION_STOPPED' }));
  process.exitCode = 1;
} finally {
  if (sql) await sql.end();
  if (lock !== undefined) { closeSync(lock); unlinkSync(join(directory, 'run.lock')); }
}
