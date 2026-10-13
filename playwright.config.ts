import { defineConfig, devices } from '@playwright/test';
import { resolvePortalUrls } from './utils/env-urls';

const urls = resolvePortalUrls();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: urls.SSC,
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1920, height: 1080 },
  },
  projects: [
    {
      name: 'ssc',
      testMatch: '**/tests/solicitation_management/ssc/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: urls.SSC,
        launchOptions: { args: ['--no-sandbox'] },
      },
    },
    {
      name: 'merx',
      testMatch: '**/tests/solicitation_management/merx/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: urls.MERX,
        launchOptions: { args: ['--no-sandbox'] },
      },
    },
  ],
  timeout: 90_000,
  outputDir: 'test-results',
});
