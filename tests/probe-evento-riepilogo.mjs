// Il campo «posti» e il riepilogo prima della cassa.
//
// Nata da due segnalazioni su Garage 22 (03/10/2026):
//   · il campo dei posti non si lasciava svuotare: rimetteva «1» da solo e la
//     cifra scritta dopo gli si accodava — chi voleva 5 posti ne prenotava 15;
//   · chi premeva «Prenota» arrivava alla cassa senza aspettarsela, la chiudeva,
//     e i posti restavano tenuti mezz'ora per nessuno.
//
// Cosa prova, percorrendo la pagina come un ospite:
//   1. la route del riepilogo fa i conti giusti, rifiuta i valori ostili e NON
//      scrive niente (nessun posto preso finché non si conferma);
//   2. nella pagina dell'evento il campo si svuota e si riscrive, il riepilogo
//      compare prima della cassa, «Modifica» torna al modulo con i dati;
//   3. lo stesso nell'app del QR — che prima ignorava il link della cassa.
//
// ⚠️ La prenotazione vera NON parte mai: nel browser la chiamata a `/book` è
// intercettata. Nessuna email, nessuna cassa aperta. Crea un'azienda ZZ con un
// conto Stripe finto (serve solo a far dire «si paga online») e la cancella.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-evento-riepilogo.mjs
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { config } from 'dotenv'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const prenotazioni = id => a.from('event_bookings').select('id', { count: 'exact', head: true }).eq('event_id', id).then(r => r.count || 0)

