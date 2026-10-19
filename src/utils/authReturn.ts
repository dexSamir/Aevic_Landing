/** Only app pages can be login destinations; auth/API URLs cannot form loops. */
export function safeAuthReturn(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20]/.test(value)) return;
  try {
    const url = new URL(value, 'https://aevic.invalid');
    const path = decodeURIComponent(url.pathname);
    if (url.origin !== 'https://aevic.invalid' || /[\\\x00-\x20]/.test(path) || path.startsWith('//')) return;
    if (/^\/(?:team|account|tournaments|teams|matches)(?:\/|$)/.test(path)) return url.pathname + url.search + url.hash;
  } catch { /* Invalid URL or encoding. */ }
}
export function authorizedAuthReturn(value: unknown, hasWorkspace: boolean) {
  const target = safeAuthReturn(value);
  return target && (!/^\/team(?:\/|$)/.test(decodeURIComponent(target.split(/[?#]/)[0])) || hasWorkspace) ? target : hasWorkspace ? '/team' : '/account';
}
