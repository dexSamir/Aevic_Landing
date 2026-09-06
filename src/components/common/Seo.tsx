import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { matchRoute, routeIsAvailable } from '../../app/routeManifest';
import { serviceCapabilities } from '../../services';
import { configuredPublicOrigin } from '../../utils/publicUrl';
import { publicImageUrl } from '../../utils/mediaUrl';

const SITE_NAME = 'AEVIC Esports';
const DEFAULT_DESCRIPTION = 'AEVIC turnirləri, komandaları, nəticələri və rəqabət irsi.';

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
}

export function Seo({ title, description = DEFAULT_DESCRIPTION, canonicalPath, image }: { title: string; description?: string; canonicalPath?: string; image?: string }) {
  const location = useLocation();
  useEffect(() => {
    const fullTitle = title.includes('AEVIC') ? title : `${title} | ${SITE_NAME}`;
    const route = matchRoute(location.pathname);
    const origin = configuredPublicOrigin();
    const indexable = Boolean(origin && route?.indexable && routeIsAvailable(route, serviceCapabilities));
    const canonical = origin && indexable ? new URL(canonicalPath ?? location.pathname, origin).toString() : '';
    upsertMeta('meta[name="robots"]', { name: 'robots', content: indexable ? 'index,follow' : 'noindex,follow' });
    document.title = fullTitle;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    {
      const absoluteImage = new URL(publicImageUrl(image) ?? '/brand/aevic-phoenix.jpg', origin ?? window.location.origin).toString();
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: absoluteImage });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: absoluteImage });
    }
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    if (canonical) link.href = canonical;
    else link.remove();
  }, [canonicalPath, description, image, location.pathname, title]);
  return null;
}

export function RouteSeo() {
  const { pathname } = useLocation();
  const route = matchRoute(pathname);
  return <Seo title={route?.title ?? 'Səhifə tapılmadı — AEVIC'} description={route?.description ?? 'Bu ünvan AEVIC marşrutları arasında yoxdur.'} />;
}
