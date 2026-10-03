import { afterEach, describe, expect, it, vi } from 'vitest';
import { readConfig } from '../../server/config';
import { buildConfiguration } from '../../scripts/build-config.mjs';
const origin = 'https://aevic-demo.netlify.app';
const serverEnv = { PUBLIC_SITE_URL: origin, SUPABASE_URL: 'https://nmjjibifcuzjlsvfcaaz.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'fixture-key' };
afterEach(() => vi.unstubAllEnvs());
describe('production and preview indexing', () => {
  it.each(['production', 'deploy-preview', 'branch-deploy'])('agrees between build and server for %s', context => {
    vi.stubEnv('PUBLIC_SITE_URL', origin); vi.stubEnv('VITE_PUBLIC_SITE_URL', origin); vi.stubEnv('CONTEXT', context);
    expect(buildConfiguration().indexableDeployment).toBe(context === 'production');
    expect(readConfig({ ...serverEnv, CONTEXT: context }).indexableDeployment).toBe(context === 'production');
  });
  it('keeps the local development server non-indexable', () => {
    vi.stubEnv('PUBLIC_SITE_URL', origin); vi.stubEnv('VITE_PUBLIC_SITE_URL', origin); vi.stubEnv('CONTEXT', 'production');
    expect(buildConfiguration('development', true).indexableDeployment).toBe(false);
    expect(readConfig({ ...serverEnv, PUBLIC_SITE_URL: 'http://localhost:8888' }).indexableDeployment).toBe(false);
  });
});
