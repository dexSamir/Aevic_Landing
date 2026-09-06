import { useEffect, useRef, type SyntheticEvent } from 'react';

export interface ResponsiveImageSource {
  srcSet: string;
  type: 'image/avif' | 'image/webp';
}

function netlifyImageUrl(source: string, width: number, format: 'avif' | 'webp') {
  // Width-only variants must preserve the source ratio. Netlify's cover mode
  // requires both dimensions; visual cropping belongs to the component's CSS.
  const params = new URLSearchParams({ url: source, w: String(width), fit: 'contain', fm: format, q: '82' });
  return `/.netlify/images?${params.toString()}`;
}

export function modernImageSources(source: string, widths: readonly number[], localVariants?: readonly string[]): ResponsiveImageSource[] | undefined {
  if (!import.meta.env.PROD) return undefined;
  // Transform the matching checked-in resolution, not the full master for every size.
  // This also bounds source traffic on a cold CDN miss or a local CDN passthrough.
  const sourceSet = (format: 'avif' | 'webp') => widths.map((width, index) => `${netlifyImageUrl(localVariants?.[index] ?? source, width, format)} ${width}w`).join(', ');
  return [
    { type: 'image/avif', srcSet: sourceSet('avif') },
    { type: 'image/webp', srcSet: sourceSet('webp') },
  ];
}

export function applyLocalImageFallback(image: HTMLImageElement, fallbackSource: string) {
  if (image.dataset.localFallbackApplied === 'true') return;
  image.dataset.localFallbackApplied = 'true';
  image.parentElement?.querySelectorAll('source').forEach((source) => source.remove());
  // Keep the local JPEG/PNG srcset, so a CDN failure does not force the largest source.
  image.src = fallbackSource;
}

export function restoreLocalImageFallback(event: SyntheticEvent<HTMLImageElement>, fallbackSource: string) {
  applyLocalImageFallback(event.currentTarget, fallbackSource);
}

/** A prerendered image can fail before React attaches its error listener. */
export function useLocalImageFallback(fallbackSource: string) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth === 0) applyLocalImageFallback(image, fallbackSource);
  }, [fallbackSource]);
  return ref;
}
