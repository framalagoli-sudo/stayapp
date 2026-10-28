// Sonda: il testo principale della newsletter è formattabile.
//
// Come il titolare, nel pannello: una bozza scritta prima (testo semplice con
// gli a-capo) si apre senza perdere le righe, si mette una parola in grassetto,
// l'anteprima (che è l'email vera) la mostra, si salva come documento, si
// ritrova riaprendo. Una newsletter già inviata si legge e non si scrive.
// La prova email va solo a `delivered@resend.dev`, il pozzo di Resend.
//
//   node probe-newsletter-testo.mjs [cartella-foto]

import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv[2] || null
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
let aziendaId = null, utenteId = null, browser = null

try {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-TESTO-NL-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziendaId = az.id
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale testo', slug: `zz-nlt-${t}`, active: true }).select().single(), 'entità')
  const email = `zz-nlt-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenteId = u.user.id
  await a.from('profiles').upsert({ id: utenteId, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const sessione = s.session

  const base = { azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, template_id: 'semplice' }
  const vecchia = await deve(a.from('newsletters').insert({ ...base, subject: 'ZZ bozza di prima', status: 'draft',
    content: { heading: 'Titolo', text: 'Prima riga\nSeconda riga\n\nSecondo paragrafo' } }).select().single(), 'bozza')
  const inviata = await deve(a.from('newsletters').insert({ ...base, subject: 'ZZ già inviata', status: 'sent', sent_at: new Date().toISOString(),
    content: { heading: 'Titolo', text: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Già partita' }] }] } } }).select().single(), 'inviata')

  browser = await chromium.launch()
  const contesto = larghezza => browser.newContext({ locale: 'it-IT', viewport: { width: larghezza, height: larghezza > 500 ? 1000 : 844 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sessione) }] }] } })

  console.log('\n1 · UNA BOZZA DI PRIMA, FORMATTATA\n')
  let ctx = await contesto(1360)
  let page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  await page.goto(`${BASE}/admin/newsletter/${vecchia.id}`, { waitUntil: 'networkidle' })
  const campo = page.locator('.tiptap').first()
  await campo.waitFor({ timeout: 60000 })
  const struttura = await campo.evaluate(el => ({ p: el.querySelectorAll('p').length, br: el.querySelectorAll('br:not(.ProseMirror-trailingBreak)').length, testo: el.innerText }))
  ok(struttura.p === 2 && struttura.br === 1 && /Prima riga\s*\nSeconda riga/.test(struttura.testo), `le righe di prima restano: 2 paragrafi e un a-capo (${struttura.p} p, ${struttura.br} br)`)
  ok(await page.getByTitle('Grassetto').isVisible() && await page.getByTitle('Inserisci link').isVisible(), 'sopra il testo c’è la barra: grassetto, link…')

  await campo.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' e ')
  await page.keyboard.press('Control+B')
  await page.keyboard.type('NERO')
  await page.keyboard.press('Control+B')
  await page.getByTitle('Lista puntata').click()
  ok(await campo.locator('strong', { hasText: 'NERO' }).count() === 1, 'una parola in grassetto, scritta col tasto')

  // L'anteprima è l'email vera, dentro un riquadro.
  const anteprima = page.frameLocator('iframe[title="Anteprima dell’email"]')
  let nellEmail = false
  for (let i = 0; i < 20 && !nellEmail; i++) { nellEmail = await anteprima.locator('strong', { hasText: 'NERO' }).count().catch(() => 0) > 0; if (!nellEmail) await page.waitForTimeout(500) }
  ok(nellEmail, 'l’anteprima dell’email mostra il grassetto')
  ok(await anteprima.locator('ul li', { hasText: 'NERO' }).count().catch(() => 0) > 0, 'e l’elenco puntato')
  if (FOTO) await page.screenshot({ path: `${FOTO}/newsletter-testo-1360.png`, fullPage: false })

  await page.getByRole('button', { name: /Salva bozza/ }).click()
  await page.getByText('Salvata').first().waitFor({ timeout: 15000 }).catch(() => {})
  const dopo = (await deve(a.from('newsletters').select('content').eq('id', vecchia.id).single(), 'lettura')).content.text
  const json = JSON.stringify(dopo)
  ok(dopo?.type === 'doc' && /"bold"/.test(json) && /NERO/.test(json) && /Seconda riga/.test(json), 'salvato come documento, col grassetto e con tutto il testo di prima')
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.tiptap strong', { hasText: 'NERO' }).waitFor({ timeout: 30000 }).catch(() => {})
  ok(await page.locator('.tiptap strong', { hasText: 'NERO' }).count() === 1, 'riaprendo lo ritrovo')
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)

  // La prova arriva al fornitore con il documento: si controlla che la route lo accetti.
  const prova = await fetch(`${BASE}/api/newsletter/${vecchia.id}/test`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${sessione.access_token}` }, body: JSON.stringify({ test_email: 'delivered@resend.dev' }) })
  ok(prova.status === 200, `la prova email con il testo formattato parte (${prova.status})`)
  await ctx.close()

  console.log('\n2 · GIÀ INVIATA: SI LEGGE, NON SI SCRIVE\n')
  ctx = await contesto(1360)
  page = await ctx.newPage()
  await page.goto(`${BASE}/admin/newsletter/${inviata.id}`, { waitUntil: 'networkidle' })
  await page.locator('.tiptap').first().waitFor({ timeout: 60000 })
  ok(await page.locator('.tiptap').first().getAttribute('contenteditable') === 'false' && !(await page.getByTitle('Grassetto').isVisible()), 'il testo non è modificabile e la barra non c’è')
  await ctx.close()

  console.log('\n3 · DA TELEFONO\n')
  ctx = await contesto(390)
  page = await ctx.newPage()
  await page.goto(`${BASE}/admin/newsletter/${vecchia.id}`, { waitUntil: 'networkidle' })
  await page.locator('.tiptap').first().waitFor({ timeout: 60000 })
  const largo = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const barra = await page.getByTitle('Grassetto').boundingBox()
  ok(largo <= 1 && barra && barra.x + barra.width <= 390, `la pagina non esce dallo schermo (${largo}px) e la barra si vede`)
  if (FOTO) await page.locator('.tiptap').first().screenshot({ path: `${FOTO}/newsletter-testo-390.png` })
  await ctx.close()

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL TESTO DELLA NEWSLETTER SI FORMATTA, E ARRIVA COSÌ NELL’EMAIL')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utenteId) { try { await a.auth.admin.deleteUser(utenteId) } catch {} }
  if (aziendaId) { try { await cancellaAziendaDiProva(aziendaId) } catch (e) { console.error('pulizia:', e.message) } }
}
process.exit(problemi ? 1 : 0)
