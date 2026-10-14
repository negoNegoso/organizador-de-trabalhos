import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    permissions: ['camera'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--use-file-for-fake-video-capture=tests/e2e/fixtures/folha.y4m',
      ],
    },
  },
  webServer: {
    command: 'npm run build && npm exec -- next start -p 3100',
    url: 'http://localhost:3100/login',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
