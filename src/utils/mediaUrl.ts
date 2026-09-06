import { sanitizeImageUrl, sanitizeOutboundUrl } from './outboundUrl';

// Public config only. This is the same origin consumed by the build-time CSP.
const configured = import.meta.env.VITE_PUBLIC_MEDIA_ORIGIN || import.meta.env.VITE_SUPABASE_URL;
const safe = sanitizeOutboundUrl(configured);
export const publicMediaOrigins = safe ? [new URL(safe).origin] : [];
export const publicImageUrl = (value: unknown) => sanitizeImageUrl(value, publicMediaOrigins);
