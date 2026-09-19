import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import { routes } from './router';
import { registerPwa } from './registerPwa';

export async function startApplication() {
  const root = document.getElementById('root')!;
  const application = <StrictMode><App router={createBrowserRouter(routes)} /></StrictMode>;
  // Only Home contains the real component tree. Other route shells keep client rendering.
  if (import.meta.env.PROD && window.location.pathname === '/' && root.dataset.prerender === 'home') {
    hydrateRoot(root, application);
  } else {
    createRoot(root).render(application);
  }
  registerPwa();
}
