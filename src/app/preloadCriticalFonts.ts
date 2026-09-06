import oswald700 from '@fontsource/oswald/files/oswald-latin-ext-700-normal.woff2?url';
import oswaldLatin700 from '@fontsource/oswald/files/oswald-latin-700-normal.woff2?url';

export function preloadCriticalFonts() {
  [oswald700, oswaldLatin700].forEach((href) => {
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
