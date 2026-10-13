// Sonda: aprire «Calendario e risorse» non riporta la pagina in cima.
//
// Il 13/10/2026 Francesco: «quando clicco non fa nulla, non apre nulla, ritorna
// in cima alla pagina». La tendina si apriva, ma il menu veniva ricostruito a
// ogni clic (i suoi pezzi erano componenti definiti dentro `AdminLayout`), la
// pagina si accorciava per un istante e il browser la riportava in cima.
// Si vedeva solo con una barra laterale lunga: da super_admin, con un'azienda
// scelta, su uno schermo da portatile. Per questo le altre sonde non lo vedevano.
//
// Entra come super_admin di prova (dominio @playwright.internal, l'unico
// ammesso dal database), sceglie un'azienda vera — SOLO lettura — e misura dove
// sta la pagina prima e dopo il clic. L'utente viene sempre cancellato.
//
// A mano. Uso: cd tests && node probe-menu-non-salta.mjs
//      $env:TEST_URL='http://localhost:3000' per il locale.
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let utente = null, browser = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }

try {
  const email = `zz-salta-${Date.now().toString(36)}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  utente = (await a.auth.admin.createUser({ email, password, email_confirm: true })).data.user.id
  const { error } = await a.from('profiles').upsert({ id: utente, role: 'super_admin', full_name: 'ZZ', azienda_id: null }, { onConflict: 'id' })
  if (error) throw new Error('profilo: ' + error.message)
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })

  browser = await chromium.launch()
  // Uno schermo da portatile: la barra laterale è più alta dello schermo, e per arrivare alla voce si scorre.
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1366, height: 660 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  const misura = () => page.evaluate(() => {
    const b = [...document.querySelectorAll('.sidebar-collapse-btn')].find(x => x.textContent.includes('Calendario'))
    const sotto = document.querySelector('a[href="/admin/booking"]')
    return { pagina: Math.round(window.scrollY), voce: b ? Math.round(b.getBoundingClientRect().top) : null, calendario: sotto ? Math.round(sotto.getBoundingClientRect().top) : null, aperta: document.querySelector('.collapse-body')?.style.maxHeight !== '0px' }
  })
  const voce = page.locator('.sidebar-collapse-btn', { hasText: 'Calendario e risorse' })
  const prova = async dove => {
    await voce.first().waitFor({ timeout: 90000 }); await page.waitForTimeout(3000)
    await voce.first().scrollIntoViewIfNeeded(); await page.waitForTimeout(400)
    if ((await misura()).aperta) { await voce.first().click(); await page.waitForTimeout(700) }   // si parte da chiusa
    const prima = await misura()
    await voce.first().click(); await page.waitForTimeout(1200)
    const dopo = await misura()
    esito(prima.pagina > 200, `${dove}: per arrivare alla voce si è dovuto scorrere (è il caso in cui saltava)`, JSON.stringify(prima))
    esito(dopo.aperta && Math.abs(dopo.pagina - prima.pagina) <= 2 && Math.abs(dopo.voce - prima.voce) <= 2, `${dove}: il clic apre la tendina e la pagina resta dov’è`, `prima ${JSON.stringify(prima)} · dopo ${JSON.stringify(dopo)}`)
    esito(dopo.calendario !== null && dopo.calendario > 0 && dopo.calendario < 660, `${dove}: «Calendario» compare sotto, dentro lo schermo`, String(dopo.calendario))
  }

  console.log(`\n«CALENDARIO E RISORSE» — ${BASE}\n`)
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  const selettore = page.locator('select.sidebar-selector').first()
  await selettore.waitFor({ timeout: 90000 }); await page.waitForTimeout(2500)
  const opzioni = await selettore.locator('option').allInnerTexts()
  const scelta = opzioni.find(o => /garage/i.test(o)) || opzioni[1]
  await selettore.selectOption({ label: scelta })
  await page.waitForTimeout(6000)
  await prova('da una pagina dell’attività')
  await page.locator('a[href="/admin/contatti"]').first().click(); await page.waitForTimeout(5000)
  await prova('da «Contatti»')
  await page.locator('a[href="/admin/booking"]').first().click()
  await page.waitForFunction(() => location.pathname === '/admin/booking', null, { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(4000)
  esito(page.url().endsWith('/admin/booking') && (await page.locator('main').innerText()).includes('Calendario'), 'e «Calendario» apre il calendario', page.url())
  esito(!errori.length, 'nessun errore nel browser', errori.slice(0, 3).join(' | '))
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message.slice(0, 300)}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) { const r = await a.auth.admin.deleteUser(utente); console.log(`\n[probe] utente di prova cancellato: ${r.error?.message || 'sì'}`) }
  console.log(`[probe] ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
