import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Component tests use isolated fixtures; the application always uses HTTP.
vi.mock('../src/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services')>();
  const { fixtureServices } = await import('./fixtures/component-services');
  const { mockCompetitionNow } = await import('./fixtures/clock');
  return { ...actual, services: fixtureServices, competitionNow: mockCompetitionNow };
});
vi.mock('../src/services/realtime', () => ({ subscribeTeam: async () => undefined }));

// Vitest globals are disabled, so Testing Library cannot register this itself.
// Unmount before jsdom teardown so component exit timers are cancelled.
afterEach(cleanup);

Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true });
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false }),
});
