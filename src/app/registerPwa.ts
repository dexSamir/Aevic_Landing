import { serviceWorkerUrl } from './serviceWorkerUrl';

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
      const registration = await navigator.serviceWorker.register(serviceWorkerUrl(), { updateViaCache: 'none' });
      const announce = () => { if (registration.waiting && navigator.serviceWorker.controller) { waiting = registration; window.dispatchEvent(new Event('aevic:pwa-update')); } };
      announce();
      registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', announce));
    } catch { /* Installation is optional; online routes remain available. */ }
  };
  // Installation is background work. Keep the load boundary and let the
  // browser finish pending rendering/input before fetching/installing a worker.
  const schedule = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => void register());
    else void register();
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
}
