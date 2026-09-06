export function contentSecurityPolicy(mediaOrigin) {
  return "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:" + (mediaOrigin ? ' ' + mediaOrigin : '') + "; connect-src 'self'; worker-src 'self'; manifest-src 'self'; form-action 'self'";
}
