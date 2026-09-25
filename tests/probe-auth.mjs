// Sessione admin effimera per le sonde diagnostiche (probe-*.mjs).
// Stesso pattern di global-setup.js: utente super_admin creato con la service
// role key e SEMPRE eliminato in finally.

import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })

export const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  TEST_URL = 'https://www.oltrenova.com',
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error('Mancano variabili in tests/.env.test')
}

export const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Esegue `fn({ page, browser, admin })` con una sessione super_admin valida.
 * @param {{ width?: number, height?: number }} opts viewport
 */
export async function withProbeSession(fn, opts = {}) {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userId = null
  let browser = null
  try {
    const email = `probe-${Date.now()}@playwright.internal`
    const password = randomBytes(32).toString('base64url') + 'Aa1!'

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (cErr) throw new Error(`createUser: ${cErr.message}`)
    userId = created.user.id

    // regola-ok: legge soltanto un id da assegnare all'utente effimero. Nessuna scrittura sull'entità, nessuna notifica.
    const { data: props } = await admin.from('properties').select('id').limit(1)
    const { error: pErr } = await admin.from('profiles').upsert(
      { id: userId, role: 'super_admin', full_name: 'Probe', property_id: props?.[0]?.id ?? null },
      { onConflict: 'id' },
    )
    if (pErr) throw new Error(`profilo: ${pErr.message}`)

    const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password })
    if (sErr) throw new Error(`signIn: ${sErr.message}`)

    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
    browser = await chromium.launch()
    const context = await browser.newContext({
      viewport: { width: opts.width ?? 1280, height: opts.height ?? 900 },
      storageState: {
        cookies: [],
        origins: [{
          origin: new URL(TEST_URL).origin,
          localStorage: [{
            name: `sb-${projectRef}-auth-token`,
            value: JSON.stringify(signIn.session),
          }],
        }],
      },
    })
    const page = await context.newPage()
    return await fn({ page, browser, admin })
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (userId) {
      await admin.auth.admin.deleteUser(userId).catch(() => {})
      console.log('\n[probe] utente effimero eliminato')
    }
  }
}

/** Attende che la pagina admin abbia finito di caricare i dati via fetch. */
export async function gotoAdmin(page, path) {
  await page.goto(TEST_URL + path, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(700)
}

/**
 * Cancella un'azienda di prova PASSANDO DALLA ROUTE, come il pulsante del pannello.
 *
 * Le entità create dalle route in produzione ricevono un sottodominio registrato
 * su Vercel. Cancellare l'azienda direttamente nel database toglie la riga di
 * `domini` ma lascia l'indirizzo agganciato al progetto, invisibile: il 25/09 ce
 * n'erano 21 così, lasciati da sonde e smoke. La route li stacca.
 * Se la route non risponde si cancella comunque dal database, e lo si dice.
 */
export async function cancellaAziendaDiProva(aziendaId) {
  if (!aziendaId) return
  const email = `zz-pulizia-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  let uid = null
  try {
    const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    uid = u.user.id
    await admin.from('profiles').upsert({ id: uid, role: 'super_admin', full_name: 'Pulizia' }, { onConflict: 'id' })
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: s } = await anon.auth.signInWithPassword({ email, password })
    const r = await fetch(`${TEST_URL}/api/aziende/${aziendaId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${s.session.access_token}` } })
    if (!r.ok) throw new Error(`route ${r.status}`)
  } catch (e) {
    console.log(`  (pulizia dalla route non riuscita: ${e.message} — cancello dal database; controllare gli indirizzi su Vercel)`)
    await admin.from('domini').delete().eq('azienda_id', aziendaId)
    await admin.from('aziende').delete().eq('id', aziendaId)
  } finally {
    if (uid) await admin.auth.admin.deleteUser(uid).catch(() => {})
  }
}
