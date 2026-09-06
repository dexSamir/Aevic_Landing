import { buildConfiguration } from './scripts/build-config.mjs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const configuredDataSource = process.env.VITE_DATA_SOURCE ?? env.VITE_DATA_SOURCE;
  if (command === 'build' && configuredDataSource === 'mock') {
    throw new Error('Unsafe production configuration: VITE_DATA_SOURCE=mock is forbidden.');
  }

  const publicConfig = buildConfiguration(mode);
  return {
    define: { 'import.meta.env.VITE_PUBLIC_SITE_URL': JSON.stringify(publicConfig.canonicalOrigin ?? ''), 'import.meta.env.VITE_PUBLIC_MEDIA_ORIGIN': JSON.stringify(publicConfig.mediaOrigin ?? '') },
    plugins: [react()],
    resolve: command === 'build' ? {
      alias: [{ find: './runtimeAdapter', replacement: resolve(process.cwd(), 'src/services/runtimeAdapter.production.ts') }],
    } : undefined,
    build: {
      manifest: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) return 'router';
            if (id.includes('node_modules/html-to-image')) return 'image-export';
            if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
            return undefined;
          },
        },
      },
    },
  };
});