let aziendaId = null, browser = null
try {
  const tag = Date.now()
  const { data: az, error: e1 } = await a.from('aziende').insert({
    ragione_sociale: `ZZ-RIEPILOGO-${tag}`, require_2fa: false, moduli: { struttura: true }, stripe_account_id: `acct_probe_${tag}`,
  }).select().single()
  if (e1) throw new Error('azienda: ' + e1.message)
  aziendaId = az.id
  const slug = `zz-riepilogo-${tag}`
  const { data: ent, error: e2 } = await a.from('entita').insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale prova', slug, active: true }).select().single()
  if (e2) throw new Error('entità: ' + e2.message)
  const { data: ev, error: e3 } = await a.from('eventi').insert({
    azienda_id: az.id, entity_tipo: 'struttura', entity_id: ent.id, title: 'ZZ Cena di prova', slug: `zz-cena-${tag}`,
    date_start: new Date(Date.now() + 10 * 86400000).toISOString(), price: 10, prezzo_modo: 'cifra', seats_total: 10,
    acconto_percentuale: 30, published: true, active: true, notify_owner_on_booking: false,
  }).select().single()
  if (e3) throw new Error('evento: ' + e3.message)
  const { data: gratis } = await a.from('eventi').insert({
    azienda_id: az.id, entity_tipo: 'struttura', entity_id: ent.id, title: 'ZZ Serata sul posto', slug: `zz-posto-${tag}`,
    date_start: new Date(Date.now() + 11 * 86400000).toISOString(), price: 10, seats_total: 10,
    acconto_percentuale: 0, published: true, active: true, notify_owner_on_booking: false,
  }).select().single()

  const chiedi = (id, corpo) => fetch(`${BASE}/api/guest/eventi/${id}/riepilogo`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
  }).then(async r => ({ stato: r.status, grezzo: await r.text() })).then(r => ({ ...r, j: JSON.parse(r.grezzo) }))

  console.log('\n1. LA ROUTE DEL RIEPILOGO')
  const r3 = await chiedi(ev.id, { seats: 3 })
  ok(r3.stato === 200 && r3.j.posti === 3 && r3.j.totale === 30 && r3.j.da_pagare === 9 && r3.j.saldo === 21 && r3.j.perc === 30 && r3.j.tutto === false,
    `3 posti a 10 € con acconto 30% → totale 30, ora 9, saldo 21 (${r3.grezzo})`)
  // Il corpo grezzo: solo i conti. Una chiave in più è una colonna uscita.
  const attese = ['da_pagare', 'minuti', 'perc', 'posti', 'saldo', 'totale', 'tutto']
  ok(JSON.stringify(Object.keys(r3.j).sort()) === JSON.stringify(attese), `escono solo i conti: ${Object.keys(r3.j).sort().join(', ')}`)
  ok(!r3.grezzo.includes('acct_') && !r3.grezzo.includes(az.id), 'nessun identificativo dell\'azienda o del conto nella risposta')
  const rg = await chiedi(gratis.id, { seats: 2 })
  ok(rg.stato === 200 && rg.j.da_pagare === 0 && !('totale' in rg.j), `senza acconto non c\'è niente da pagare online (${rg.grezzo})`)
  for (const [cosa, seats] of [['posti negativi', -3], ['zero posti', 0], ['un testo', 'abc'], ['un decimale', 1.5], ['un oggetto', { a: 1 }]]) {
    const r = await chiedi(ev.id, { seats })
    ok(r.stato === 400, `${cosa} → rifiutato (HTTP ${r.stato})`)
  }
  const troppi = await chiedi(ev.id, { seats: 11 })
  ok(troppi.stato === 400 && troppi.j.posti_liberi === 10, `più posti di quanti ce ne sono → «${troppi.j.error}»`)
  const ostile = await chiedi(ev.id, { seats: 2, package_id: { '$ne': null }, da_pagare: 0.01, price: 0 })
  ok(ostile.stato === 200 && ostile.j.da_pagare === 6, `cifre e pacchetti mandati dal client non contano (ora ${ostile.j.da_pagare})`)
  const finto = await chiedi('00000000-0000-0000-0000-000000000000', { seats: 1 })
  ok(finto.stato === 404, `evento inesistente → HTTP ${finto.stato}`)
  const { data: dopo } = await a.from('eventi').select('seats_booked').eq('id', ev.id).single()
  ok(await prenotazioni(ev.id) === 0 && !(dopo.seats_booked > 0), 'chiedere il riepilogo non prende nessun posto')

  console.log('\n   …e la prenotazione vera rifiuta gli stessi valori')
  const neg = await fetch(`${BASE}/api/guest/eventi/${ev.id}/book`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ guest_name: 'Prova', guest_email: `zz-neg-${tag}@playwright.internal`, seats: -3, privacy_accettata: true }) })
  ok(neg.status === 400 && await prenotazioni(ev.id) === 0, `posti negativi → HTTP ${neg.status}, nessuna riga scritta`)

  browser = await chromium.launch()
  const apri = async (indirizzo) => {
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const errori = []
    page.on('pageerror', e => errori.push(e.message))
    let mandato = null
    // ⚠️ La prenotazione non parte: si risponde al posto del server.
    await page.route('**/api/guest/eventi/*/book', route => {
      mandato = JSON.parse(route.request().postData() || '{}')
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'probe', pagamento: { url: `${BASE}/checkout/annullato` } }) })
    })
    await page.goto(indirizzo, { waitUntil: 'networkidle' })
    return { page, ctx, errori, corpo: () => mandato }
  }
  const percorso = async ({ page, errori, corpo }, nome) => {
    const campo = page.locator('#posti-evento')
    await campo.waitFor({ timeout: 15000 })
    ok(await campo.inputValue() === '1', `${nome}: il campo parte da 1`)
    // Come fa una persona: tocca in fondo al campo, cancella, scrive.
    await campo.click(); await page.keyboard.press('End'); await page.keyboard.press('Backspace')
    ok(await campo.inputValue() === '', `${nome}: cancellando, il campo resta vuoto (era il difetto: tornava «1»)`)
    await page.keyboard.type('5')
    ok(await campo.inputValue() === '5', `${nome}: scrivendo 5 si legge «${await campo.inputValue()}» e non 15`)
    await page.keyboard.type('x-,e')
    ok(await campo.inputValue() === '5', `${nome}: lettere e segni non entrano`)

    await page.locator('input[type="email"]').fill(`zz-rie-${Date.now()}@playwright.internal`)
    await page.locator('input[type="email"]').locator('xpath=preceding-sibling::input[1]').fill('ZZ Prova Riepilogo')
    await page.locator('input[type="checkbox"]').check()
    const prenota = page.getByRole('button', { name: /^Prenota/ })

    // Campo vuoto: non si parte, e lo si dice.
    await campo.fill('')
    await prenota.click()
    ok(await page.getByText(/Indica per quante persone/).isVisible(), `${nome}: col campo vuoto non parte e dice perché`)
    await campo.fill('5')

    await prenota.click()
    await page.getByText('Controlla prima di confermare').waitFor({ timeout: 10000 })
    const testo = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    ok(/Stai prenotando 5 posti per «ZZ Cena di prova»/.test(testo), `${nome}: il riepilogo dice quanti posti e per quale evento`)
    ok(/Totale 50,00\s?€/.test(testo) && /Paghi adesso \(acconto 30%\) 15,00\s?€/.test(testo) && /Da saldare sul posto 35,00\s?€/.test(testo),
      `${nome}: totale 50 €, adesso 15 €, sul posto 35 €`)
    ok(/La prenotazione è valida solo dopo il pagamento dell’acconto./.test(testo), `${nome}: dice che si è prenotati solo dopo aver pagato`)
    ok(corpo() === null && await prenotazioni(ev.id) === 0, `${nome}: a riepilogo aperto nessun posto è stato preso`)
    // FOTO=<cartella> salva il riepilogo com'è a schermo, per guardarlo.
    if (process.env.FOTO) await page.getByText('Controlla prima di confermare').locator('xpath=../..').screenshot({ path: `${process.env.FOTO}/riepilogo-${nome}.png` })

    await page.getByRole('button', { name: 'Modifica' }).click()
    ok(await page.locator('#posti-evento').inputValue() === '5' && await page.locator('input[type="email"]').inputValue() !== '',
      `${nome}: «Modifica» torna al modulo con i dati già scritti`)
    await page.locator('#posti-evento').fill('2')
    await prenota.click()
    await page.getByText(/Stai prenotando/).waitFor({ timeout: 10000 })
    ok(/2 posti/.test(await page.locator('body').innerText()), `${nome}: cambiando i posti il riepilogo si rifà`)

    await page.getByRole('button', { name: 'Conferma e vai al pagamento' }).click()
    await page.waitForURL('**/checkout/annullato', { timeout: 15000 }).catch(() => {})
    ok(page.url().includes('/checkout/annullato'), `${nome}: confermando si va alla cassa (${page.url().replace(BASE, '')})`)
    ok(corpo()?.seats === 2 && corpo()?.privacy_accettata === true, `${nome}: alla prenotazione arrivano 2 posti, come numero (${JSON.stringify(corpo()?.seats)})`)
    ok(errori.length === 0, `${nome}: nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  }

  console.log('\n2. LA PAGINA DELL\'EVENTO')
  const sito = await apri(`${BASE}/eventi/${ev.id}`)
  await percorso(sito, 'pagina')
  await sito.ctx.close()

  console.log('\n   …e su /en il modulo e il riepilogo sono in inglese')
  const en = await apri(`${BASE}/en/eventi/${ev.id}`)
  await en.page.locator('#posti-evento').waitFor({ timeout: 20000 })
  const modulo = (await en.page.locator('body').innerText()).replace(/\s+/g, ' ')
  ok(/Your details/.test(modulo) && /Seats:/.test(modulo) && /I have read and accept the privacy policy/.test(modulo) && !/I tuoi dati|Posti:/.test(modulo),
    'il modulo è in inglese, senza pezzi in italiano')
  await en.page.locator('input[type="email"]').fill(`zz-en-${tag}@playwright.internal`)
  await en.page.locator('input[type="email"]').locator('xpath=preceding-sibling::input[1]').fill('ZZ Prova')
  await en.page.locator('input[type="checkbox"]').check()
  await en.page.getByRole('button', { name: /^Book/ }).click()
  await en.page.getByText('Check before you confirm').waitFor({ timeout: 10000 })
  const riepEn = (await en.page.locator('body').innerText()).replace(/\s+/g, ' ')
  ok(/You are booking 1 seat for/.test(riepEn) && /Your booking is valid only once the deposit has been paid\./.test(riepEn) && /€3\.00/.test(riepEn),
    'il riepilogo è in inglese e dice che vale solo a deposito pagato')
  ok(en.errori.length === 0, `nessun errore nel browser${en.errori.length ? ' — ' + en.errori[0] : ''}`)
  await en.ctx.close()

  console.log('\n   …un evento che si paga sul posto non mostra nessun riepilogo')
  const posto = await apri(`${BASE}/eventi/${gratis.id}`)
  await posto.page.locator('input[type="email"]').fill(`zz-posto-${tag}@playwright.internal`)
  await posto.page.locator('input[type="email"]').locator('xpath=preceding-sibling::input[1]').fill('ZZ Prova')
  await posto.page.locator('input[type="checkbox"]').check()
  await posto.page.getByRole('button', { name: /^Prenota/ }).click()
  await posto.page.waitForURL('**/checkout/annullato', { timeout: 15000 }).catch(() => {})
  ok(posto.corpo()?.seats === 1, 'la prenotazione parte direttamente, com\'era')
  await posto.ctx.close()

  console.log('\n3. L\'APP DEL QR')
  const app = await apri(`${BASE}/s/${slug}?qr=1`)
  await app.page.getByText('ZZ Cena di prova').first().waitFor({ timeout: 8000 }).catch(async () => {
    await app.page.getByText(/^Eventi$/).first().click()
  })
  await app.page.getByText('ZZ Cena di prova').first().click()
  await percorso(app, 'app')
  await app.ctx.close()
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (browser) await browser.close()
  if (aziendaId) await cancellaAziendaDiProva(aziendaId)
  console.log('\n[probe] dati di prova cancellati')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nIL CAMPO SI RISCRIVE, E PRIMA DELLA CASSA SI LEGGE COSA SI STA PER FARE')
  process.exit(problemi ? 1 : 0)
}
