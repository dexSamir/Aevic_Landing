import oswald700 from '../assets/fonts/oswald-aevic.woff2?url';
import raleway from '../assets/fonts/raleway-aevic.woff2?url';

export function preloadCriticalFonts() {
  [raleway, oswald700].forEach((href) => {
    if (document.head.querySelector(`link[rel="preload"][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = href;
    document.head.append(link);
  });
}
