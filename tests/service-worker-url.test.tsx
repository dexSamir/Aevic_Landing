import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it('supports browsers without Trusted Types', async () => {
  vi.stubGlobal('window', { location: { origin: 'https://aevic.example' } });
  const { serviceWorkerUrl } = await import('../src/app/serviceWorkerUrl');
  expect(serviceWorkerUrl()).toBe('/sw.js');
});

it('passes a native trusted value unchanged and rejects every other script URL', async () => {
  let rules!: { createScriptURL(value: string): string };
  const trusted = Object.freeze({ toString: () => 'https://aevic.example/sw.js' });
  const createPolicy = vi.fn((_name, value) => { rules = value; return { createScriptURL: () => trusted }; });
  vi.stubGlobal('window', { location: { origin: 'https://aevic.example' }, trustedTypes: { createPolicy } });
  const { serviceWorkerUrl } = await import('../src/app/serviceWorkerUrl');
  expect(serviceWorkerUrl()).toBe(trusted);
  expect(serviceWorkerUrl()).toBe(trusted);
  expect(createPolicy).toHaveBeenCalledTimes(1);
  expect(createPolicy.mock.calls[0][0]).toBe('aevic');
  expect(Object.keys(rules)).toEqual(['createScriptURL']);
  expect(rules.createScriptURL('/sw.js')).toBe('https://aevic.example/sw.js');
  for (const value of ['https://evil.example/sw.js', '//evil.example/sw.js', '/sw.js?x=1', '/assets/script.js', 'javascript:alert(1)', '/sw.js#x']) {
    expect(() => rules.createScriptURL(value)).toThrow(TypeError);
  }
});
