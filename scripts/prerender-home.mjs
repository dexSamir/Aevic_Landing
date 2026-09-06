import { build } from 'esbuild';
import { loadEnv } from 'vite';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildConfiguration } from './build-config.mjs';

/** Render the existing Home tree, resolving images from the authoritative client manifest. */
export async function prerenderHome() {
  const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
  const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
  const config = buildConfiguration();
  const publicEnv = { PROD: true, DEV: false, MODE: 'production', VITE_DATA_SOURCE: 'api', VITE_API_BASE_URL: env.VITE_API_BASE_URL || '/api', VITE_PUBLIC_SITE_URL: config.canonicalOrigin || '', VITE_PUBLIC_MEDIA_ORIGIN: config.mediaOrigin || '' };
  for (const name of ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'X', 'LINKEDIN', 'DISCORD', 'TWITCH', 'WEBSITE']) publicEnv[`VITE_AEVIC_${name}_URL`] = env[`VITE_AEVIC_${name}_URL`] || '';
  mkdirSync('node_modules/.cache', { recursive: true });
  const temporary = mkdtempSync(resolve('node_modules/.cache/aevic-home-'));
  try {
    const result = await build({
      entryPoints: ['src/app/prerenderHome.tsx'], bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', write: false,
      define: { 'import.meta.env': JSON.stringify(publicEnv), 'process.env.NODE_ENV': '"production"' },
      plugins: [{ name: 'client-asset-manifest', setup(plugin) {
        plugin.onResolve({ filter: /^\.\/runtimeAdapter$/ }, () => ({ path: resolve('src/services/runtimeAdapter.production.ts') }));
        plugin.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
        plugin.onLoad({ filter: /\.(?:png|jpe?g|webp|avif|svg)$/ }, ({ path }) => {
          const source = relative(process.cwd(), path).replaceAll('\\', '/');
          // Unused imports can be absent from the client graph; reject any that reach rendered HTML below.
          const url = manifest[source] ? '/' + manifest[source].file : '/__unemitted_asset__/' + source;
          return { contents: `export default ${JSON.stringify(url)}`, loader: 'js' };
        });
      } }],
    });
    const file = resolve(temporary, 'render.mjs');
    writeFileSync(file, result.outputFiles[0].text);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error('Build-time Home rendering must never access the network.'); };
    try {
      const { renderHome } = await import(pathToFileURL(file).href);
      const html = renderHome();
      if (!html.includes('home-live-hero') || html.includes('__unemitted_asset__') || html.includes('prerender-shell')) throw new Error('Home prerender is incomplete or references an unbuilt asset.');
      return html;
    } finally { globalThis.fetch = originalFetch; }
  } finally {
    // This exact directory was created above for this build and contains no user inputs.
    rmSync(temporary, { recursive: true, force: true });
  }
}
