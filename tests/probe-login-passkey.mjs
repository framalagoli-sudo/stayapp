// Percorso completo dalla pagina, come lo vive un utente: accedo con password,
// registro una passkey da /admin/security, esco e rientro con la sola passkey.
// Serve a sapere se dopo il logout si entra davvero, o se il gate rimbalza
// l'utente sulla verifica del codice. Utente e azienda effimeri, sempre rimossi.
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

let userId = null, aziendaId = null, browser = null
try {
  const email = `probe-ui-${Date.now()}@playwright.internal`
  const password = randomBytes(18).toString('base64url') + 'aA1!'
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `TEST-UI-${Date.now()}`, require_2fa: true }).select().single()
  aziendaId = az.id
  const { data: c } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = c.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'admin_azienda', full_name: 'Probe UI', azienda_id: aziendaId }, { onConflict: 'id' })

  browser = await chromium.launch()
  const page = await browser.newPage()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  })

  // 1. accesso con email e password
  await page.goto(TEST_URL + '/admin/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /accedi/i }).click()
  await page.waitForTimeout(6000)
  console.log('[1] dopo email+password             → sono su', new URL(page.url()).pathname)

  // 2. registrazione della passkey dalla pagina Sicurezza
  if (!page.url().includes('/admin/security')) await page.goto(TEST_URL + '/admin/security', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const bottone = page.getByRole('button', { name: /aggiungi una passkey|aggiungi un altro dispositivo/i })
  console.log('[2] pulsante per la passkey         →', await bottone.count() ? 'presente' : 'ASSENTE')
  await bottone.first().click()
  await page.waitForTimeout(5000)
  const testo = await page.locator('body').innerText()
  console.log('[3] dopo la registrazione           →', /passkey registrata/i.test(testo) ? 'confermata a schermo' : 'nessuna conferma')
  console.log('[4] compare nell’elenco?            →', await page.getByRole('button', { name: /elimina/i }).count() ? 'si' : 'NO')

  // 3. esco
  await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('auth-token')).forEach(k => localStorage.removeItem(k)))
  await page.goto(TEST_URL + '/admin/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  console.log('\n[5] dopo il logout, sono su         →', new URL(page.url()).pathname)

  // 4. rientro con la sola passkey
  const bottonePasskey = page.getByRole('button', { name: /impronta o volto/i })
  console.log('[6] pulsante "Entra con impronta"   →', await bottonePasskey.count() ? 'presente' : 'ASSENTE')
  await bottonePasskey.first().click()
  await page.waitForTimeout(8000)
  const finale = new URL(page.url()).pathname
  console.log('[7] dove sono finito                →', finale)
  console.log('[8] esito                           →',
    finale === '/admin' ? 'DENTRO, senza codice'
    : finale.includes('mfa-verify') ? 'RIMBALZATO sulla verifica del codice'
    : finale.includes('security') ? 'RIMBALZATO su Sicurezza'
    : 'fermo su ' + finale)
  const corpo = await page.locator('body').innerText()
  console.log('[9] la pagina mostra                →', corpo.slice(0, 90).replace(/\s+/g, ' '))
} catch (e) { console.error('ERRORE:', e.message) }
finally {
  if (browser) await browser.close().catch(() => {})
  if (userId) { const { error } = await admin.auth.admin.deleteUser(userId); if (error) console.error('cleanup utente:', error.message) }
  if (aziendaId) { const { error } = await admin.from('aziende').delete().eq('id', aziendaId); if (error) console.error('cleanup azienda:', error.message) }
  console.log('\n[probe] utente e azienda effimeri eliminati')
}
