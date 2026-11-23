// Le opzioni di un evento (migration 148) col browser, dal punto da cui ci
// arrivano il titolare e chi prenota:
//   1. editor: «Più proposte con prezzi diversi» trasforma prezzo e posti di
//      adesso nella prima opzione; si scrive la seconda; «Salva modifiche»;
//   2. pagina dell'evento, computer e telefono: − e + per opzione, totale,
//      prenotazione vera (azienda ZZ, email al pozzo di Resend);
//   3. pannello delle prenotazioni: conto per opzione, la riga dice cosa ha
//      preso, «Segna prenotazione» ha le quantità per opzione;
//   4. app del QR della struttura: la stessa scelta.
// Uso: cd tests && node probe-opzioni-browser.mjs [cartella-foto]   ($env:TEST_URL per il locale)
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { chromium, devices } from 'playwright'
import { admin, cancellaAziendaDiProva } from './probe-auth.mjs'

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv[2]
let ko = 0
const ok = (c, t, x) => { console.log(`  ${c ? '✓' : '✗'} ${t}${!c && x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 300) : ''}`); if (!c) ko++ }
const foto = async (p, nome) => { if (FOTO) await p.screenshot({ path: `${FOTO}/${nome}.png`, fullPage: false }) }
const sborda = p => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)

