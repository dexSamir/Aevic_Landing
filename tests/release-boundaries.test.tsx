import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { routeManifest, matchRoute } from '../src/app/routeManifest';
import { createServiceCapabilities } from '../src/services/capabilities';
import { validatePublicSnapshot } from '../src/services/snapshotValidation';
import { buildPublicPlatformSnapshot } from '../netlify/functions/_shared/publicContext';
import publicContext from '../netlify/functions/public-context';
import apiNotFound from '../netlify/functions/api-not-found';
import { apiErrorFromResponse } from '../src/services/apiError';
import { clearQueryCache, invalidateQuery, usePlatformQuery } from '../src/services/queryCache';

afterEach(() => { clearQueryCache('all'); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('public release boundaries', () => {
  it('keeps unique canonical route identities and static paths', () => {
    expect(new Set(routeManifest.map((route) => route.id)).size).toBe(routeManifest.length);
    expect(new Set(routeManifest.map((route) => route.path)).size).toBe(routeManifest.length);
    for (const route of routeManifest.filter((route) => !route.path.includes(':') && route.path !== '*')) expect(matchRoute(route.path)?.id).toBe(route.id);
    expect(matchRoute('/not-a-real-route')).toBeUndefined();
  });
  it('requires capability gates and noindex for every private route', () => {
    const capabilities = createServiceCapabilities('api');
    for (const route of routeManifest.filter((route) => ['TEAM', 'ADMIN', 'ACCOUNT', 'AUTH'].includes(route.family))) {
      expect(route.indexable, route.path).toBe(false);
      expect(route.capability, route.path).toBeTruthy();
      expect(capabilities[route.capability!], route.path).toBe(false);
    }
  });
  it.each([null, [], {}, { teams: [] }, { ...buildPublicPlatformSnapshot([]), teams: [{ id: 'bad' }] }])('rejects malformed public snapshots without inventing empty data', (value) => {
    expect(() => validatePublicSnapshot(value)).toThrow();
  });
  it('accepts the actual public read-only projection', () => {
    const snapshot = buildPublicPlatformSnapshot([{ id: 1, team_name: 'Real approved identity', status: 'approved' }]);
    expect(validatePublicSnapshot(snapshot)).toEqual(snapshot);
  });
  it('rejects malformed and duplicate database identities', () => {
    expect(() => buildPublicPlatformSnapshot([null])).toThrow();
    const row = { id: 1, team_name: 'Team', status: 'approved' };
    expect(() => buildPublicPlatformSnapshot([row, row])).toThrow();
  });
  it.each([null, [], 'unsafe server text'])('sanitizes structurally invalid JSON error bodies', async (value) => {
    const error = await apiErrorFromResponse(new Response(JSON.stringify(value), { status: 500, headers: { 'content-type': 'application/json' } }));
    expect(error.kind).toBe('server'); expect(error.message).not.toContain('unsafe');
  });
  it('returns bodyless unknown-route HEAD responses', async () => {
    const response = await apiNotFound(new Request('https://example.test/api/missing', { method: 'HEAD' }));
    expect(response.status).toBe(404); expect(await response.text()).toBe(''); expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('returns bodyless public HEAD failures and rejects writes without an upstream call', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test_key');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetcher = vi.fn().mockRejectedValue(new Error('private upstream details')); vi.stubGlobal('fetch', fetcher);
    const response = await publicContext(new Request('https://example.test/api/public/context', { method: 'HEAD' }));
    expect(response.status).toBeGreaterThanOrEqual(500); expect(await response.text()).toBe('');
    fetcher.mockClear();
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) expect((await publicContext(new Request('https://example.test/api/public/context', { method }))).status).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('invalidates a mounted query and reloads the authoritative mutation result', async () => {
    let value = 1;
    const query = vi.fn(async () => value);
    const hook = renderHook(() => usePlatformQuery({ key: 'snapshot:mutation-test', query, retry: 0 }));
    await waitFor(() => expect(hook.result.current.data).toBe(1));
    value = 2;
    act(() => invalidateQuery('snapshot:mutation-test'));
    await waitFor(() => expect(hook.result.current.data).toBe(2));
    hook.unmount();
  });
});

describe('service worker routing', () => {
  const events = new Map<string, (event: any) => void>();
  const source = readFileSync('public/sw.js', 'utf8');
  const worker = runInNewContext(source + '; ({ privatePath, staticAsset })', { self: { location: { origin: 'https://example.test' }, addEventListener: (name: string, callback: any) => events.set(name, callback) }, URL });
  it.each(['/team', '/team/a', '/admin/results', '/account', '/api/public/context', '/login', '/register', '/reset-password', '/verify-email', '/%61dmin', '/TEAM', '/team%5Crooms', '/malformed%'])('never intercepts private path %s', (path) => {
    expect(worker.privatePath(path)).toBe(true);
    const respondWith = vi.fn(); events.get('fetch')!({ request: { method: 'GET', mode: 'navigate', url: 'https://example.test' + path }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it('does not confuse public team directories with private Team routes', () => {
    expect(worker.privatePath('/teams/caspian-wolves')).toBe(false);
    expect(worker.staticAsset({}, new URL('https://example.test/assets/site-hash.css'))).toBe(true);
    expect(worker.staticAsset({}, new URL('https://example.test/assets/site-hash.css?private=true'))).toBe(false);
    expect(worker.staticAsset({}, new URL('https://example.test/team'))).toBe(false);
  });
  it('requires a user message to activate an update and never caches HTML navigations', () => {
    expect(source.match(/self\.skipWaiting\(/g)).toHaveLength(1);
    expect(source).toContain("event.data?.type === 'ACTIVATE_UPDATE'");
    expect(source).not.toContain("cache.put('/'");
    expect(source).not.toContain('cache.put(request, response.clone());\n    return response;\n  }');
  });
});
