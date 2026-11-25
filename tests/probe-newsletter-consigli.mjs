// «Come arriva nella casella»: i consigli nell'editor della newsletter.
//
// Cosa prova, col browser, come il titolare:
//   1. una bozza «da volantino» (oggetto maiuscolo con !!! e parole da
//      pubblicità, tante foto e poche parole) mostra i consigli giusti;
//   2. correggendo l'oggetto mentre si scrive, i consigli spariscono da soli;
//   3. «Perché le newsletter finiscono in «Promozioni»» si apre e spiega;
//   4. su telefono la sezione non sfora di lato;
//   5. un oggetto con del codice resta testo nei consigli.
//
// Nessuna email parte. Azienda ZZ, si pulisce da sola.
// Uso: cd tests && node probe-newsletter-consigli.mjs [cartella-foto]
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const foto = process.argv[2]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
let az = null, utente = null, browser = null
try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-CONSIGLI-NL-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale Consigli', slug: `zz-cons-${t}`, active: true }).select().single(), 'entità')
  const nl = await deve(a.from('newsletters').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, status: 'draft', template_id: 'notizie',
    subject: 'OFFERTA IMPERDIBILE!!!', preheader: '', content: { heading: 'Novità', intro: '', blocks: [
      { id: 'a', title: 'Uno', text: '', image_url: 'https://example.com/a.jpg' },
      { id: 'b', title: 'Due', text: '', image_url: 'https://example.com/b.jpg' },
    ] } }).select().single(), 'newsletter')
  const email = `zz-cons-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const stato = { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] }

  browser = await chromium.launch()
  console.log('\n1 · UNA BOZZA DA VOLANTINO\n')
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1360, height: 900 }, storageState: stato })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  await page.goto(`${BASE}/admin/newsletter/${nl.id}`, { waitUntil: 'domcontentloaded' })
  const sezione = page.locator('[data-consigli-newsletter]')
  await sezione.waitFor({ timeout: 60000 })
  await page.getByText('Come arriva nella casella', { exact: true }).waitFor()
  const chiavi = async () => page.locator('[data-consiglio]').evaluateAll(els => els.map(e => e.dataset.consiglio))
  const prima = await chiavi()
  for (const k of ['maiuscolo', 'esclamativi', 'parole', 'preheader', 'immagini']) ok(prima.includes(k), `consiglio «${k}» presente`)
  if (foto) await sezione.screenshot({ path: `${foto}/nl-consigli-volantino.png` })

  console.log('\n2 · CORREGGENDO\n')
  const oggetto = page.getByPlaceholder('Es: Offerta speciale solo per te!')
  await oggetto.fill('Venerdì 12 si suona: restano 8 posti')
  await page.getByPlaceholder("Testo visibile prima di aprire l'email nel client…").fill('Prenoti in un minuto dal sito')
  await page.waitForTimeout(300)
  const dopo = await chiavi()
  ok(!dopo.some(k => ['maiuscolo', 'esclamativi', 'parole', 'preheader'].includes(k)), `i consigli sull’oggetto spariscono mentre si scrive (restano: ${dopo.join(', ') || 'nessuno'})`)
  ok(dopo.includes('immagini'), 'resta quello sulle foto, che non è stato corretto')

  console.log('\n3 · IL PERCHÉ\n')
  await page.getByRole('button', { name: 'Perché le newsletter finiscono in «Promozioni»' }).click()
  const testo = await sezione.innerText()
  ok(/non è lo spam/.test(testo) && /Principale/.test(testo) && /Gmail e Yahoo/.test(testo), 'la spiegazione si apre: non è spam, «Principale», il link per disiscriversi resta')

  console.log('\n5 · CASO OSTILE\n')
  await oggetto.fill('<img src=x onerror="window.__xss=1"> GRATIS')
  await page.waitForTimeout(300)
  ok(await page.evaluate(() => !window.__xss && !document.querySelector('[data-consigli-newsletter] img')), 'l’oggetto con del codice resta testo')
  ok(errori.length === 0, `nessun errore nella pagina${errori.length ? ': ' + errori[0] : ''}`)
  if (foto) await sezione.screenshot({ path: `${foto}/nl-consigli-perche.png` })

  console.log('\n4 · SU TELEFONO\n')
  const tel = await browser.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 }, storageState: stato, isMobile: true })
  const p2 = await tel.newPage()
  await p2.goto(`${BASE}/admin/newsletter/${nl.id}`, { waitUntil: 'domcontentloaded' })
  await p2.locator('[data-consigli-newsletter]').waitFor({ timeout: 60000 })
  const fuori = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(fuori <= 0, `la pagina non sfora di lato (${fuori}px)`)
  if (foto) { await p2.locator('[data-consigli-newsletter]').scrollIntoViewIfNeeded(); await p2.screenshot({ path: `${foto}/nl-consigli-telefono.png` }) }
} catch (e) {
  console.log('  ✗ ' + e.message); problemi++
} finally {
  try { await browser?.close() } catch {}
  try { if (utente) await a.auth.admin.deleteUser(utente) } catch {}
  try { if (az) await cancellaAziendaDiProva(az.id) } catch (e) { console.log('  pulizia: ' + e.message) }
}
console.log(problemi ? `\n✗ ${problemi} problemi\n` : '\n✓ tutto a posto\n')
process.exit(problemi ? 1 : 0)
