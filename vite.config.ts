import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * vite.config — vendor chunks for cache longevity.
 *
 * Only libraries the first paint genuinely needs get a named chunk (react,
 * router, lucide, firebase). Everything else is left to Rollup, which keeps
 * a dependency beside the code that imports it — so a library reached only
 * through a dynamic import (firebase/analytics after consent, animejs in the
 * hero's lazy chunk, leaflet, xlsx) stays out of the startup download. The
 * old catch-all `vendor` chunk was modulepreloaded on every page and pulled
 * all of those back in, defeating every lazy import in the app.
 *
 * motion is deliberately NOT given a chunk of its own. A separate motion
 * chunk caused a circular dependency (motion → vendor → motion) that
 * triggered a Temporal Dead Zone ReferenceError at runtime and crashed the
 * app on load. Left unassigned it travels with its importers instead.
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
      // Hashed output gets a directory of its own so vercel.json can mark
      // exactly these files immutable. public/assets holds hand-named files
      // (campaign art, product photos) that change in place under the same
      // URL; a year-long immutable cache there kept serving the old picture.
      assetsDir: 'static',
      cssCodeSplit: true,
      sourcemap: false,
      target: 'es2020',
      reportCompressedSize: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            /* Leaflet is only ever imported dynamically, by the checkout's
               postcode map. Rolling it into `vendor` — which every page
               modulepreloads — would have made every visitor download a
               map library to look at a phone, which is the opposite of what
               the dynamic import was for. Returning undefined leaves it in
               the lazy chunk its importer created. */
            if (id.includes('leaflet')) return undefined;
            // SheetJS is only reached after a staff member explicitly exports
            // a report. Do not put an Excel engine in every shopper's startup
            // bundle merely because the report module is dynamically imported.
            if (id.includes('/xlsx/')) return 'xlsx';
            if (id.includes('react-router'))  return 'router';
            if (id.includes('lucide-react'))  return 'lucide';
            if (
              id.includes('react/') ||
              id.includes('react-dom') ||
              id.includes('scheduler')
            ) return 'react';
            // Analytics (and the installations service it alone uses) is
            // imported dynamically, after cookie consent. Naming it here would
            // put it straight back on the critical path.
            if (/\/(@firebase\/|firebase\/)(analytics|installations)\//.test(id)) return undefined;
            // The SDK pieces src/lib/firebase.ts initialises at startup, plus
            // the small packages they bring with them. A chunk of their own
            // survives app deploys in the browser cache.
            if (/\/(@firebase|firebase|idb|tslib|re2js)\//.test(id)) return 'firebase';
            return undefined;
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
