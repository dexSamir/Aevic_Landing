import { afterEach, expect, it, vi } from 'vitest';
import * as cache from '../src/services/queryCache';

const { services } = await vi.importActual<typeof import('../src/services')>('../src/services');
afterEach(() => vi.unstubAllGlobals());

it('keeps identity caches intact until the server acknowledges logout', async () => {
  let acknowledge!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { acknowledge = resolve; })));
  const clear = vi.spyOn(cache, 'clearQueryCache');
  const synchronize = vi.spyOn(cache, 'synchronizeSessionCache');
  const changed = vi.fn();
  window.addEventListener('aevic:session-change', changed);
  try {
    const pending = services.auth.logout();
    expect(clear).not.toHaveBeenCalled();
    expect(synchronize).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    acknowledge(new Response(null, { status: 204 }));
    await pending;
    expect(clear).toHaveBeenCalled();
    expect(synchronize).toHaveBeenCalledWith(null);
    expect(changed).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener('aevic:session-change', changed); }
});

it('preserves the current identity when revocation fails so the user can retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } })));
  const synchronize = vi.spyOn(cache, 'synchronizeSessionCache');
  const clear = vi.spyOn(cache, 'clearQueryCache');
  await expect(services.auth.logout()).rejects.toMatchObject({ status: 503 });
  expect(synchronize).not.toHaveBeenCalled();
  expect(clear).not.toHaveBeenCalled();
});

it('does not evict successful identity caches on a transient session outage', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/auth/refresh') ? Response.json({sessionMode:'legacy'}) : Response.json({}, {status:503})));
  const clear=vi.spyOn(cache,'clearQueryCache');
  const synchronize=vi.spyOn(cache,'synchronizeSessionCache');
  await expect(services.auth.getSession()).rejects.toMatchObject({status:503});
  expect(clear).not.toHaveBeenCalled();
  expect(synchronize).not.toHaveBeenCalled();
});
it('cancels one session observer without cancelling another concurrent observer', async () => {
  let complete!:(response:Response)=>void;
  const fetcher=vi.fn(async (url:string)=>url.endsWith('/auth/refresh') ? Response.json({sessionMode:'legacy'}) : new Promise<Response>(resolve=>{complete=resolve;}));
  vi.stubGlobal('fetch',fetcher);
  const controller=new AbortController();
  const first=services.auth.getSession(controller.signal);
  const second=services.auth.getSession();
  const cancelled=expect(first).rejects.toMatchObject({kind:'abort'});
  controller.abort();await cancelled;
  while(!complete) await Promise.resolve();
  complete(Response.json({user:{id:'fixture'},role:'team'}));
  await expect(second).resolves.toMatchObject({user:{id:'fixture'}});
  expect(fetcher.mock.calls.filter(([url])=>url.endsWith('/me/session'))).toHaveLength(1);
});