let aziendaId = null, uid = null, browser = null
try {
  const tag = Date.now()
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-OPZ-BROWSER-${tag}`, require_2fa: false, moduli: { struttura: true } }).select().single()
  aziendaId = az.id
  const slugEnt = `zz-opzb-${tag}`
  const { data: ent } = await admin.from('entita').insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale ibrido', slug: slugEnt, active: true, moduli: { eventi: true } }).select().single()
  const { data: ev } = await admin.from('eventi').insert({
    azienda_id: az.id, entity_tipo: 'struttura', entity_id: ent.id, title: 'ZZ Cena & live', slug: `zz-cena-live-${tag}`,
    date_start: new Date(Date.now() + 8 * 86400000).toISOString(), price: 30, seats_total: 20, prezzo_modo: 'cifra', comprende: 'Cena + spettacolo dal vivo',
    published: true, active: true, notify_owner_on_booking: false, send_guest_confirmation: false,
  }).select().single()

  const email = `probe-opzb-${tag}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  uid = us.user.id
  await admin.from('profiles').upsert({ id: uid, role: 'admin_azienda', azienda_id: az.id, full_name: 'P' }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0]
  browser = await chromium.launch()
  const sessione = { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(s.session) }] }] }

  console.log('\n1. L’EDITOR, COME IL TITOLARE')
  const pc = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: sessione })).newPage()
  const errori = []; pc.on('pageerror', e => errori.push(e.message))
  await pc.goto(`${BASE}/admin/eventi/${ev.id}`, { waitUntil: 'networkidle', timeout: 90000 })
  await pc.getByRole('button', { name: 'Più proposte con prezzi diversi' }).click()
  const nomi = pc.getByPlaceholder(/Nome dell’opzione/)
  ok(await nomi.count() === 2, 'compaiono due opzioni')
  ok(await pc.getByPlaceholder(/^Cosa comprende \(es\./).first().inputValue() === 'Cena + spettacolo dal vivo', '«cosa comprende» di prima passa nella prima opzione')
  ok(await pc.locator('[data-comprende-nelle-opzioni]').count() === 1, 'il campo generale lascia il posto alla spiegazione')
  const prezzi = pc.getByPlaceholder('0').locator('xpath=self::input[@type="number"][@step="0.5"]')
  ok(await prezzi.first().inputValue() === '30', 'la prima nasce col prezzo di prima (30)', await prezzi.first().inputValue())
  await nomi.nth(0).fill('Cena & spettacolo')
  await nomi.nth(1).fill('Ingresso + drink')
  await prezzi.nth(1).fill('15')
  const posti = pc.getByPlaceholder('Senza limite')
  ok(await posti.first().inputValue() === '20', 'la prima nasce coi posti di prima (20)')
  await posti.nth(1).fill('10')
  await pc.waitForTimeout(200)
  ok(/Totale:\s*30 posti/.test(await pc.locator('body').innerText()), 'il totale si calcola: 30 posti')
  await foto(pc, 'editor-opzioni')
  await pc.getByRole('button', { name: 'Salva modifiche' }).click()
  await pc.waitForTimeout(2500)
  const { data: e1 } = await admin.from('eventi').select('packages, seats_total, price').eq('id', ev.id).single()
  ok(e1.packages.length === 2 && e1.seats_total === 30 && Number(e1.price) === 15, 'salvato: 2 opzioni, 30 posti, da 15', e1)
  ok(e1.packages[0].description === 'Cena + spettacolo dal vivo', 'e la descrizione della prima opzione è salvata', e1.packages[0])
  ok(!errori.length, 'nessun errore nel browser', errori)
  // L'editor su telefono
  const telEd = await (await browser.newContext({ ...devices['iPhone 13'], storageState: sessione })).newPage()
  await telEd.goto(`${BASE}/admin/eventi/${ev.id}`, { waitUntil: 'networkidle', timeout: 90000 })
  await telEd.getByText('Opzioni e prezzi').first().scrollIntoViewIfNeeded()
  ok(!(await sborda(telEd)), 'editor su telefono: niente esce di lato')
  await foto(telEd, 'editor-opzioni-telefono')

  console.log('\n2. LA PAGINA DELL’EVENTO')
  for (const [nome, ctx] of [['computer', { viewport: { width: 1280, height: 900 } }], ['telefono', devices['iPhone 13']]]) {
    const p = await (await browser.newContext({ ...ctx, locale: 'it-IT' })).newPage()
    const err = []; p.on('pageerror', e => err.push(e.message))
    await p.addInitScript(() => { try { localStorage.setItem('cookie_consent_v2', JSON.stringify({ necessary: true })) } catch {} })
    await p.goto(`${BASE}/eventi/${ev.slug}`, { waitUntil: 'networkidle', timeout: 90000 })
    const html = await p.content()
    ok(/data-scelta-opzioni/.test(html), `${nome}: la scelta per opzione c’è`)
    await p.getByRole('button', { name: 'Uno in più: Cena & spettacolo' }).click()
    await p.getByRole('button', { name: 'Uno in più: Ingresso + drink' }).click()
    await p.getByRole('button', { name: 'Uno in più: Ingresso + drink' }).click()
    const totale = await p.locator('[data-totale-scelte]').innerText()
    ok(/3 posti/.test(totale) && /60/.test(totale), `${nome}: «${totale}»`)
    ok(!(await p.locator('#posti-evento').count()), `${nome}: niente campo «Posti» unico`)
    ok(!(await p.locator('[data-comprende]').count()), `${nome}: nessun «comprende» generale sopra le opzioni`)
    const quote = await p.locator('[data-quota]').allInnerTexts()
    // In locale (e per un locale senza conto) la cassa non si apre: si paga sul posto.
    ok(quote.length === 2 && quote.every(q => /sul posto|alla prenotazione/.test(q)), `${nome}: sotto ogni opzione come si paga (${quote.join(' / ')})`)
    ok(!(await sborda(p)), `${nome}: niente esce di lato`)
    await p.locator('[data-scelta-opzioni]').scrollIntoViewIfNeeded()
    await foto(p, `evento-${nome}`)
    if (nome === 'telefono') {
      await p.getByPlaceholder('Nome e cognome *').fill('ZZ Ospite browser')
      await p.getByPlaceholder('Email *').fill(`delivered+opzb-${tag}@resend.dev`)
      await p.locator('input[type=checkbox][required]').check()
      await p.getByRole('button', { name: /Prenota ora/ }).click()
      await p.getByText('Prenotazione inviata!').waitFor({ timeout: 60000 }).then(() => ok(true, 'prenotato dal telefono')).catch(async () => ok(false, 'prenotato dal telefono', await p.locator('body').innerText()))
    }
    ok(!err.length, `${nome}: nessun errore nel browser`, err)
  }
  const { data: pren } = await admin.from('event_bookings').select('scelte, seats, total_amount').eq('event_id', ev.id)
  ok(pren.length === 1 && pren[0].seats === 3 && Number(pren[0].total_amount) === 60 && pren[0].scelte.length === 2, 'nel database: 1 cena + 2 ingressi, 60 €', pren)

  console.log('\n3. IL PANNELLO DELLE PRENOTAZIONI')
  await pc.goto(`${BASE}/admin/eventi/${ev.id}/prenotazioni`, { waitUntil: 'networkidle', timeout: 90000 })
  const conto = await pc.locator('[data-conto-opzioni]').innerText().catch(() => '')
  ok(/Cena & spettacolo[\s\S]*1 \/ 20/.test(conto) && /Ingresso \+ drink[\s\S]*2 \/ 10/.test(conto), 'conto per opzione: cene 1/20, ingressi 2/10', conto)
  ok(/1 × Cena & spettacolo · 2 × Ingresso \+ drink/.test(await pc.locator('[data-scelte-riga]').first().innerText().catch(() => '')), 'la riga dice cosa ha preso')
  await pc.getByRole('button', { name: 'Segna prenotazione' }).click()
  ok(await pc.locator('[data-quante-opzioni]').count() === 1, '«Segna prenotazione» ha le quantità per opzione')
  await pc.getByPlaceholder('Nome di chi ha chiamato *').fill('ZZ Telefono')
  await pc.locator('[data-quante-opzioni]').getByRole('button', { name: 'Uno in più: Ingresso + drink' }).click()
  await pc.getByRole('button', { name: 'Segna', exact: true }).click()
  await pc.locator('[data-appena-segnata]').waitFor({ timeout: 15000 }).then(() => ok(true, 'segnata dal pannello')).catch(() => ok(false, 'segnata dal pannello'))
  await foto(pc, 'pannello-opzioni')
  ok(!errori.length, 'nessun errore nel browser', errori)

  console.log('\n4. L’APP DEL QR')
  const qr = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage()
  const errQr = []; qr.on('pageerror', e => errQr.push(e.message))
  await qr.goto(`${BASE}/s/${slugEnt}?qr=1`, { waitUntil: 'networkidle', timeout: 90000 })
  // Dalla home: «Eventi», poi la scheda dell'evento — il percorso di chi ha inquadrato il QR.
  await qr.getByText(/^Eventi$/).first().click().catch(() => {})
  await qr.waitForTimeout(800)
  const titolo = qr.getByText('ZZ Cena & live').first()
  if (await titolo.count()) {
    await titolo.click()
    await qr.waitForTimeout(800)
    ok(await qr.locator('[data-scelta-opzioni]').count() === 1, 'nell’app la stessa scelta per opzione')
    await foto(qr, 'app-qr-opzioni')
  } else {
    // Dipende da come la struttura espone gli eventi nell'app: va detto, non indovinato.
    console.log('  · l’app di questa struttura di prova non mostra la scheda eventi: non provata col browser')
  }
  ok(!errQr.length, 'app: nessun errore nel browser', errQr)
} catch (e) {
  console.log('  ✗ ERRORE: ' + e.message); ko++
} finally {
  if (browser) await browser.close().catch(() => {})
  try { await cancellaAziendaDiProva(aziendaId) } catch (e) { console.log('pulizia: ' + e.message) }
  if (uid) { try { await admin.auth.admin.deleteUser(uid) } catch {} }
}
console.log(ko ? `\n${ko} DA GUARDARE` : '\n[probe] dati di prova eliminati — tutto verde')
process.exit(ko ? 1 : 0)
