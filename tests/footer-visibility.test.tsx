import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useFooterVisibility } from '../src/layouts/useFooterVisibility';

afterEach(() => { cleanup(); document.querySelector('.cinematic-footer')?.remove(); vi.unstubAllGlobals(); });

it('tracks footer entry and exit, reconnects on navigation and disconnects on unmount', () => {
  const callbacks: IntersectionObserverCallback[] = [];
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { callbacks.push(callback); }
    observe = observe;
    disconnect = disconnect;
  });
  const footer = document.createElement('footer');
  footer.className = 'cinematic-footer';
  document.body.append(footer);
  const { result, rerender, unmount } = renderHook(({ path }) => useFooterVisibility(path), { initialProps: { path: '/' } });
  const intersect = (visible: boolean) => act(() => callbacks.at(-1)!([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(observe).toHaveBeenCalledWith(footer);
  expect(result.current).toBe(false);
  intersect(true);
  expect(result.current).toBe(true);
  intersect(false);
  expect(result.current).toBe(false);
  intersect(true);
  rerender({ path: '/teams' });
  expect(result.current).toBe(false);
  expect(disconnect).toHaveBeenCalledTimes(1);
  intersect(true);
  expect(result.current).toBe(true);
  unmount();
  expect(disconnect).toHaveBeenCalledTimes(2);
});

it('keeps the normal header when no shared footer exists', () => {
  const observe = vi.fn();
  vi.stubGlobal('IntersectionObserver', class { observe = observe; });
  const { result } = renderHook(() => useFooterVisibility('/'));
  expect(result.current).toBe(false);
  expect(observe).not.toHaveBeenCalled();
});
