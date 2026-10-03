import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it('waits for load and browser idle before registering the trusted worker', async () => {
  vi.stubEnv('DEV', false);
  let loaded!: () => void, idle!: () => void;
  const register = vi.fn(async () => ({ addEventListener: vi.fn() }));
  vi.stubGlobal('navigator', { serviceWorker: { register, addEventListener: vi.fn() } });
  vi.stubGlobal('document', { readyState: 'loading' });
  vi.stubGlobal('window', {
    addEventListener: vi.fn((_event, callback) => { loaded = callback; }),
    requestIdleCallback: vi.fn(callback => { idle = callback; }),
  });
  const { registerPwa } = await import('../src/app/registerPwa');
  registerPwa();
  expect(register).not.toHaveBeenCalled();
  loaded();
  expect(register).not.toHaveBeenCalled();
  idle();
  expect(register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' });
});

it('registers after load on browsers without idle callbacks', async () => {
  vi.stubEnv('DEV', false);
  const register = vi.fn(async () => ({ addEventListener: vi.fn() }));
  vi.stubGlobal('navigator', { serviceWorker: { register, addEventListener: vi.fn() } });
  vi.stubGlobal('document', { readyState: 'complete' });
  vi.stubGlobal('window', {});
  const { registerPwa } = await import('../src/app/registerPwa');
  registerPwa();
  expect(register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' });
});
