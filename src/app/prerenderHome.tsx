import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter } from 'react-router-dom';
import App from '../App';
import { routes } from './router';

/** Build-time only. Effects do not run: no API calls, sessions, or fabricated snapshots. */
export function renderHome() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  try {
    return renderToString(<StrictMode><App router={router} /></StrictMode>);
  } finally {
    router.dispose();
  }
}
