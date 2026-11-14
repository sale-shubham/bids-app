import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './lib/env.ts';

// No `webServer`: the app (npm run dev, port 3002) and the API (port 4000) are
// started separately. One worker, in order: specs share the run's members and the
// API caps sessions per member.
export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  // Specs choose their own identity with `test.use({ storageState: storageStatePath(...) })`
  // or by creating contexts; mobile.spec.ts is the only one run at phone size.
  projects: [
    { name: 'chromium', testIgnore: /mobile\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
});
