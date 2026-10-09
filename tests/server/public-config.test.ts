import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publicSocialLinks } from '../../src/config/publicSocial';
import { passwordResetEmail } from '../../server/captain/reset-email';
// @ts-expect-error Build scripts are JavaScript.
import { checkPublicSecrets } from '../../scripts/check-public-secrets.mjs';
// @ts-expect-error Build scripts are JavaScript.
import { buildConfiguration } from '../../scripts/build-config.mjs';
describe('public configuration boundaries', () => {
 afterEach(() => vi.unstubAllEnvs());
 it('shares configured public destinations with email and escapes HTML', () => {
  vi.stubEnv('VITE_AEVIC_INSTAGRAM_URL', 'https://www.instagram.com/another');
  vi.stubEnv('VITE_AEVIC_WEBSITE_URL', 'https://example.test/');
  const html = passwordResetEmail('https://example.test/reset').html;
  expect(html).toContain('href="https://www.instagram.com/another"');
  expect(html).toContain('>Website</a>');
  expect(html).not.toContain('instagram.com/aevicesports');
 });
 it('omits empty, unsafe, credential-bearing and token-bearing destinations', () => {
  for (const value of ['', 'javascript:alert(1)', 'https://user:pass@example.test', 'https://example.test/?token=private', 'https://example.test/#private']) {
   expect(publicSocialLinks({ VITE_AEVIC_WEBSITE_URL: value })).toEqual({});
  }
  expect(publicSocialLinks({ CLOUDINARY_API_SECRET: 'private' })).toEqual({});
 });
 it('rejects unreviewed VITE keys without printing their values', () => {
  vi.stubEnv('VITE_PRIVATE_SECRET', 'never-print-this-value');
  expect(() => buildConfiguration()).toThrow('Unreviewed browser environment keys: VITE_PRIVATE_SECRET');
 });
 it('detects private values in nested public output but permits public URLs', () => {
  const path = mkdtempSync(join(tmpdir(), 'aevic-secret-test-'));
  try {
   writeFileSync(join(path, 'app.js'), 'https://example.test');
   expect(checkPublicSecrets(path, { VITE_AEVIC_WEBSITE_URL: 'https://example.test', CLOUDINARY_API_SECRET: 'sensitive-fixture' })).toBe(1);
   writeFileSync(join(path, 'app.js'), 'sensitive-fixture');
   expect(() => checkPublicSecrets(path, { CLOUDINARY_API_SECRET: 'sensitive-fixture' })).toThrow('Private values in public output: CLOUDINARY_API_SECRET');
  } finally { rmSync(path, { recursive: true, force: true }); }
 });
});
