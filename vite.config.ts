import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * vite.config — one chunk per "thing" so the main bundle stays small
 * and downstream caches stay warm across deploys. The 947 kB monolith
 * we shipped before put framer-motion + lucide-react + react-router
 * + every screen into a single file; users paid the full cost on
 * first load and any change to any screen invalidated the lot.
 *
 * manualChunks splits the heavy vendor libs out by "domain":
 *   - react       core react + scheduler
 *   - router      react-router (rarely changes, perfect long-cache)
 *   - motion      framer-motion (~85 kB; frequently swapped per page)
 *   - lucide      lucide-react icon set (tree-shaken but still big)
 *   - vendor      everything else from node_modules
 *
 * App code stays in lazy() route chunks already wired in App.tsx.
 */

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
            if (id.includes('react-router'))      return 'router';
            if (id.includes('motion/'))           return 'motion';
            if (id.includes('framer-motion'))     return 'motion';
            if (id.includes('lucide-react'))      return 'lucide';
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
    },
  };
});
