import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageTransition } from '../src/components/common/Motion';

afterEach(() => vi.restoreAllMocks());
describe('Home wheel enhancement boundaries', () => {
  it('eases discrete wheel input but preserves trackpad, zoom and nested controls', () => {
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(4000);
    const { getByRole, unmount } = render(<PageTransition routeKey="/" family="editorial"><input aria-label="Search" /></PageTransition>);
    const wheel = (target: EventTarget, options = {}) => {
      const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true, ...options });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(wheel(window)).toBe(true);
    fireEvent.keyDown(window, { key: 'PageDown' });
    expect(wheel(window, { deltaY: 8.5 })).toBe(false);
    expect(wheel(window, { ctrlKey: true })).toBe(false);
    expect(wheel(getByRole('textbox'))).toBe(false);
    unmount();
    expect(wheel(window)).toBe(false);
  });
  it('leaves other routes native', () => {
    render(<PageTransition routeKey="/teams" family="editorial">Teams</PageTransition>);
    const event = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
  it('respects reduced motion', () => {
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: true }));
    render(<PageTransition routeKey="/" family="editorial">Home</PageTransition>);
    const event = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
