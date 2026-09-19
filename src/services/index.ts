import { createApiServices } from './apiAdapter';
import { createServiceCapabilities } from './capabilities';
import { clearQueryCache, synchronizeSessionCache } from './queryCache';

export const services = createApiServices(import.meta.env.VITE_API_BASE_URL || '/api');
export const serviceCapabilities = createServiceCapabilities();
const auth = { ...services.auth };
let identityRevision = 0;
const notifyIdentity = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('aevic:session-change')); };
// Only an invalidation signal crosses tabs; no account data or token is broadcast.
const channel = typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined' ? new window.BroadcastChannel('aevic-session') : undefined;
if (channel) channel.onmessage = () => { identityRevision++; synchronizeSessionCache(null); clearQueryCache(); notifyIdentity(); };
services.auth.getSession = async () => {
  const revision = identityRevision;
  try { const session = await auth.getSession(); if(revision===identityRevision)synchronizeSessionCache(session ? `${session.user.id}:${session.role}` : null); return revision===identityRevision?session:auth.getSession(); }
  catch (error) { if(revision===identityRevision){synchronizeSessionCache(null);clearQueryCache();} throw error; }
};
services.auth.login = async (...args) => { identityRevision++; const session = await auth.login(...args); synchronizeSessionCache(`${session.user.id}:${session.role}`); channel?.postMessage('changed'); notifyIdentity(); return session; };
services.auth.logout = async () => { identityRevision++; clearQueryCache(); synchronizeSessionCache(null); try { await auth.logout(); channel?.postMessage('changed'); } finally { clearQueryCache(); notifyIdentity(); } };
export function competitionNow() { return new Date(); }
