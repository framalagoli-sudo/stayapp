// Sonda: un menù, una sezione o un piatto NASCOSTI non escono al pubblico.
//
// Crea un ristorante di prova con due menù, e poi fa quello che fa il titolare:
// apre l'editor, preme l'occhio su un menù intero e su una sezione, salva.
// Poi legge il CORPO GREZZO di quello che riceve chi non ha fatto login — la
// route dell'app e l'HTML della pagina — e cerca i nomi nascosti.
// Infine li riaccende, e controlla che tornino.
//
// ⚠️ Non basta che «non si vedano»: non devono ARRIVARE al browser. Prima un
// piatto nascosto viaggiava lo stesso nella risposta e lo toglieva il
// componente che disegna.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-menu-nascosto.mjs [--en]
//   --en  prova anche l'inglese (chiama l'AI a carico dell'azienda di prova)
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const EN = process.argv.includes('--en')
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let az = null, utente = null, browser = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const id = () => crypto.randomUUID()
const piatto = (name, extra = {}) => ({ id: id(), name, description: '', price: '9', allergens: [], dietary: [], photo_url: '', active: true, ...extra })

try {
  const t = Date.now().toString(36)
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-MENU-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const slug = `zz-menu-${t}`
  const menu = [
    { id: id(), name: 'ZZEstate', type: 'catalogo', categories: [{ id: id(), name: 'ZZInsalate', tipo: 'piatto', items: [piatto('ZZCaprese')] }] },
    { id: id(), name: 'ZZCena', type: 'catalogo', categories: [
      { id: id(), name: 'ZZAntipasti', tipo: 'piatto', items: [piatto('ZZBruschetta')] },
      { id: id(), name: 'ZZPrimi', tipo: 'piatto', items: [piatto('ZZCarbonara'), piatto('ZZPiattoSpento', { active: false })] },
    ] },
  ]
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Trattoria', slug, active: true, menu }).select().single(), 'entità')

  // Tutto ciò che riceve chi non ha fatto login, grezzo.
  async function pubblico() {
    const corpi = {}
    for (const [nome, url] of [
      ['route dell’app', `/api/guest/r/${slug}`],
      ['pagina dell’app (HTML)', `/r/${slug}?qr=1`],
      ...(EN ? [['route dell’app in inglese', `/api/guest/r/${slug}?lang=en`]] : []),
    ]) {
      const r = await fetch(BASE + url, { headers: { 'cache-control': 'no-cache' } })
      corpi[nome] = { stato: r.status, testo: await r.text() }
    }
    return corpi
  }
  function controlla(corpi, ci, nonCi, quando) {
    for (const [nome, { stato, testo }] of Object.entries(corpi)) {
      const mancano = ci.filter(x => !testo.includes(x)), escono = nonCi.filter(x => testo.includes(x))
      esito(stato === 200 && !mancano.length && !escono.length, `${quando}: ${nome}`,
        [stato !== 200 && `risponde ${stato}`, mancano.length && `MANCA ${mancano.join(', ')}`, escono.length && `ESCE ${escono.join(', ')}`].filter(Boolean).join(' · '))
    }
  }

  console.log('\nPRIMA — tutto acceso, tranne un piatto\n')
  controlla(await pubblico(), ['ZZEstate', 'ZZCaprese', 'ZZCena', 'ZZAntipasti', 'ZZBruschetta', 'ZZPrimi', 'ZZCarbonara'], ['ZZPiattoSpento'], 'tutto acceso')

  // ── Il titolare apre l'editor e preme l'occhio ────────────────────────────
  const email = `zz-menu-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1280, height: 900 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  page.on('dialog', d => d.accept())

  const occhioMenu = nome => page.locator('div', { has: page.locator(`> h3:has-text("${nome}")`) }).locator('[data-occhio="questo menù"]')
  const occhioSezione = nome => page.locator('div', { has: page.locator(`> span:has-text("${nome}")`) }).locator('[data-occhio="questa sezione"]')
  async function apriEditor() {
    await page.goto(`${BASE}/admin/ristoranti/${ent.id}/menu`, { waitUntil: 'domcontentloaded' })
    await page.getByText('ZZEstate').first().waitFor({ timeout: 60000 })
    // La sezione sta dentro il menù: va aperto per vederla.
    if (!(await page.getByText('ZZAntipasti').first().isVisible().catch(() => false))) {
      await page.locator('div', { has: page.locator('> h3:has-text("ZZCena")') }).locator('button').first().click()
      await page.getByText('ZZAntipasti').first().waitFor({ timeout: 15000 })
    }
  }
  async function salva() {
    const salvato = page.waitForResponse(r => r.request().method() !== 'GET' && /\/api\/(ristoranti|entita)/.test(r.url()), { timeout: 45000 })
    await page.getByRole('button', { name: 'Salva', exact: true }).click()
    const r = await salvato
    return r.status()
  }
  const nelDatabase = async () => (await deve(a.from('entita').select('menu').eq('id', ent.id).single(), 'rilettura')).menu

  console.log('\nIL TITOLARE NASCONDE UN MENÙ E UNA SEZIONE\n')
  await apriEditor()
  esito(await occhioMenu('ZZEstate').count() === 1 && await occhioSezione('ZZAntipasti').count() === 1, 'l’occhio c’è sul menù e sulla sezione')
  await occhioMenu('ZZEstate').click()
  await occhioSezione('ZZAntipasti').click()
  esito(await page.getByText('Nascosto', { exact: true }).count() === 1 && await page.getByText('Nascosta', { exact: true }).count() === 1, 'l’editor li segna come nascosti, e restano lì')
  esito(await salva() === 200, 'il salvataggio riesce')
  let m = await nelDatabase()
  esito(m[0].active === false && m[1].categories[0].active === false && m[1].active !== false && m[1].categories[1].active !== false, 'nel database: spenti quei due e solo quelli')
  esito(m[0].categories[0].items.length === 1 && m[1].categories[0].items.length === 1, 'i piatti dentro ci sono ancora tutti')
  controlla(await pubblico(), ['ZZCena', 'ZZPrimi', 'ZZCarbonara'], ['ZZEstate', 'ZZInsalate', 'ZZCaprese', 'ZZAntipasti', 'ZZBruschetta', 'ZZPiattoSpento'], 'dopo')

  // Cosa vede chi apre l'app: un menù solo, e dentro una sezione sola.
  const ospite = await browser.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 } })
  const app = await ospite.newPage()
  await app.goto(`${BASE}/r/${slug}?qr=1`, { waitUntil: 'domcontentloaded' })
  await app.waitForTimeout(3000)
  const voceMenu = app.getByText(/^Men[uù]$/i).first()
  if (await voceMenu.count()) await voceMenu.click().catch(() => {})
  await app.getByText('ZZCena').first().waitFor({ timeout: 20000 }).catch(() => {})
  const testo = await app.locator('body').innerText()
  esito(testo.includes('ZZCena') && !testo.includes('ZZEstate'), 'nell’app del QR si vede ZZCena e non ZZEstate')
  await ospite.close()

  console.log('\nLI RIACCENDE\n')
  await apriEditor()
  esito(await page.getByText('Nascosto', { exact: true }).count() === 1 && await page.getByText('Nascosta', { exact: true }).count() === 1, 'riaprendo l’editor sono ancora segnati nascosti')
  await occhioMenu('ZZEstate').click()
  await occhioSezione('ZZAntipasti').click()
  esito(await salva() === 200, 'il salvataggio riesce')
  m = await nelDatabase()
  esito(m[0].active === true && m[1].categories[0].active === true, 'nel database: riaccesi')
  controlla(await pubblico(), ['ZZEstate', 'ZZCaprese', 'ZZCena', 'ZZAntipasti', 'ZZBruschetta', 'ZZCarbonara'], ['ZZPiattoSpento'], 'riaccesi')

  esito(errori.length === 0, 'nessun errore nel browser', errori.slice(0, 2).join(' | '))
  console.log('\n' + '─'.repeat(64))
  console.log(rossi ? `${rossi} COSE NON TORNANO` : 'CIÒ CHE SI NASCONDE NON ESCE, E CIÒ CHE SI RIACCENDE TORNA')
} catch (e) {
  console.error('ERRORE:', e.message.split('\n')[0]); rossi++
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log('[probe] pulito')
  process.exit(rossi ? 1 : 0)
}
