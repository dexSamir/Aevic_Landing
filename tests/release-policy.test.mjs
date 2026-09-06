import test from 'node:test';
import assert from 'node:assert/strict';
import { containsCredential, isReleasePath, selectReleaseInputs } from '../scripts/release-policy.mjs';

test('release policy excludes secrets, nested metadata and local artifacts', () => {
  for (const path of ['.env', '.env.example', '.env.production', 'src/.env.local', '.git/config', 'src/.git/config', 'src/credentials.json', 'src/server.key', 'public/secrets/a.json', 'work/capture.png', '.artifacts/report.md', 'tests/storage-state.json', 'coverage/report.html', 'node_modules/a.js', '../src/a.ts', 'src/../.env', 'src/a\n.env', 'src/a\\b']) assert.equal(isReleasePath(path), false, path);
  for (const path of ['package.json', 'package-lock.json', 'SECURITY.md', 'src/main.tsx', 'src/assets/brand/aevic-phoenix-source.png', 'netlify/functions/public-context.ts', 'scripts/release-policy.mjs', 'tests/release-policy.test.mjs']) assert.equal(isReleasePath(path), true, path);
});

test('credential scan recognizes shapes without storing real secrets in fixtures', () => {
  assert.equal(containsCredential('const key = process.env.SUPABASE_SERVICE_ROLE_KEY;'), false);
  assert.equal(containsCredential('sb_secret_' + 'a'.repeat(32)), true);
  assert.equal(containsCredential('SMTP_PASS=' + 'a'.repeat(20)), true);
  assert.equal(containsCredential('-----BEGIN ' + 'PRIVATE KEY-----'), true);
});

test('source packaging excludes intentional unstaged deletions and remains deterministic', () => {
  assert.deepEqual(selectReleaseInputs(['src/new.ts', '.env', 'src/removed.ts', 'src/new.ts', 'package.json'], ['src/removed.ts']), ['package.json', 'src/new.ts']);
});
