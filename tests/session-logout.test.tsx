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
