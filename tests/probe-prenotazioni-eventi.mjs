// La pagina «Prenotazioni» con gli eventi dentro, aperta come la apre un titolare.
//
// Nata il 04/10/2026 da Francesco, guardando Garage 22: «sarebbe da inserire
// anche eventi in "prenotazioni" nella voce del menu». La pagina mostrava solo
// risorse e offerte, e chi vive di eventi quella voce nel menu non l'aveva
// nemmeno — la sua categoria accende «Eventi» ma non «Prenotazioni».
//
// Cosa prova:
//   1. la route dei totali: solo la propria azienda, niente senza login, e nel
//      corpo grezzo NESSUN nome, email o telefono di chi ha prenotato;
//   2. chi ha solo gli eventi accesi trova «Prenotazioni» nel menu;
//   3. la pagina: «Da guardare», gli eventi in programma con i loro numeri, i
//      passati chiusi, il filtro;
//   4. i numeri della scheda sono gli stessi che si contano aprendo l'evento.
//
// Tutto finto e marchiato ZZ: nessuna email parte (le righe sono scritte nel
// database, nessuna route di prenotazione viene chiamata). Si pulisce da sola.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-prenotazioni-eventi.mjs
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const aziende = [], utenti = []

async function titolare(aziendaId) {
  const email = `zz-pe-${t}-${utenti.length}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  utenti.push(data.user.id)
  // upsert, mai insert: alla creazione un trigger ha già scritto la riga.
  const { error: pErr } = await admin.from('profiles').upsert({ id: data.user.id, role: 'admin_azienda', full_name: 'ZZ Titolare', azienda_id: aziendaId }, { onConflict: 'id' })
  if (pErr) throw new Error(`profilo: ${pErr.message}`)
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s, error: sErr } = await anon.auth.signInWithPassword({ email, password })
  if (sErr) throw new Error(`signIn: ${sErr.message}`)
  return s.session
}

async function azienda(nome, funzioni) {
  const { data, error } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true }, funzioni }).select().single()
  if (error) throw new Error(`azienda: ${error.message}`)
  aziende.push(data.id)
  const { data: ent, error: e2 } = await admin.from('entita').insert({ azienda_id: data.id, tipo: 'ristorante', name: `ZZ Locale ${nome}`, slug: `zz-pe-${nome.toLowerCase()}-${t}`, active: true }).select().single()
  if (e2) throw new Error(`entità: ${e2.message}`)
  return { id: data.id, ent }
}

async function evento(az, titolo, giorni, extra = {}) {
  const { data, error } = await admin.from('eventi').insert({
    azienda_id: az.id, entity_tipo: 'ristorante', entity_id: az.ent.id, title: titolo, slug: `zz-${Math.random().toString(36).slice(2, 10)}-${t}`,
    date_start: new Date(Date.now() + giorni * 86400000).toISOString(), price: 30, prezzo_modo: 'cifra', seats_total: 60,
    published: true, active: true, notify_owner_on_booking: false, ...extra,
  }).select().single()
  if (error) throw new Error(`evento ${titolo}: ${error.message}`)
  return data
}
const prenota = async (ev, righe) => {
  const { error } = await admin.from('event_bookings').insert(righe.map((r, i) => ({
    event_id: ev.id, guest_email: `zz-ospite-${i}-${t}@playwright.internal`, guest_phone: '+390000000000', total_amount: (r.seats || 1) * 30, privacy_accettata: true, ...r })))
  if (error) throw new Error(`prenotazioni ${ev.title}: ${error.message}`)
}

let browser = null
try {
  // Come Garage 22: gli eventi accesi, «Prenotazioni» no.
  const mia = await azienda('SOLOEVENTI', { eventi: true, contatti: true })
  const altra = await azienda('ALTRA', { eventi: true })
  const serata = await evento(mia, 'ZZ Serata pagata', 5, { acconto_percentuale: 100, posti_riservati: 30 })
  await prenota(serata, [
    { guest_name: 'ZZ Uno', seats: 1, status: 'confirmed', pagamento_stato: 'pagato', pagamento_id: `cs_test_a_${t}` },
    { guest_name: 'ZZ Due', seats: 2, status: 'confirmed', pagamento_stato: 'pagato', pagamento_id: `cs_test_b_${t}` },
    { guest_name: 'ZZ Cassa', seats: 4, status: 'pending', pagamento_stato: 'non_pagato' },
    { guest_name: 'ZZ Persa', seats: 12, status: 'cancelled', pagamento_stato: 'non_pagato' },
    { guest_name: 'ZZ Persa2', seats: 2, status: 'cancelled', pagamento_stato: 'non_pagato' },
  ])
  const cena = await evento(mia, 'ZZ Cena sul posto', 12, { acconto_percentuale: 0 })
  await prenota(cena, [
    { guest_name: 'ZZ Tre', seats: 3, status: 'confirmed' },
    { guest_name: 'ZZ Lista', seats: 2, status: 'waitlist', total_amount: 0 },
    { guest_name: 'ZZ Vecchia', seats: 1, status: 'pending' },
  ])
  const vuoto = await evento(mia, 'ZZ Ancora vuoto', 20)
  const ieri = await evento(mia, 'ZZ Serata di ieri', -3)
  await prenota(ieri, [{ guest_name: 'ZZ Ieri', seats: 5, status: 'confirmed' }])
  const estraneo = await evento(altra, 'ZZ Evento altrui', 6)
  await prenota(estraneo, [{ guest_name: 'ZZ Estraneo', seats: 7, status: 'confirmed' }])

  const s = await titolare(mia.id)
  const H = { Authorization: `Bearer ${s.access_token}` }

  console.log('\n1 · LA ROUTE DEI TOTALI\n')
  const nudo = await fetch(`${BASE}/api/eventi/riepilogo`)
  ok(nudo.status === 401, `senza login non risponde (HTTP ${nudo.status})`)
  const r = await fetch(`${BASE}/api/eventi/riepilogo?azienda_id=${altra.id}`, { headers: H })
  const grezzo = await r.text()
  const lista = JSON.parse(grezzo)
  ok(r.status === 200 && lista.length === 4 && !lista.some(e => e.id === estraneo.id), `chiedendo l'azienda di un altro si riceve solo la propria (${lista.length} eventi, nessuno altrui)`)
  ok(!/ZZ Uno|ZZ Estraneo|zz-ospite|playwright\.internal|\+39000/.test(grezzo), 'nel corpo grezzo nessun nome, email o telefono di chi ha prenotato')
  const chiavi = [...new Set(lista.flatMap(e => Object.keys(e)))].sort().join(',')
  ok(chiavi === 'capienza,concluso,date_end,date_start,gruppi,id,incassato,posti,prenotazioni,pubblicato,riservati,titolo,valore', `escono solo titolo, date e conteggi (${chiavi})`)
  const S = lista.find(e => e.id === serata.id), C = lista.find(e => e.id === cena.id)
  ok(S.posti === 7 && S.prenotazioni === 3 && S.incassato === 90 && S.valore === 210, `serata pagata: 7 posti presi, € 90 incassati su € 210 (posti ${S.posti}, incassato ${S.incassato}, valore ${S.valore})`)
  ok(S.gruppi.confermate.posti === 3 && S.gruppi.pagamento.prenotazioni === 1 && S.gruppi.perse.posti === 14, 'e i gruppi: 3 posti confermati, 1 alla cassa, 14 posti persi')
  ok(C.posti === 4 && C.gruppi.attesa.prenotazioni === 1 && C.gruppi.daConfermare.prenotazioni === 1 && C.incassato === 0, 'cena sul posto: la lista d’attesa non occupa posti, la «da confermare» sì')
  ok(lista.find(e => e.id === ieri.id).concluso === true && S.concluso === false, 'sa quali eventi sono passati')

  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1280, height: 1000 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  const testo = async (dove = 'main, body') => (await page.locator(dove).first().innerText()).replace(/\s+/g, ' ')

  console.log('\n2 · CHI HA SOLO GLI EVENTI TROVA «PRENOTAZIONI» NEL MENU\n')
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('aside.admin-sidebar nav a:has-text("Eventi")', { timeout: 40000 })
  const voce = page.locator('aside.admin-sidebar nav a[href="/admin/prenotazioni"]')
  ok(await voce.count() === 1, 'la voce c’è, anche senza risorse e offerte')
  ok(await page.locator('aside.admin-sidebar nav a[href="/admin/eventi"]').count() === 1, 'e «Eventi» è rimasta dov’era')

  console.log('\n3 · LA PAGINA\n')
  await voce.click()
  await page.locator('[data-sezione="eventi"]').waitFor({ timeout: 40000 })
  await page.waitForTimeout(600)
  if (process.env.FOTO) await page.screenshot({ path: `${process.env.FOTO}/prenotazioni-eventi.png`, fullPage: true })
  const guardare = await testo('[data-da-guardare]')
  ok(/1 attende il pagamento — ZZ Serata pagata/.test(guardare) && /1 in lista d’attesa — ZZ Cena sul posto/.test(guardare) && /1 da confermare — ZZ Cena sul posto/.test(guardare),
    '«Da guardare» dice cosa aspetta un gesto, e su quale evento')
  const ordine = await page.locator('[data-sezione="eventi"] [data-evento]').evaluateAll(els => els.map(e => e.getAttribute('data-evento')))
  ok(JSON.stringify(ordine) === JSON.stringify([serata.id, cena.id, vuoto.id]), 'gli eventi in programma sono in ordine di data, dal più vicino')
  const scheda = (await page.locator(`[data-evento="${serata.id}"]`).innerText()).replace(/\s+/g, ' ')
  ok(/3 posti confermati/.test(scheda) && /1 attende il pagamento/.test(scheda) && /2 non andate a buon fine/.test(scheda), `la scheda dice quanti vengono e quanti no («${scheda.slice(0, 90)}…»)`)
  ok(/7 \/ 60 posti presi/.test(scheda) && /53 liberi · 23 vendibili online/.test(scheda) && /€90\.00 incassati online/.test(scheda) && /€120\.00 ancora da incassare/.test(scheda), 'posti presi, liberi, vendibili online e incassato')
  ok(/Nessuna prenotazione ancora/.test(await page.locator(`[data-evento="${vuoto.id}"]`).innerText()), 'un evento senza prenotazioni lo dice')
  const tutto = await testo('body')
  ok(!/ZZ Evento altrui/.test(tutto), 'l’evento di un’altra azienda non compare')
  ok(!/Risorse e offerte/.test(tutto), 'la sezione «Risorse e offerte» non compare a chi non ne ha')
  ok(/Eventi passati \(1\)/.test(tutto) && !/ZZ Serata di ieri/.test(tutto), 'i passati ci sono ma chiusi')
  await page.getByRole('button', { name: /Eventi passati/ }).click()
  await page.getByText('ZZ Serata di ieri').waitFor({ timeout: 5000 })
  ok(true, 'e si aprono con un clic')
  await page.getByPlaceholder(/Cerca/).fill('cena')
  await page.waitForTimeout(400)
  const cercati = await page.locator('[data-evento]').evaluateAll(els => els.map(e => e.getAttribute('data-evento')))
  ok(cercati.length === 1 && cercati[0] === cena.id, 'la ricerca trova l’evento per nome')
  await page.getByPlaceholder(/Cerca/).fill('')

  console.log('\n4 · I NUMERI DELLA SCHEDA SONO QUELLI DELL’EVENTO\n')
  await page.locator(`[data-sezione="eventi"] [data-evento="${serata.id}"]`).click()
  await page.locator('[data-gruppo="confermate"]').waitFor({ timeout: 40000 })
  ok(page.url().endsWith(`/admin/eventi/${serata.id}/prenotazioni`), 'cliccando la scheda si apre l’elenco di quell’evento')
  const dentro = await testo('body')
  ok(/Confermate · 2 prenotazioni · 3 posti · €90/.test(dentro), 'confermate: 2 prenotazioni, 3 posti, € 90 — come sulla scheda')
  ok(/Attendono il pagamento · 1 prenotazione · 4 posti/.test(dentro) && /Non andate a buon fine · 2 prenotazioni · 14 posti/.test(dentro), 'e così gli altri gruppi')
  ok(/€90\.00 già incassati online · €120\.00 ancora da incassare/.test(dentro), 'incassato e da incassare coincidono')
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  await ctx.close()

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'GLI EVENTI STANNO IN «PRENOTAZIONI», E I CONTI TORNANO')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) await admin.auth.admin.deleteUser(id).catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
