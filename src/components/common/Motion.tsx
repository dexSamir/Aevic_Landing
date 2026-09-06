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

export function PageTransition({ children, routeKey, family }: { children: ReactNode; routeKey: string; family: PageFamily }) {
  const pageRef = useRef<HTMLDivElement>(null);
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
