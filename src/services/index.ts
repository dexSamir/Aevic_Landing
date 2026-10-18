import { ApiError } from './apiError';
import { createApiServices } from './apiAdapter';
import { createServiceCapabilities } from './capabilities';
import { clearQueryCache, synchronizeSessionCache } from './queryCache';

export const services = createApiServices(import.meta.env.VITE_API_BASE_URL || '/api');
export const serviceCapabilities = createServiceCapabilities();
const auth = { ...services.auth };
let identityRevision = 0;
let sessionRead: { revision: number; promise: ReturnType<typeof auth.getSession> } | undefined;
const notifyIdentity = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('aevic:session-change')); };
// Only an invalidation signal crosses tabs; no account data or token is broadcast.
const channel = typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined' ? new window.BroadcastChannel('aevic-session') : undefined;
if (channel) channel.onmessage = () => { identityRevision++; synchronizeSessionCache(null); clearQueryCache(); notifyIdentity(); };
// Cancelling one observer must not abort the shared session read for others.
function observeSession<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new ApiError({status:0,kind:'abort'}));
  return new Promise((resolve,reject) => {
    const cancel = () => { signal.removeEventListener('abort',cancel); reject(new ApiError({status:0,kind:'abort'})); };
    signal.addEventListener('abort',cancel,{once:true});
    void promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',cancel));
  });
}
services.auth.getSession = async (signal) => {
  if (signal?.aborted) throw new ApiError({status:0,kind:'abort'});
  const revision = identityRevision;
  // Share concurrent reads only; every later check still revalidates with the server.
  if (!sessionRead || sessionRead.revision !== revision) {
    const read = { revision, promise: auth.getSession() };
    sessionRead = read;
    void read.promise.finally(() => { if (sessionRead === read) sessionRead = undefined; }).catch(() => {});
  }
  try { const session = await observeSession(sessionRead.promise,signal); if(revision===identityRevision)synchronizeSessionCache(session ? `${session.user.id}:${session.role}` : null); return revision===identityRevision?session:services.auth.getSession(signal); }
  catch (error) { if(revision===identityRevision && error instanceof ApiError && error.status===401){synchronizeSessionCache(null);clearQueryCache();} throw error; }
};
services.auth.login = async (...args) => { identityRevision++; const session = await auth.login(...args); synchronizeSessionCache(`${session.user.id}:${session.role}`); channel?.postMessage('changed'); notifyIdentity(); return session; };
services.auth.logout = async () => {
  await auth.logout();
  // Invalidate only after revocation succeeds: early invalidation refetches with
  // the still-valid cookie and can replace the pending logout with stale identity.
  identityRevision++;
  synchronizeSessionCache(null);
  clearQueryCache();
  channel?.postMessage('changed');
  notifyIdentity();
};
export function competitionNow() { return new Date(); }

const submitRegistration=services.registration.submit;
services.registration.submit=async(...args)=>{const receipt=await submitRegistration(...args);await services.auth.getSession().catch(()=>null);channel?.postMessage('changed');notifyIdentity();return receipt;};
const changePassword=services.account.changePassword;
services.account.changePassword=async(...args)=>{await changePassword(...args);identityRevision++;synchronizeSessionCache(null);clearQueryCache();channel?.postMessage('changed');notifyIdentity();};
