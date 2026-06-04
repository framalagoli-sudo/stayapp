import { defineConfig } from '@playwright/test'
import { config } from 'dotenv'
config({ path: '.env.test' })

const BASE_URL = process.env.TEST_URL || 'https://www.oltrenova.com'

export default defineConfig({
  testDir: './smoke',
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    storageState: '.auth/state.json',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: 'auth.setup.js',
      use: { storageState: undefined },
    },
    {
      name: 'smoke',
      testMatch: 'admin.spec.js',
      dependencies: ['setup'],
    },
  ],
})
