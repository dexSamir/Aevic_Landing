import inter from '../assets/fonts/inter-latin-wght-normal.woff2?url';
import interExtended from '../assets/fonts/inter-latin-ext-wght-normal.woff2?url';

export function preloadCriticalFonts() {
  [inter, interExtended].forEach((href) => {
    if (document.head.querySelector(`link[rel="preload"][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preload'; link.as = 'font'; link.type = 'font/woff2';
    link.crossOrigin = 'anonymous'; link.href = href;
    document.head.append(link);
  });
}
