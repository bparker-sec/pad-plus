import { defineConfig, devices } from '@playwright/test';

// End-to-end smoke coverage. Runs against the dev server; CI builds first and
// can point this at the preview server instead.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 4321 --strictPort',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
