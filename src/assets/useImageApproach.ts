import { useEffect, useRef, useState } from 'react';

/** Withhold responsive URLs until this picture is within the intentional preload window. */
export function useImageApproach(deferred: boolean) {
  const pictureRef = useRef<HTMLPictureElement>(null);
  const [approached, setApproached] = useState(!deferred);
  useEffect(() => {
    if (!deferred || approached) return;
    if (!('IntersectionObserver' in window)) { setApproached(true); return; }
    const node = pictureRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setApproached(true); observer.disconnect(); }
    }, { rootMargin: '300px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [deferred, approached]);
  return { pictureRef, ready: !deferred || approached };
}
