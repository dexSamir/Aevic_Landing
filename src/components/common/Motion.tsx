import { type ReactNode, useEffect, useRef } from 'react';
import { useLocation, useNavigationType, useOutlet } from 'react-router-dom';

export type PageFamily = 'editorial' | 'competition' | 'team' | 'admin' | 'auth' | 'account';

const authPaths = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/session-expired',
  '/admin/login',
]);

export function pageFamilyForPath(pathname: string): PageFamily {
  if (pathname.startsWith('/admin')) return pathname === '/admin/login' ? 'auth' : 'admin';
  if (pathname === '/team' || pathname.startsWith('/team/')) return 'team';
  if (pathname.startsWith('/account')) return 'account';
  if (authPaths.has(pathname)) return 'auth';
  if (
    pathname.startsWith('/tournaments')
    || pathname.startsWith('/matches')
    || pathname.startsWith('/leaderboard')
    || pathname.startsWith('/records')
  ) return 'competition';
  return 'editorial';
}

/** Ease discrete mouse-wheel steps only; native gestures and navigation retain control. */
function useHomeWheelEase(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let target = window.scrollY;
    let previous = 0;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    const tick = (time: number) => {
      const elapsed = Math.min(32, time - previous || 16);
      previous = time;
      const distance = target - window.scrollY;
      window.scrollTo({ top: Math.abs(distance) < .75 ? target : window.scrollY + distance * (1 - Math.exp(-elapsed / 85)), behavior: 'instant' });
      if (Math.abs(target - window.scrollY) > .75) frame = requestAnimationFrame(tick);
      else frame = 0;
    };
    const wheel = (event: WheelEvent) => {
      if (reduced.matches || event.ctrlKey || event.metaKey || event.shiftKey || event.deltaX || !event.cancelable) return;
      // Small/fractional deltas are touchpad gestures, which already have OS inertia.
      if (event.deltaMode === 0 && (Math.abs(event.deltaY) < 50 || !Number.isInteger(event.deltaY))) { stop(); return; }
      let node = event.target instanceof Element ? event.target : null;
      while (node && node !== document.body) {
        if (node.matches('input, textarea, select, [contenteditable], [role="dialog"]')) return;
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY + style.overflowX) && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)) return;
        node = node.parentElement;
      }
      if (!frame) target = window.scrollY;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      target = Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, target + delta));
      if (target === window.scrollY) return;
      event.preventDefault();
      if (!frame) { previous = performance.now(); frame = requestAnimationFrame(tick); }
    };
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', stop);
    window.addEventListener('pointerdown', stop);
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('hashchange', stop);
    reduced.addEventListener('change', stop);
    return () => {
      stop();
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', stop);
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('hashchange', stop);
      reduced.removeEventListener('change', stop);
    };
  }, [enabled]);
}

export function PageTransition({ children, routeKey, family }: { children: ReactNode; routeKey: string; family: PageFamily }) {
  const pageRef = useRef<HTMLDivElement>(null);
  useHomeWheelEase(routeKey === "/");
  useEffect(() => {
    if (family !== 'editorial' && family !== 'competition') return;
    const root = pageRef.current;
    if (!root) return;
    const targets = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
    if (!targets.length) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-revealed'));
      return;
    }
    root.classList.add('public-reveal-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    const observeTarget = (target: HTMLElement, index: number) => {
      target.style.setProperty('--reveal-order', String(index));
      observer.observe(target);
    };
    targets.forEach(observeTarget);
    const additions = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches('[data-reveal]')) observeTarget(node, 0);
        node.querySelectorAll<HTMLElement>('[data-reveal]').forEach(observeTarget);
      }));
    });
    additions.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); additions.disconnect(); };
  }, [family, routeKey]);
  return <div ref={pageRef} className={`motion-page motion-page--${family}`} data-page-family={family} data-route-key={routeKey}>{children}</div>;
}

const routeScrollPositions = new Map<string, number>();

export function routeArrivalTarget(hash: string) {
  if (!hash) return undefined;
  try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
  catch { return undefined; }
}

export function RouteTransitionOutlet({ family }: { family?: PageFamily }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const outlet = useOutlet();
  const resolvedFamily = family ?? pageFamilyForPath(location.pathname);
  const arrivedRef = useRef(false);
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const shouldArrangeArrival = arrivedRef.current;
    arrivedRef.current = true;
    const restoredTop = navigationType === 'POP' ? routeScrollPositions.get(location.key) ?? 0 : 0;
    const frame = shouldArrangeArrival ? window.requestAnimationFrame(() => {
      const hashTarget = routeArrivalTarget(location.hash);
      if (hashTarget) hashTarget.scrollIntoView({ block: 'start' });
      else if (navigationType === 'POP') window.scrollTo({ top: restoredTop });
      else window.scrollTo({ top: 0 });
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }) : undefined;
    const settle = shouldArrangeArrival ? window.setTimeout(() => {
      if (navigationType === 'POP' && !location.hash) window.scrollTo({ top: restoredTop });
    }, 120) : undefined;
    const rememberScroll = () => routeScrollPositions.set(location.key, window.scrollY);
    window.addEventListener('scroll', rememberScroll, { passive: true });
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (settle !== undefined) window.clearTimeout(settle);
      window.removeEventListener('scroll', rememberScroll);
    };
  }, [location.hash, location.key, navigationType]);
  return <PageTransition routeKey={location.pathname} family={resolvedFamily}>{outlet}</PageTransition>;
}
