/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// --- Build stamp, injected as compile-time constants so the running app can
// report exactly which build is live (build TIME is the reliable discriminator;
// the git SHA is best-effort and is "nogit" when built from a source zip). ---
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string };

function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    const env = process.env.GITHUB_SHA || process.env.VITE_GIT_SHA || '';
    return env ? env.slice(0, 7) : 'nogit';
  }
}

const BUILD_TIME = new Date().toISOString();
const GIT_SHA = gitSha();

// Static-only SPA build. Output in dist/ is deployable directly to a CDN with
// no runtime compute. Monaco workers are bundled as static assets (never a CDN).
export default defineConfig({
  // Served at the root of a per-app subdomain on the CDN.
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __GIT_SHA__: JSON.stringify(GIT_SHA),
  },
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
