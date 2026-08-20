/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Static-only SPA build. Output in dist/ is deployable directly to a CDN with
// no runtime compute. Monaco workers are bundled as static assets (never a CDN).
export default defineConfig({
  // Served at the root of a per-app subdomain on the CDN.
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // we register manually, only in top-level windows
      includeAssets: ['favicon.svg', 'icons/app-icon.svg'],
      manifest: {
        name: 'Notepad++ Web',
        short_name: 'Notepad++',
        description:
          'A fast client-side code & text editor that saves to OneDrive. Install it to replace your desktop Notepad++.',
        theme_color: '#2e8b57',
        background_color: '#1e1e1e',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icons/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ttf,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2021',
    chunkSizeWarningLimit: 6000,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
