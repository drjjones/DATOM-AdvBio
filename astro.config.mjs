import { defineConfig } from 'astro/config';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves a project site under /<repository>/. The deploy workflow sets SITE_BASE.
const base = (process.env.SITE_BASE || '/').replace(/\/+$/, '') + '/';
const site = process.env.SITE_URL || undefined;

/**
 * Offline support. vite-plugin-pwa builds its precache list during Astro's client
 * bundle, which finishes before Astro writes the HTML pages, so the service worker is
 * generated a second time in astro:build:done to pick the pages up. Every asset is
 * local; nothing is fetched from a CDN at runtime.
 */
function coursePwa() {
  let api;
  return {
    name: 'course-pwa',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        const plugins = VitePWA({
          strategies: 'generateSW',
          registerType: 'autoUpdate',
          injectRegister: false, // src/scripts/offline.ts registers /sw.js
          includeAssets: ['favicon.svg', 'icon.svg'],
          manifest: {
            name: 'Advanced Biology',
            short_name: 'Adv Bio',
            description: 'Interactive, unit by unit teaching site for Advanced Biology at Maret School.',
            start_url: base,
            scope: base,
            display: 'standalone',
            background_color: '#101823',
            theme_color: '#101823',
            icons: [{ src: `${base}icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest,woff2}'],
            // Multi-page site: never fall back to index.html for unknown URLs, and serve a
            // precached page regardless of its query string (?present, cache-bust params).
            navigateFallback: null,
            ignoreURLParametersMatching: [/.*/],
            maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
          },
          devOptions: { enabled: false },
        });
        api = plugins.find((p) => p && p.name === 'vite-plugin-pwa')?.api;
        updateConfig({ vite: { plugins } });
      },
      'astro:build:done': async () => {
        if (api && !api.disabled) await api.generateSW();
      },
    },
  };
}

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  integrations: [coursePwa()],
  vite: { build: { chunkSizeWarningLimit: 1200 } },
});
