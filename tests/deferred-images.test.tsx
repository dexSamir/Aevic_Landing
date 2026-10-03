import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaBackdrop } from '../src/components/common/MediaBackdrop';
import { MapRotation } from '../src/components/competition/CompetitionVisuals';

let approach: (() => void)[];
beforeEach(() => {
  approach = [];
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
      expect(options.rootMargin).toBe('300px 0px');
      approach.push(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
    }
    observe() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('below-fold responsive delivery', () => {
  it('withholds every source without the fallback hook eagerly restoring it', () => {
    const { container } = render(<MediaBackdrop deferred src="/photo.jpg" srcSet="/photo-small.jpg 480w, /photo.jpg 1280w" sources={[{ type: 'image/avif', srcSet: '/photo.avif 1280w' }]} width={1280} height={480} />);
    const image = container.querySelector('img')!;
    expect(image.hasAttribute('src')).toBe(false);
    expect(image.hasAttribute('srcset')).toBe(false);
    expect(container.querySelector('source')).toBeNull();
    expect(image.width).toBe(1280); expect(image.height).toBe(480);
    act(() => approach[0]());
    expect(image.getAttribute('src')).toBe('/photo.jpg');
    expect(image.getAttribute('srcset')).toContain('480w');
    expect(container.querySelector('source')?.getAttribute('type')).toBe('image/avif');
  });
  it('never defers the priority hero, even if both flags are passed', () => {
    const { container } = render(<MediaBackdrop deferred priority src="/hero.jpg" />);
    expect(approach).toHaveLength(0);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/hero.jpg');
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('eager');
    expect(container.querySelector('img')?.getAttribute('fetchpriority')).toBe('high');
  });
  it('defers all four program portraits and restores their responsive formats', () => {
    const { container } = render(<MapRotation variant="program" />);
    const images = [...container.querySelectorAll('img')];
    expect(images).toHaveLength(4);
    expect(images.every(image => !image.hasAttribute('src'))).toBe(true);
    expect(container.querySelectorAll('source')).toHaveLength(0);
    act(() => approach.forEach(notify => notify()));
    expect(images.every(image => image.hasAttribute('srcset'))).toBe(true);
    expect(container.querySelectorAll('source[type="image/avif"]')).toHaveLength(4);
  });
});
