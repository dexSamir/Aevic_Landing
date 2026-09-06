import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { selectReleaseInputs, validateReleaseFiles } from './release-policy.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tracked = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' });
if (tracked.status !== 0) throw new Error('Unable to list release inputs.');
const deleted = spawnSync('git', ['ls-files', '--deleted', '-z'], { cwd: root, encoding: 'utf8' });
if (deleted.status !== 0) throw new Error('Unable to inspect removed release inputs.');
const files = selectReleaseInputs(tracked.stdout.split('\0'), deleted.stdout.split('\0'));
validateReleaseFiles(root, files);
if (!files.includes('src/assets/brand/aevic-phoenix-source.png')) throw new Error('Required runtime brand asset missing.');

if (process.argv.includes('--check')) {
  process.stdout.write(`Release policy verified (${files.length} product files; no environment files, symlinks, credentials, audits or caches).\n`);
} else {
  const staging = mkdtempSync(resolve(tmpdir(), 'aevic-release-'));
  const outputDir = resolve(root, '.artifacts');
  mkdirSync(outputDir, { recursive: true });
  const output = resolve(outputDir, 'aevic-frontend-release.zip');
  try {
    // Fresh staging prevents stale entries from surviving an earlier ZIP.
    for (const file of files) {
      const destination = resolve(staging, 'source', file);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(resolve(root, file), destination);
      utimesSync(destination, new Date('2000-01-01T00:00:00Z'), new Date('2000-01-01T00:00:00Z'));
    }
    validateReleaseFiles(resolve(staging, 'source'), files);
    const archive = resolve(staging, 'release.zip');
    const result = spawnSync('zip', ['-X', '-q', archive, '-@'], { cwd: resolve(staging, 'source'), env: { ...process.env, TZ: 'UTC' }, input: `${files.join('\n')}\n`, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Archive creation failed.');
    const listing = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
    if (listing.status !== 0 || listing.stdout.trimEnd() !== files.join('\n')) throw new Error('Archive entry verification failed.');
    writeFileSync(`${output}.tmp`, readFileSync(archive));
    renameSync(`${output}.tmp`, output);
    process.stdout.write(`Verified deterministic source release: ${output}\n`);
  } finally {
    // Only this invocation's exact mkdtemp-owned directory is removed.
    rmSync(staging, { recursive: true, force: true });
  }
}
