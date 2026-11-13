import { useCallback, type RefObject } from 'react';
import './full-bleed-rail.css';

/** Keep the first card on the content grid, but scroll to the visible panel edges.
 * Opt in card rails only; tables, tabs and vertical scrolling retain their layout.
 * A nested workspace can declare a closer data-carousel-boundary when needed.
 */
export function useFullBleedRail<T extends HTMLElement>(ref?: RefObject<T | null>) {
  return useCallback((node: T | null) => {
    if (ref) ref.current = node;
    if (!node) return;
    const boundary = node.closest<HTMLElement>('[data-carousel-boundary], .product-main') ?? document.documentElement;
    let start = 0, end = 0;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (!rect.width) return;
      const bounds = boundary.getBoundingClientRect();
      const left = Math.max(0, bounds.left);
      const right = Math.min(document.documentElement.clientWidth, bounds.right);
      const style = getComputedStyle(node);
      const active = node.hasAttribute('data-full-bleed-rail');
      const insetStart = active ? start : parseFloat(style.paddingLeft) || 0;
      const insetEnd = active ? end : parseFloat(style.paddingRight) || 0;
      const scrollable = ['auto', 'scroll'].includes(style.overflowX);
      const nextStart = scrollable ? Math.max(0, rect.left + insetStart - left) : 0;
      const nextEnd = scrollable ? Math.max(0, right - (rect.right - insetEnd)) : 0;
      node.toggleAttribute('data-full-bleed-rail', scrollable);
      if (Math.abs(nextStart - start) > .1 || Math.abs(nextEnd - end) > .1) {
        start = nextStart; end = nextEnd;
        node.style.setProperty('--rail-start', `${start}px`);
        node.style.setProperty('--rail-end', `${end}px`);
      }
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(node); observer?.observe(boundary);
    if (node.parentElement) observer?.observe(node.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect(); window.removeEventListener('resize', measure);
      node.removeAttribute('data-full-bleed-rail');
      node.style.removeProperty('--rail-start'); node.style.removeProperty('--rail-end');
      if (ref) ref.current = null;
    };
  }, [ref]);
}
