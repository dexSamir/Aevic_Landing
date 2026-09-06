import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { loadEnv } from 'vite';

export async function loadRouteManifest() {
  const source = readFileSync(resolve('src/app/routeManifest.ts'), 'utf8');
  const output = transpileModule(source, { compilerOptions: { module: ModuleKind.ES2022, target: ScriptTarget.ES2020 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
}
export function buildConfiguration(mode = 'production') {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const canonicalValue = env.PUBLIC_SITE_URL || env.VITE_PUBLIC_SITE_URL;
  const origin = (value, label) => {
    if (!value) return undefined;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new Error(label + ' must be an HTTPS origin without credentials, port, path, query or fragment.');
    return url.origin;
  };
  const canonicalOrigin = origin(canonicalValue, 'PUBLIC_SITE_URL');
  if (env.PUBLIC_SITE_URL && env.VITE_PUBLIC_SITE_URL && origin(env.VITE_PUBLIC_SITE_URL, 'VITE_PUBLIC_SITE_URL') !== canonicalOrigin) throw new Error('Public canonical origins disagree.');
  if ((env.CONTEXT === 'production' || env.REQUIRE_PUBLIC_SITE_URL === 'true') && !canonicalOrigin) throw new Error('PUBLIC_SITE_URL is required for a production deployment.');
  const mediaOrigin = origin(env.VITE_PUBLIC_MEDIA_ORIGIN || env.VITE_SUPABASE_URL, 'Public media origin');
  return { canonicalOrigin, mediaOrigin };
}
export { contentSecurityPolicy } from './security-policy.mjs';
