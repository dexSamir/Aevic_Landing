import { API_SECURITY_HEADERS, jsonResponse, requestIdFrom } from './_shared/http';
import { loadPublicPlatformSnapshot, PublicContextLoadError } from './_shared/publicContext';

const PUBLIC_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

export default async function publicContext(request: Request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported.' }, 405, {
      allow: 'GET, HEAD',
      'cache-control': 'no-store',
    });
  }

  const requestId = requestIdFrom(request);
  const startedAt = performance.now();
  const diagnostics = () => ({ 'x-request-id': requestId, 'server-timing': `public-context;dur=${(performance.now() - startedAt).toFixed(1)}` });
  try {
    const snapshot = await loadPublicPlatformSnapshot({ signal: request.signal });
    if (request.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': PUBLIC_CACHE, ...API_SECURITY_HEADERS, ...diagnostics() },
      });
    }
    return jsonResponse(snapshot, 200, { 'cache-control': PUBLIC_CACHE, ...diagnostics() });
  } catch (error) {
    const failure = error instanceof PublicContextLoadError
      ? error
      : new PublicContextLoadError('PUBLIC_CONTEXT_UNEXPECTED', 500, 'The public context request failed unexpectedly.');
    console.error('[public-context] request failed', {
      requestId,
      code: failure.code,
      upstreamStatus: failure.upstreamStatus,
      durationMs: Math.round(performance.now() - startedAt),
      retryable: failure.retryable,
    });
    const response = jsonResponse({
      code: 'PUBLIC_CONTEXT_UNAVAILABLE',
      message: 'Məlumat servisi hazırda cavab vermir.',
      requestId,
    }, failure.status, { 'cache-control': 'no-store', 'x-retryable': String(failure.retryable), ...(failure.retryAfter ? { 'retry-after': failure.retryAfter } : {}), ...diagnostics() });
    return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
  }
}
