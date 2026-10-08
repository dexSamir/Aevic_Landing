import { useEffect, useState } from 'react';

/** Reuse the initial header style when the shared footer enters the viewport. */
export function useFooterVisibility(pathname: string) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const footer = document.querySelector<HTMLElement>('.cinematic-footer');
    if (!footer || typeof IntersectionObserver === 'undefined') return;
    // A small inset avoids toggling on a single pixel at the viewport edge.
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    }, { rootMargin: '0px 0px -24px 0px', threshold: 0 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [pathname]);
  return visible;
}
