import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import publicContext from '../netlify/functions/public-context';
import apiNotFound from '../netlify/functions/api-not-found';
import { buildPublicPlatformSnapshot } from '../netlify/functions/_shared/publicContext';
import { createApiServices } from '../src/services/apiAdapter';
import { contentSecurityPolicy } from '../scripts/security-policy.mjs';
import { ApiError } from '../src/services/apiError';

const publishableKey = 'sb_publishable_test_key';
const supabaseUrl = 'https://example-project.supabase.co';

function stubServerEnvironment() {
  vi.stubEnv('SUPABASE_URL', supabaseUrl);
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', publishableKey);
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-secret-must-not-be-used');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GET /api/public/context', () => {
  it('returns JSON conforming to PublicPlatformSnapshot', async () => {
    stubServerEnvironment();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 7,
      team_name: 'Əjdaha Squad',
      logo_url: supabaseUrl + '/storage/v1/object/public/logos/team.png',
      status: 'approved',
      player1_ign: 'One',
      player2_ign: 'Two',
      player3_ign: 'Three',
      player4_ign: 'Four',
      player5_ign: 'Five',
    }]), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await publicContext(new Request('http://localhost/api/public/context'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(body).toEqual({
      tournaments: [],
      teams: [{ id: '7', slug: 'ejdaha-squad-7', name: 'Əjdaha Squad', logoUrl: supabaseUrl + '/storage/v1/object/public/logos/team.png', rosterSize: 5, gameKey: 'pubg-mobile' }],
      organizations: [],
      leaderboard: [],
      leaderboardTeams: [],
      playerPerformances: [],
      teamComparisonRecords: [],
      teamAchievements: [],
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const url = new URL(requestUrl);
    expect(url.pathname).toBe('/rest/v1/teams');
    expect(url.searchParams.get('status')).toBe('eq.approved');
    expect(url.searchParams.get('select')).not.toContain('password_hash');
    expect(new Headers(requestInit.headers).get('apikey')).toBe(publishableKey);
    expect(JSON.stringify(requestInit)).not.toContain('server-secret-must-not-be-used');
  });

  it('returns contract-compatible empty states when no approved production resources exist', async () => {
    expect(buildPublicPlatformSnapshot([])).toEqual({
      tournaments: [],
      teams: [],
      organizations: [],
      leaderboard: [],
      leaderboardTeams: [],
      playerPerformances: [],
      teamComparisonRecords: [],
      teamAchievements: [],
    });
  });

  it('returns a sanitized JSON failure when Supabase fails', async () => {
    stubServerEnvironment();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'internal database detail' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await publicContext(new Request('http://localhost/api/public/context', { headers: { 'x-request-id': 'test-request' } }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body).toEqual({ code: 'PUBLIC_CONTEXT_UNAVAILABLE', message: 'Məlumat servisi hazırda cavab vermir.', requestId: 'test-request' });
    expect(JSON.stringify(body)).not.toContain('internal database detail');
    expect(consoleError).toHaveBeenCalledWith('[public-context] request failed', expect.objectContaining({ code: 'SUPABASE_REQUEST_FAILED', upstreamStatus: 503 }));
  });
});

describe('API routing boundary', () => {
  it('returns JSON 404 for unknown API paths', async () => {
    const response = await apiNotFound(new Request('http://localhost/api/unknown'));
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ code: 'API_ROUTE_NOT_FOUND' }));
  });

  it('orders API rewrites before the SPA fallback', () => {
    const config = readFileSync(resolve(process.cwd(), 'netlify.toml'), 'utf8');
    const publicContextRule = config.indexOf('from = "/api/public/context"');
    const apiFallbackRule = config.indexOf('from = "/api/*"');
    const spaRule = config.indexOf('from = "/*"');
    expect(publicContextRule).toBeGreaterThan(-1);
    expect(publicContextRule).toBeLessThan(apiFallbackRule);
    expect(apiFallbackRule).toBeLessThan(spaRule);
    expect(config).toContain('to = "/404.html"');
  });

  it('declares restrictive page security headers without weakening scripts', () => {
    const config = readFileSync(resolve(process.cwd(), 'netlify.toml'), 'utf8');
    const csp = contentSecurityPolicy(supabaseUrl);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(config).not.toContain("script-src 'self' 'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(config).toContain('Cross-Origin-Opener-Policy = "same-origin"');
    expect(config).toContain('X-Frame-Options = "DENY"');
    expect(config).toContain('X-Content-Type-Options = "nosniff"');
  });
});

describe('API adapter response validation', () => {
  it('rejects a successful text/html response with an informative code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=UTF-8' },
    })));

    const request = createApiServices('/api').snapshots.public();
    await expect(request).rejects.toMatchObject<ApiError>({
      code: 'UNEXPECTED_CONTENT_TYPE',
      kind: 'server',
      status: 200,
    });
  });

  it('accepts application/problem+json as a JSON response', async () => {
    const snapshot = buildPublicPlatformSnapshot([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { 'content-type': 'application/problem+json' },
    })));
    await expect(createApiServices('/api').snapshots.public()).resolves.toEqual(snapshot);
  });
});
