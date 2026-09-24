import { sanitizeImageUrl, sanitizeOutboundUrl } from './outboundUrl';

// Public config only. This is the same origin consumed by the build-time CSP.
const configured = import.meta.env.VITE_PUBLIC_MEDIA_ORIGIN || import.meta.env.VITE_SUPABASE_URL;
const safe = sanitizeOutboundUrl(configured);
export const publicMediaOrigins = safe ? [new URL(safe).origin] : [];
export const publicImageUrl = (value: unknown) => sanitizeImageUrl(value, publicMediaOrigins);

/** Resize public uploads at the edge; originals and storage permissions stay intact. */
export function publicImageSrcSet(value: unknown, widths: readonly number[] = [64, 128, 256, 512]) {
  const source = publicImageUrl(value);
  if (!import.meta.env.PROD || !source) return undefined;
  const legacy = /^\/api\/media\/[0-9a-f-]{36}$/i.test(source);
  const storage = /^https:\/\/nmjjibifcuzjlsvfcaaz\.supabase\.co\/storage\/v1\/object\/public\//.test(source);
  if (!legacy && !storage) return undefined;
  return widths.map(width => `/.netlify/images?${new URLSearchParams({ url: source, w: String(width), fit: 'contain', fm: 'webp', q: '85' })} ${width}w`).join(', ');
}

export function restoreOriginalUpload(image: HTMLImageElement) {
  if (!image.hasAttribute('srcset')) return false;
  image.removeAttribute('srcset');
  return true;
}
