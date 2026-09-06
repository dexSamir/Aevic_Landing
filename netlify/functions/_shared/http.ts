const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
export const API_SECURITY_HEADERS = {
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
} as const;

export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': JSON_CONTENT_TYPE,
      ...API_SECURITY_HEADERS,
      ...headers,
    },
  });
}

export function requestIdFrom(request: Request) {
  const forwarded = request.headers.get('x-nf-request-id') ?? request.headers.get('x-request-id');
  if (forwarded && /^[a-zA-Z0-9_.:-]{1,128}$/.test(forwarded)) return forwarded;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `request-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
