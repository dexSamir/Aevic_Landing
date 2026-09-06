let waiting: ServiceWorkerRegistration | undefined;
let accepted = false;
export const hasPwaUpdate = () => Boolean(waiting?.waiting);
export function acceptPwaUpdate() {
  if (!waiting?.waiting) return;
  accepted = true;
  waiting.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
}
export function registerPwa() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations
      .filter((registration) => registration.active?.scriptURL.endsWith('/sw.js')).map((registration) => registration.unregister())));
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (accepted) window.location.reload(); });
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      const announce = () => { if (registration.waiting && navigator.serviceWorker.controller) { waiting = registration; window.dispatchEvent(new Event('aevic:pwa-update')); } };
      announce();
      registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', announce));
    } catch { /* Installation is optional; online routes remain available. */ }
  };
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', () => void register(), { once: true });
}
