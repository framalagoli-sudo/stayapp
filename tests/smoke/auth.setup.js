import { test as setup, expect } from '@playwright/test'
import { config } from 'dotenv'
config({ path: '.env.test' })

setup('login admin', async ({ page }) => {
  const email    = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Mancano TEST_EMAIL e TEST_PASSWORD in tests/.env.test\n' +
      'Crea il file con:\n  TEST_EMAIL=fra.malagoli@gmail.com\n  TEST_PASSWORD=tuapassword'
    )
  }

  await page.goto('/admin/login')

  // Aspetta il form di login
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 })

  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  // Aspetta redirect al dashboard (no 2FA per ora)
  await page.waitForURL(/\/admin$/, { timeout: 15_000 })
  await expect(page).toHaveURL(/\/admin$/)

  // Salva lo stato di autenticazione per tutti i test successivi
  await page.context().storageState({ path: '.auth/state.json' })
})
