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

describe('Netlify production origin consistency',()=>{
 afterEach(()=>vi.unstubAllEnvs());
 const production='https://aevic-esports.netlify.app';
 function environment(origin=production){
  vi.stubEnv('NETLIFY','true');vi.stubEnv('CONTEXT','production');vi.stubEnv('URL',production);
  vi.stubEnv('PUBLIC_SITE_URL',origin);vi.stubEnv('VITE_PUBLIC_SITE_URL','');
 }
 it('rejects the exact stale demo origin seen on production',()=>{
  environment('https://aevic-demo.netlify.app');
  expect(()=>buildConfiguration()).toThrow('PUBLIC_SITE_URL must match the Netlify primary production URL');
 });
 it('accepts the real production domain and matching browser origin',()=>{
  environment();vi.stubEnv('VITE_PUBLIC_SITE_URL',production);
  expect(buildConfiguration().canonicalOrigin).toBe(production);
 });
 it('does not mistake a browser-only setting for Functions configuration',()=>{
  environment('');vi.stubEnv('VITE_PUBLIC_SITE_URL',production);
  expect(()=>buildConfiguration()).toThrow('Builds and Functions scopes');
 });
 it('supports an explicitly configured custom primary domain',()=>{
  environment('https://aevicesports.com');vi.stubEnv('URL','https://aevicesports.com');
  expect(buildConfiguration().canonicalOrigin).toBe('https://aevicesports.com');
 });
 it('does not compare preview builds to the production primary domain',()=>{
  environment('https://deploy-preview-1--aevic-esports.netlify.app');vi.stubEnv('CONTEXT','deploy-preview');
  expect(buildConfiguration().indexableDeployment).toBe(false);
 });
});
