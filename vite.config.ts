import { buildConfiguration } from './scripts/build-config.mjs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { getRequestListener } from '@hono/node-server';
import { createApp } from './server/app';

export default defineConfig(({ command, mode }) => {
  const publicConfig = buildConfiguration(mode, command === 'serve');
  return {
    define: { 'import.meta.env.VITE_PUBLIC_SITE_URL': JSON.stringify(publicConfig.canonicalOrigin ?? ''), 'import.meta.env.VITE_PUBLIC_MEDIA_ORIGIN': JSON.stringify(publicConfig.mediaOrigin ?? '') },
    plugins: [react(), {
      name: 'aevic-hono-development',
      configureServer(server) {
        const listener = getRequestListener(createApp().fetch);
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api' || req.url?.startsWith('/api/')) void listener(req, res);
          else next();
        });
      },
    }],
    server: { port: 8888 },
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
