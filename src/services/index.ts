import { createRuntimeServices } from './runtimeAdapter';
import { mockCompetitionNow } from '../mocks/clock';
import { createServiceCapabilities } from './capabilities';
import { clearQueryCache, synchronizeSessionCache } from './queryCache';

const configuredDataSource = import.meta.env.VITE_DATA_SOURCE?.trim();

if (configuredDataSource && configuredDataSource !== 'api' && configuredDataSource !== 'mock') {
  throw new Error('VITE_DATA_SOURCE must be either "api" or "mock".');
}

if (import.meta.env.PROD && configuredDataSource === 'mock') {
  throw new Error('Unsafe production configuration: VITE_DATA_SOURCE=mock is forbidden.');
}

// A clean production build uses the API adapter even when no local .env file
// exists. Development and tests remain convenient and explicit with mock data.
export const dataSource = configuredDataSource ?? (import.meta.env.PROD ? 'api' : 'mock');
export const demoMode = dataSource === 'mock';
export const isMockAdapter = dataSource === 'mock';
export const services = createRuntimeServices(dataSource, import.meta.env.VITE_API_BASE_URL || '/api');
export const serviceCapabilities = createServiceCapabilities(dataSource);
const auth = { ...services.auth };
services.auth.getSession = async () => {
  if (!serviceCapabilities.publicSession) return null;
  try { const session = await auth.getSession(); synchronizeSessionCache(session ? `${session.user.id}:${session.role}` : null); return session; }
  catch (error) { synchronizeSessionCache(null); clearQueryCache(); throw error; }
};
services.auth.login = async (...args) => { const session = await auth.login(...args); synchronizeSessionCache(`${session.user.id}:${session.role}`); return session; };
services.auth.logout = async () => { clearQueryCache(); synchronizeSessionCache(null); try { await auth.logout(); } finally { clearQueryCache(); } };
export function competitionNow() { return import.meta.env.DEV && demoMode ? mockCompetitionNow() : new Date(); }
