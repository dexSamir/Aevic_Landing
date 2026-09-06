export function sanitizeOutboundUrl(value: unknown, options: { allowRelative?: boolean; origins?: readonly string[] } = {}) {
  if (typeof value !== 'string' || !value || value !== value.trim() || /[\\\u0000-\u0020\u007f]/.test(value)) return undefined;
  // Decode once to reject encoded network-path and control-character tricks.
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return undefined; }
  if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith('//')) return undefined;
  if (options.allowRelative && value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname.endsWith('.')) return undefined;
    if (options.origins && !options.origins.includes(url.origin)) return undefined;
    return url.toString();
  } catch { return undefined; }
}

export function sanitizeImageUrl(value: unknown, origins: readonly string[] = []) {
  return sanitizeOutboundUrl(value, { allowRelative: true, origins });
}

export function sanitizeInternalPath(value: unknown) {
  const safe = sanitizeOutboundUrl(value, { allowRelative: true, origins: [] });
  return safe?.startsWith('/') ? safe : undefined;
}
