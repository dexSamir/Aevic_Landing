type ScriptUrlPolicy = { createScriptURL: (value: string) => unknown };
type TrustedTypesWindow = Window & {
  trustedTypes?: { createPolicy: (name: string, rules: { createScriptURL: (value: string) => string }) => ScriptUrlPolicy };
};

let policy: ScriptUrlPolicy | undefined;

/** Only the bundled, same-origin worker is trusted. No HTML/default policy. */
export function serviceWorkerUrl(): string {
  const trustedTypes = (window as TrustedTypesWindow).trustedTypes;
  if (!trustedTypes) return '/sw.js';
  policy ??= trustedTypes.createPolicy('aevic', {
    createScriptURL(value) {
      if (value !== '/sw.js') throw new TypeError('Unsupported service worker URL');
      return new URL(value, window.location.origin).href;
    },
  });
  // This TS DOM version only declares string | URL for register(). The native
  // TrustedScriptURL object must reach the browser unchanged, without String().
  return policy.createScriptURL('/sw.js') as string;
}
