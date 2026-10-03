/** Paint existing HTML before competing hydration downloads begin. */
export function afterInitialPaint(start: () => void) {
  let started = false;
  let frame = 0;
  let observer: PerformanceObserver | undefined;
  const run = () => {
    if (started) return;
    started = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    start();
  };
  const onVisibility = () => { if (document.visibilityState === 'hidden') run(); };
  // Background tabs may suspend animation frames; never leave startup stranded.
  if (document.visibilityState === 'hidden') return run();
  document.addEventListener('visibilitychange', onVisibility);
  if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('paint')) {
    observer = new PerformanceObserver(list => {
      if (list.getEntries().some(entry => entry.name === 'first-contentful-paint')) run();
    });
    observer.observe({ type: 'paint', buffered: true });
    return;
  }
  // Engines without Paint Timing still get a rendering opportunity.
  frame = requestAnimationFrame(() => { frame = requestAnimationFrame(run); });
}
