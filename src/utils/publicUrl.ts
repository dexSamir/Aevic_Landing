export function configuredPublicOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (!configured) return undefined;
  try { const url = new URL(configured); return url.protocol === 'https:' && !url.username && !url.password ? url.origin : undefined; }
  catch { return undefined; }
}
export function publicSiteOrigin() {
  return configuredPublicOrigin() ?? window.location.origin;
}
export function publicTeamUrl(teamSlug: string) {
  return new URL('/teams/' + encodeURIComponent(teamSlug), publicSiteOrigin()).toString();
}
