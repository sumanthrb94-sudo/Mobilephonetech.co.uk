import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * vite.config — vendor chunks for cache longevity.
 *
 * motion/framer-motion is intentionally merged into vendor rather than
 * kept in its own chunk. A separate motion chunk causes a circular
 * dependency (motion → vendor → motion) that triggers a Temporal Dead
 * Zone ReferenceError at runtime and crashes the app on load.
 */

const apiProxy = {
  '/api': {
    target: `http://127.0.0.1:${process.env.E2E_API_PORT || 4174}`,
    changeOrigin: true,
  },
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      cssCodeSplit: true,
      sourcemap: false,
      target: 'es2020',
      reportCompressedSize: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react-router'))  return 'router';
            if (id.includes('lucide-react'))  return 'lucide';
            if (
              id.includes('react/') ||
              id.includes('react-dom') ||
              id.includes('scheduler')
            ) return 'react';
            return 'vendor';
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
      proxy: apiProxy,
    },
    // `vite preview` serves static files only, so the /api routes Vercel runs
    // as functions do not exist under it. E2E starts e2e/api-server.mjs and
    // proxies to it, so the suites exercise the real handlers — which matters
    // now that order pricing happens server-side.
    preview: {
      allowedHosts: true,
      proxy: apiProxy,
    },
  };
});
