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

  globalSetup:    './global-setup.js',
  globalTeardown: './global-teardown.js',

  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'smoke',
      testMatch: 'admin.spec.js',
      use: { storageState: '.auth/state.json' },
    },
    {
      // Regression sicurezza: API-level, ruolo staff. Gestisce i propri token,
      // niente storageState (nessun browser/sessione super_admin).
      name: 'security',
      testMatch: 'security.spec.js',
    },
    {
      // Render pubblico siti: verifica via HTTP che i minisiti siano visibili da
      // ogni browser (contenuto nell'HTML server + nessun SW che precachea).
      name: 'public',
      testMatch: 'public-render.spec.js',
    },
    {
      // Flussi pubblici con JS (browser vero, no auth): cattura i crash client-side
      // (useSearchParams mal destrutturato, router.push(-1)) invisibili ai test HTTP.
      name: 'public-flows',
      testMatch: 'public-flows.spec.js',
    },
  ],
})
