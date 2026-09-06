import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { renderHome } from '../src/app/prerenderHome';
import { applyLocalImageFallback } from '../src/assets/imageDelivery';

describe('Home first-paint rendering contract', () => {
  it('recovers an image that failed before hydration without dropping responsive JPEG candidates', () => {
    const picture = document.createElement('picture');
    picture.innerHTML = '<source type="image/avif" srcset="/hero.avif"><img src="/hero.jpg" srcset="/hero-small.jpg 480w, /hero.jpg 1586w">';
    const image = picture.querySelector('img')!;
    applyLocalImageFallback(image, '/hero.jpg');
    expect(picture.querySelector('source')).toBeNull();
    expect(image.srcset).toContain('480w');
    expect(image.dataset.localFallbackApplied).toBe('true');
    applyLocalImageFallback(image, '/different.jpg');
    expect(image.getAttribute('src')).toBe('/hero.jpg');
  });
  it('renders the real Home components without starting a network request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No build-time network'));
    try {
      const html = renderHome();
      expect(html).toContain('home-live-hero__copy');
      expect(html).toContain('Rəqabətin <em>rəsmi səhnəsi.</em>');
      expect(html).toContain('home-live-hero__media');
      expect(html).toContain('image/avif');
      expect(html).toContain('Yarış məlumatı yoxlanılır…');
      expect(html).not.toContain('prerender-shell');
      expect(html.match(/<h1[ >]/g)).toHaveLength(1);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });

  it('keeps React and the router outside the small first-load entry', () => {
    const entry = readFileSync('src/main.tsx', 'utf8');
    expect(entry).toContain("import('./app/startApplication')");
    expect(entry).not.toMatch(/from ['"](?:react|react-dom|react-router)/);
    expect(entry).not.toContain('setTimeout');
    expect(entry).toContain("import './styles/components.css'");
    expect(readFileSync('src/index.css', 'utf8')).not.toContain("@import './styles/components.css'");
  });

  it('hydrates only the marked Home tree and preserves client rendering elsewhere', () => {
    const startup = readFileSync('src/app/startApplication.tsx', 'utf8');
    expect(startup).toContain("window.location.pathname === '/'");
    expect(startup).toContain("root.dataset.prerender === 'home'");
    expect(startup).toContain('hydrateRoot(root, application)');
    expect(startup).toContain('createRoot(root).render(application)');
    expect(startup).toContain('await loadRouteStyles(window.location.pathname)');
  });
});
