// Il calendario dei prezzi, percorso col browser come lo percorrono le persone.
//
// `probe-calendario-prezzi.mjs` prova il conto e le route. Qui si apre il
// pannello **da titolare** (chi lo userà davvero), si mette il weekend a 150 €
// col sabato senza riconsegna, si prova un noleggio, e poi un visitatore
// prenota dal widget: il prezzo nel giorno, il sabato non cliccabile come fine,
// il dettaglio dei giorni. Su computer e su telefono.
//
// Uso: node probe-calendario-prezzi-browser.mjs [cartella-foto]
//      ($env:TEST_URL='http://localhost:3000' per il locale)

import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { mkdirSync } from 'fs'
import { admin, cancellaAziendaDiProva } from './probe-auth.mjs'

const { SUPABASE_URL, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const FOTO = process.argv[2] || null
if (FOTO) mkdirSync(FOTO, { recursive: true })
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

const piu = (g, n) => { const d = new Date(`${g}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const dow = g => new Date(`${g}T12:00:00Z`).getUTCDay()
let VEN = piu(new Date().toISOString().slice(0, 10), 40)
while (dow(VEN) !== 5) VEN = piu(VEN, 1)
const SAB = piu(VEN, 1), DOM = piu(VEN, 2), LUN = piu(VEN, 3)
const breve = g => `${Number(g.slice(8))}/${Number(g.slice(5, 7))}`
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

let az = null, uid = null, browser = null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-CalB-${Date.now()}`, require_2fa: false }).select().single(); az = a.id
  const slug = `zz-calb-${Date.now()}`
  const { data: e } = await admin.from('entita').insert({ azienda_id: az, tipo: 'ristorante', slug, name: 'ZZ Noleggi', active: true, moduli: { booking: true } }).select().single()
  await admin.from('risorse').insert({ azienda_id: az, entity_tipo: 'ristorante', entity_id: e.id,
    nome: 'ZZ Furgone', modalita: 'giornaliero', quantita: 1, prezzo: 100, attiva: true, conferma_auto: true,
    visibile_minisito: true, disponibilita: { conta_giorno_uscita: true, minimo_notti: 1 }, blocchi: [] })
  const email = `probe-calb-${Date.now()}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); uid = us.user.id
  await admin.from('profiles').upsert({ id: uid, role: 'admin_azienda', azienda_id: az, full_name: 'Titolare di prova' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0]

  browser = await chromium.launch()
  const errori = []
  const nuovaPagina = async (larghezza, conSessione) => {
    const ctx = await browser.newContext({
      viewport: { width: larghezza, height: 900 },
      storageState: conSessione ? { cookies: [], origins: [{ origin: new URL(TEST_URL).origin, localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(s.session) }] }] } : undefined,
    })
    const p = await ctx.newPage()
    p.on('pageerror', x => errori.push(`ECCEZIONE (${larghezza}px): ${x.message}`))
    p.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|404|Failed to load resource/i.test(m.text())) errori.push(m.text().slice(0, 160)) })
    return p
  }
  const vaiAlMese = async (p, g) => {
    const titolo = `${MESI[Number(g.slice(5, 7)) - 1]} ${g.slice(0, 4)}`
    for (let i = 0; i < 4 && !(await p.getByText(titolo, { exact: true }).count()); i++) {
      await p.getByLabel('Mese successivo').first().click(); await p.waitForTimeout(1200)
    }
    return p.getByText(titolo, { exact: true }).count()
  }
  const senzaScrollLaterale = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

  // ── Il pannello, da titolare ──
  console.log('\nPANNELLO — PREZZI E REGOLE (titolare, computer)\n')
  const p = await nuovaPagina(1280, true)
  await p.goto(`${TEST_URL}/admin/booking/risorse`, { waitUntil: 'domcontentloaded' })
  await p.getByRole('button', { name: 'Prezzi e regole' }).waitFor({ timeout: 30000 }).catch(() => {})
  ok(await p.getByRole('button', { name: 'Prezzi e regole' }).count() === 1, 'sulla risorsa a giornate c\'è «Prezzi e regole»')
  await p.getByRole('button', { name: 'Prezzi e regole' }).click()
  await p.getByText('Prezzi e regole — ZZ Furgone').waitFor({ timeout: 15000 }).catch(() => {})
  ok(await p.getByText('Prezzi e regole — ZZ Furgone').count() === 1, 'si apre la pagina del calendario')
  ok(await vaiAlMese(p, SAB), 'si arriva al mese giusto con le frecce')

  // Il weekend a 150 su due settimane: dal venerdì a quello dopo, solo Sab e Dom.
  await p.locator(`button[title="${breve(VEN)}"]`).click()
  await p.locator(`button[title="${breve(piu(VEN, 13))}"]`).click().catch(async () => {
    await p.locator('input[type="date"]').nth(1).fill(piu(VEN, 13))
  })
  await p.getByRole('button', { name: 'Sab', exact: true }).click()
  await p.getByRole('button', { name: 'Dom', exact: true }).click()
  await p.getByPlaceholder('lascia vuoto per non cambiarlo').first().fill('150')
  await p.getByRole('button', { name: 'Applica al periodo' }).click()
  await p.getByText(/Fatto: aggiornati 4 giorni/).waitFor({ timeout: 15000 }).catch(() => {})
  ok(await p.getByText(/Fatto: aggiornati 4 giorni/).count() === 1, 'weekend a 150 €: «Fatto: aggiornati 4 giorni»')
  ok(/€150/.test(await p.locator(`button[title="${breve(SAB)}"]`).innerText()), 'nel calendario il sabato mostra €150')

  // Il sabato non si riconsegna: si sceglie un giorno solo e la regola.
  await p.getByRole('button', { name: 'Sab', exact: true }).click()   // via il filtro di prima
  await p.getByRole('button', { name: 'Dom', exact: true }).click()
  await p.locator('input[type="date"]').nth(0).fill(SAB)
  await p.locator('input[type="date"]').nth(1).fill(SAB)
  await p.locator('select').nth(1).selectOption('si')                  // «Niente riconsegna»
  await p.getByRole('button', { name: 'Applica al periodo' }).click()
  await p.getByText(/Fatto: aggiornato 1 giorno/).waitFor({ timeout: 15000 }).catch(() => {})
  ok(/no riconsegna/.test(await p.locator(`button[title="${breve(SAB)}"]`).innerText()), 'il sabato dice «no riconsegna» e tiene il prezzo')
  ok(/€150/.test(await p.locator(`button[title="${breve(SAB)}"]`).innerText()), '…e il prezzo resta €150')

  // Prova un noleggio: lo stesso conto del sito.
  await p.locator('input[type="date"]').nth(2).fill(VEN)
  await p.locator('input[type="date"]').nth(3).fill(LUN)
  await p.getByRole('button', { name: 'Calcola' }).click()
  await p.getByText('€500').first().waitFor({ timeout: 15000 }).catch(() => {})
  ok(await p.getByText('€500').count() > 0, '«Prova un noleggio» ven→lun: €500 (100+150+150+100)')
  ok(await senzaScrollLaterale(p), 'nessuno scorrimento laterale a 1280px')
  if (FOTO) await p.screenshot({ path: `${FOTO}/pannello-computer.png`, fullPage: true })

  console.log('\nPANNELLO — TELEFONO (390px)\n')
  const pt = await nuovaPagina(390, true)
  await pt.goto(`${TEST_URL}/admin/booking/risorse`, { waitUntil: 'domcontentloaded' })
  await pt.getByRole('button', { name: 'Prezzi e regole' }).waitFor({ timeout: 30000 }).catch(() => {})
  await pt.getByRole('button', { name: 'Prezzi e regole' }).click()
  await pt.getByText('Prezzi e regole — ZZ Furgone').waitFor({ timeout: 15000 }).catch(() => {})
  await vaiAlMese(pt, SAB)
  ok(await senzaScrollLaterale(pt), 'a 390px la pagina non scorre di lato')
  const cella = await pt.locator(`button[title="${breve(SAB)}"]`).boundingBox()
  ok(cella && cella.width >= 36, `le caselle del calendario restano toccabili (${Math.round(cella?.width || 0)}px)`)
  if (FOTO) await pt.screenshot({ path: `${FOTO}/pannello-telefono.png`, fullPage: true })

  // ── Il widget, da visitatore ──
  console.log('\nSITO — IL VISITATORE PRENOTA\n')
  const w = await nuovaPagina(420, false)
  await w.goto(`${TEST_URL}/r/${slug}?qr=1&tab=prenota`, { waitUntil: 'networkidle' })
  const cookie = w.getByRole('button', { name: /^Accetto$/ })
  if (await cookie.count()) { await cookie.first().click(); await w.waitForTimeout(600) }
  // Con una risorsa sola il widget salta l'elenco e va dritto alle date. La
  // prima visita in locale compila le route: l'attesa è lunga apposta.
  await w.getByText(/Quando lo ritiri/).first().waitFor({ timeout: 90000 }).catch(() => {})
  ok(await w.getByText(/Quando lo ritiri/).count() > 0, 'chiede «Quando lo ritiri?», non «Quando arrivi?»')
  ok(await vaiAlMese(w, SAB), 'arriva al mese giusto')
  const giorno = d => w.locator(`[data-giorno="${d}"]`)
  ok(/€150/.test(await giorno(SAB).innerText()), 'nel calendario del sito il sabato mostra €150')
  ok(/€100/.test(await giorno(VEN).innerText()), '…e il venerdì il prezzo base €100')
  await giorno(VEN).click(); await w.waitForTimeout(500)
  ok(await w.getByText(/E quando lo riconsegni/).count() > 0, 'dopo il ritiro chiede la riconsegna')
  ok(await giorno(SAB).isDisabled(), 'il sabato non si può scegliere come riconsegna')
  await giorno(LUN).click()
  await w.getByText('€500').first().waitFor({ timeout: 15000 }).catch(() => {})
  const testo = await w.locator('body').innerText()
  ok(/€500/.test(testo), 'il totale è €500')
  ok(/4 giorni/.test(testo), 'dice 4 giorni')
  ok(!/€100 al giorno/.test(testo), 'non scrive «€100 al giorno» sopra un totale fatto di prezzi diversi')
  ok((testo.match(/€150/g) || []).length >= 2, 'mostra il dettaglio dei giorni col loro prezzo')
  ok(await senzaScrollLaterale(w), 'il widget non scorre di lato a 420px')
  if (FOTO) await w.screenshot({ path: `${FOTO}/widget-telefono.png`, fullPage: true })

  console.log('')
  ok(errori.length === 0, errori.length ? `errori nel browser:\n    ${errori.join('\n    ')}` : 'nessun errore nel browser')
} catch (e) {
  ok(false, `errore: ${e.message}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  try { if (az) await cancellaAziendaDiProva(az) } catch (e) { console.log('  pulizia:', e.message) }
  if (uid) await admin.auth.admin.deleteUser(uid)
}

console.log(ko ? `\n✗ ${ko} controlli non passati\n` : '\n✓ tutto a posto\n')
process.exit(ko ? 1 : 0)
