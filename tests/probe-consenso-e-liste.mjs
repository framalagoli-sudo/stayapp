// «Avvisatemi delle prossime serate», e «Scrivi a questa lista».
//
// Garage 22, 04/10/2026: 67 contatti e a nessuno si poteva scrivere per
// invitarlo — nessuno glielo aveva mai chiesto. Due cose insieme:
//   · la casella nei moduli di prenotazione (frasi approvate da Francesco il
//     05/10): facoltativa, mai già spuntata, salvata con la sua prova;
//   · una newsletter che punta a una LISTA di contatti, e arriva solo a chi di
//     quella lista ha detto sì.
//
// Cosa prova, soprattutto col caso ostile:
//   1. il consenso nasce solo da un sì esplicito, per l'email a cui è stato
//      detto, con la frase che il SERVER conosce — mai una arrivata da fuori;
//   2. la newsletter conta e raggiunge solo gli iscritti della lista, e se la
//      lista non esiste più si ferma invece di scrivere a tutti;
//   3. nel pannello: la casella si vede e non è spuntata; il pulsante dice a
//      quanti arriverà, e con zero non si preme.
//
// ⚠️ Nessuna newsletter parte davvero: si provano il conto e il rifiuto.
// Aziende ZZ, indirizzi `@playwright.internal`. Si pulisce da sola.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-consenso-e-liste.mjs
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const pausa = ms => new Promise(r => setTimeout(r, ms))
const aziende = [], utenti = []
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const manda = (percorso, corpo, headers = {}) => fetch(BASE + percorso, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(corpo) })
  .then(async r => ({ stato: r.status, j: await r.json().catch(() => ({})) }))

async function azienda(nome) {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  az.ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: `ZZ Locale ${nome}`, slug: `zz-cl-${nome.toLowerCase()}-${t}`, active: true }).select().single(), 'entità')
  return az
}
async function accesso(aziendaId) {
  const email = `zz-cl-${utenti.length}-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenti.push(u.user.id)
  await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: 'ZZ', azienda_id: aziendaId }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return s.session
}

let browser = null
try {
  const mia = await azienda('CONSENSO'), altra = await azienda('ACCANTO')
  const sMia = await accesso(mia.id), sAltra = await accesso(altra.id)
  const H = { Authorization: `Bearer ${sMia.access_token}` }
  const evento = (titolo, extra = {}) => deve(a.from('eventi').insert({ azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id, title: titolo, slug: `zz-${Math.random().toString(36).slice(2, 9)}-${t}`,
    date_start: new Date(Date.now() + 9 * 864e5).toISOString(), price: 0, prezzo_modo: 'gratuito', published: true, active: true, notify_owner_on_booking: false, send_guest_confirmation: false, ...extra }).select().single(), 'evento')
  const ev = await evento('ZZ Serata consenso')
  const pieno = await evento('ZZ Serata piena', { seats_total: 1, seats_booked: 1, lista_attesa: true })
  const contatto = mail => a.from('contatti').select('*').eq('azienda_id', mia.id).eq('email', mail).maybeSingle().then(r => r.data)
  const finche = async (mail, cond, max = 25) => { for (let i = 0; i < max; i++) { const c = await contatto(mail); if (c && cond(c)) return c; await pausa(1000) } return contatto(mail) }
  const prenota = (corpo) => manda(`/api/guest/eventi/${ev.id}/book`, { seats: 1, privacy_accettata: true, ...corpo })

  console.log('\n1 · IL SÌ ALLE PROMOZIONI\n')
  const no = `zz-no-${t}@playwright.internal`
  await prenota({ guest_name: 'ZZ Senza Spunta', guest_email: no })
  let c = await finche(no, x => x.attivita_numero === 1)
  ok(c?.iscritto_newsletter === false && c?.marketing_consenso_il === null, 'chi prenota senza spuntare NON viene iscritto')

  const si = `zz-si-${t}@playwright.internal`
  await prenota({ guest_name: 'ZZ Con Spunta', guest_email: si, promozioni: true, lang: 'it' })
  c = await finche(si, x => x.iscritto_newsletter)
  ok(c?.iscritto_newsletter === true && c?.marketing_consenso_testo === 'Avvisatemi delle prossime serate' && !!c?.marketing_consenso_il && /ZZ Serata consenso/.test(c?.marketing_consenso_fonte || ''),
    `chi spunta viene iscritto, con la prova: la frase letta, quando, e in quale modulo («${c?.marketing_consenso_testo}» · ${c?.marketing_consenso_fonte})`)
  const primaData = c?.marketing_consenso_il

  // Il sì dev'essere un sì: un valore qualsiasi «vero» non basta.
  for (const [cosa, valore] of [['la stringa "true"', 'true'], ['il numero 1', 1], ['un oggetto con una frase scritta da fuori', { testo: 'Iscrivetemi a tutto e per sempre' }]]) {
    const mail = `zz-finto-${Math.random().toString(36).slice(2, 8)}-${t}@playwright.internal`
    await prenota({ guest_name: 'ZZ Finto', guest_email: mail, promozioni: valore })
    const f = await finche(mail, x => x.attivita_numero === 1)
    ok(f?.iscritto_newsletter === false, `${cosa} al posto del sì non iscrive nessuno`)
  }
  // La frase la decide il server, anche quando la lingua è inventata.
  const en = `zz-en-${t}@playwright.internal`
  await prenota({ guest_name: 'ZZ English', guest_email: en, promozioni: true, lang: 'en' })
  const e1 = await finche(en, x => x.iscritto_newsletter)
  ok(e1?.marketing_consenso_testo === 'Let me know about upcoming events', `in inglese si salva la frase inglese («${e1?.marketing_consenso_testo}»)`)
  const strana = `zz-xx-${t}@playwright.internal`
  await prenota({ guest_name: 'ZZ Lingua', guest_email: strana, promozioni: true, lang: '<script>alert(1)</script>' })
  const e2 = await finche(strana, x => x.iscritto_newsletter)
  ok(e2?.marketing_consenso_testo === 'Avvisatemi delle prossime serate', 'una lingua che non esiste torna alla frase predefinita, non finisce nella prova')

  // Chi è già iscritto tiene la prova che aveva.
  await prenota({ guest_name: 'ZZ Con Spunta', guest_email: si, promozioni: true, lang: 'en' })
  c = await finche(si, x => x.attivita_numero === 2)
  ok(c?.marketing_consenso_il === primaData && c?.marketing_consenso_testo === 'Avvisatemi delle prossime serate', 'un secondo sì non riscrive la prova del primo')

  // Riconosciuto dal telefono, ma con un'altra email in scheda: quella nessuno l'ha autorizzata.
  const vecchia = `zz-vecchia-${t}@playwright.internal`
  await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'ZZ Telefono', email: vecchia, telefono: '333 7778899', telefono_e164: '+393337778899', fonte: 'manuale', pipeline_stage: null }), 'contatto')
  await prenota({ guest_name: 'ZZ Telefono', guest_email: `zz-nuova-${t}@playwright.internal`, guest_phone: '333-777 88 99', promozioni: true })
  const tel = await finche(vecchia, x => x.attivita_numero === 1)
  ok(tel?.iscritto_newsletter === false && !(await contatto(`zz-nuova-${t}@playwright.internal`)), 'riconosciuto dal numero ma con un’altra email in scheda: quell’email non viene iscritta, perché il sì era per l’altra')

  // Lista d'attesa.
  const att = `zz-attesa-${t}@playwright.internal`
  const ra = await manda(`/api/guest/eventi/${pieno.id}/lista-attesa`, { guest_name: 'ZZ In Attesa', guest_email: att, seats: 2, privacy_accettata: true, promozioni: true })
  const ca = await finche(att, x => x.iscritto_newsletter)
  ok(ra.stato < 300 && ca?.iscritto_newsletter === true && /lista d’attesa/.test(ca?.marketing_consenso_fonte || ''), `anche dalla lista d’attesa (HTTP ${ra.stato}, ${ca?.marketing_consenso_fonte})`)

  // Un'offerta prenotata lasciando solo il telefono: non c'è un'email a cui dire sì.
  const off = await deve(a.from('offerte').insert({ azienda_id: mia.id, entity_id: mia.ent.id, titolo: 'ZZ Degustazione consenso', modo: 'richiesta', impegno: 'prenota', prezzo: 0, attiva: true, pubblicata: true, origine: 'escursione' }).select().single(), 'offerta')
  await manda('/api/guest/prenota', { offerta_id: off.id, nome: 'ZZ Solo Numero', contatto: '320 4443322', n_persone: 1, privacy_accettata: true, promozioni: true })
  let numero = null
  for (let i = 0; i < 20 && !numero; i++) { numero = (await a.from('contatti').select('iscritto_newsletter, email').eq('azienda_id', mia.id).eq('telefono_e164', '+393204443322').maybeSingle()).data; if (!numero) await pausa(1000) }
  ok(numero && numero.iscritto_newsletter === false, 'senza un’email non c’è niente a cui iscrivere: resta non iscritto')
  const offMail = `zz-offerta-${t}@playwright.internal`
  await manda('/api/guest/prenota', { offerta_id: off.id, nome: 'ZZ Con Email', contatto: offMail, n_persone: 1, privacy_accettata: true, promozioni: true })
  const co = await finche(offMail, x => x.iscritto_newsletter)
  ok(co?.marketing_consenso_testo === 'Avvisatemi di novità e offerte', `per un’offerta la frase è l’altra («${co?.marketing_consenso_testo}»)`)

  console.log('\n2 · UNA NEWSLETTER PER UNA LISTA\n')
  // In questo momento: chi ha prenotato «ZZ Serata consenso» = 9 persone, di cui iscritte 3 (si, en, strana).
  const lista = { chiave: `evento|${ev.id}`, titolo: 'Chi ha prenotato «ZZ Serata consenso»', ids: ['x'], intruso: true }
  const nl = await manda('/api/newsletter', { azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id, lista }, H)
  ok(nl.stato === 201 && JSON.stringify(Object.keys(nl.j.lista || {}).sort()) === '["chiave","titolo"]', `la bozza nasce con la lista, e della lista si tengono solo chiave e titolo (${JSON.stringify(Object.keys(nl.j.lista || {}))})`)
  const conta = (id, sessione = H) => fetch(`${BASE}/api/newsletter/${id}/destinatari`, { headers: sessione }).then(async r => ({ stato: r.status, grezzo: await r.text() })).then(r => ({ ...r, j: JSON.parse(r.grezzo) }))
  const d = await conta(nl.j.id)
  const inLista = await a.from('contatti_attivita').select('contatto_id').eq('azienda_id', mia.id).eq('tipo', 'evento').eq('origine_id', ev.id)
  const persone = new Set((inLista.data || []).map(x => x.contatto_id)).size
  ok(d.j.quanti === 3 && d.j.lista?.persone === persone && persone >= 7, `arriverebbe ai 3 iscritti della lista, su ${persone} persone (${d.j.quanti} su ${d.j.lista?.persone})`)
  ok(!/playwright\.internal|ZZ Con Spunta/.test(d.grezzo), 'il conto non fa uscire nomi né indirizzi')
  // Senza lista arriverebbe a tutti gli iscritti dell'azienda che si possono raggiungere.
  // ⚠️ Il numero si legge dal database, non si scrive a mano: in produzione un
  // indirizzo finto viene segnato «email non valida» in pochi secondi (la
  // conferma della lista d'attesa parte davvero e rimbalza), e chi ha
  // un'email non valida resta iscritto ma NON è un destinatario. Con «5»
  // scritto a mano la sonda dava rosso su un comportamento giusto.
  await pausa(8000)
  const raggiungibili = async () => (await deve(a.from('contatti').select('email, email_non_valida').eq('azienda_id', mia.id).eq('iscritto_newsletter', true), 'lettura')).filter(x => x.email && !x.email_non_valida)
  const attesi = (await raggiungibili()).length
  ok(attesi >= 4 && attesi > 3, `gli iscritti raggiungibili dell’azienda sono più dei 3 della lista (${attesi})`)
  const tutti = await manda('/api/newsletter', { azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id }, H)
  ok((await conta(tutti.j.id)).j.quanti === attesi, `senza lista arriva a tutti gli iscritti raggiungibili (${attesi}): la lista restringe davvero`)
  // Una lista che non esiste (più): ci si ferma, non si scrive a tutti.
  const finta = await manda('/api/newsletter', { azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id, lista: { chiave: 'evento|00000000-0000-4000-8000-000000000000', titolo: 'Una serata cancellata' } }, H)
  const df = await conta(finta.j.id)
  ok(df.j.quanti === 0 && /non esiste più/.test(df.j.problema || ''), `se la lista non esiste più lo dice, e conta zero (${df.j.problema?.slice(0, 50)}…)`)
  await a.from('newsletters').update({ subject: 'ZZ prova' }).eq('id', finta.j.id)
  const invio = await manda(`/api/newsletter/${finta.j.id}/send`, {}, H)
  const stato = await deve(a.from('newsletters').select('status, recipients_count').eq('id', finta.j.id).single(), 'lettura')
  ok(invio.stato >= 400 && stato.status === 'draft', `provando a inviarla NON parte verso tutti: si ferma e resta in bozza (HTTP ${invio.stato}, ${stato.status})`)
  // Il recinto.
  ok((await conta(nl.j.id, { Authorization: `Bearer ${sAltra.access_token}` })).stato === 404 && (await fetch(`${BASE}/api/newsletter/${nl.j.id}/destinatari`)).status === 401, 'il conto di una newsletter altrui non si legge, e senza login nemmeno')
  // Togliere la lista dalla bozza.
  const tolta = await fetch(`${BASE}/api/newsletter/${nl.j.id}`, { method: 'PATCH', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ lista: null }) }).then(r => r.json())
  ok(tolta.lista === null && (await conta(nl.j.id)).j.quanti === attesi, 'togliendo la lista dalla bozza si torna a tutti gli iscritti')

  console.log('\n2b · IL NEGOZIO\n')
  // Qui, dopo i conteggi: l'email dell'ordine a un indirizzo finto rimbalza, e cambierebbe i numeri di sopra.
  const { data: prod, error: ep } = await a.from('prodotti').insert({ azienda_id: mia.id, nome: 'ZZ Bottiglia', prezzo: 12, attivo: true }).select().single()
  if (ep) ok(false, 'prodotto di prova non creato: ' + ep.message)
  else {
    const ordina = (mail, extra) => manda(`/api/shop/public/${mia.id}/ordine`, { email_cliente: mail, nome_cliente: 'ZZ Cliente', voci: [{ prodotto_id: prod.id, qty: 1 }], privacy_accettata: true, ...extra })
    const cSi = `zz-ordine-si-${t}@playwright.internal`, cNo = `zz-ordine-no-${t}@playwright.internal`
    const o1 = await ordina(cSi, { promozioni: true }), o2 = await ordina(cNo, {})
    const k1 = await finche(cSi, x => x.iscritto_newsletter), k2 = await finche(cNo, x => x.attivita_numero === 1)
    ok(o1.stato === 201 && k1?.iscritto_newsletter === true && k1?.marketing_consenso_testo === 'Avvisatemi di novità e offerte' && k1?.marketing_consenso_fonte === 'ordine dal negozio',
      `chi ordina spuntando la casella viene iscritto, con la prova (HTTP ${o1.stato}${o1.j?.error ? ' ' + o1.j.error : ''} · ${k1?.marketing_consenso_fonte})`)
    ok(o2.stato === 201 && k2?.iscritto_newsletter === false, 'chi ordina senza spuntarla no')

    // Il carrello vero, aperto con un browser: la casella c'è e non è spuntata.
    await a.from('entita').update({ minisito: { active: true } }).eq('id', mia.ent.id)
    await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: mia.ent.id, slug: '__home__', titolo: 'Home', status: 'pubblicata', blocks: [{ id: 'b1', type: 'shop', data: { titolo_sezione: 'ZZ Negozio' } }] }), 'pagina')
    const bn = await chromium.launch()
    try {
      const pn = await (await bn.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 } })).newPage()
      await pn.goto(`${BASE}/r/${mia.ent.slug}`, { waitUntil: 'networkidle' })
      await pn.getByRole('button', { name: 'Aggiungi' }).first().click()
      // Alla prima visita il banner dei cookie copre il pulsante fisso: si passa da quello in pagina, come farebbe il visitatore.
      await pn.getByRole('button', { name: /Vai al carrello/ }).click()
      await pn.getByRole('button', { name: /Procedi all’ordine/ }).click()
      const sp = pn.locator('[data-spunta-promozioni]')
      await sp.waitFor({ timeout: 10000 })
      ok((await sp.innerText()).trim() === 'Avvisatemi di novità e offerte' && !(await sp.locator('input').isChecked()), 'nel carrello la casella c’è, con la frase giusta, e non è già spuntata')
    } catch (e) { ok(false, 'il carrello non si è aperto: ' + e.message.split('\n')[0]) } finally { await bn.close() }
  }

  console.log('\n3 · NEL SITO E NEL PANNELLO\n')
  browser = await chromium.launch()
  const sito = await browser.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 } })
  const pag = await sito.newPage()
  let corpo = null
  await pag.route('**/api/guest/eventi/*/book', route => { corpo = JSON.parse(route.request().postData() || '{}'); route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'probe' }) }) })
  await pag.goto(`${BASE}/eventi/${ev.id}`, { waitUntil: 'networkidle' })
  const spunta = pag.locator('[data-spunta-promozioni]')
  ok(await spunta.count() === 1 && (await spunta.innerText()).trim() === 'Avvisatemi delle prossime serate', 'nel modulo dell’evento c’è la casella, con la frase approvata')
  ok(!(await spunta.locator('input').isChecked()), 'e NON è già spuntata')
  await pag.locator('input[type="email"]').fill(`zz-sito-${t}@playwright.internal`)
  await pag.locator('input[type="email"]').locator('xpath=preceding-sibling::input[1]').fill('ZZ Sito')
  await pag.locator('input[type="checkbox"]').first().check()          // la privacy
  ok(await pag.getByRole('button', { name: /^Prenota/ }).isEnabled(), 'si può prenotare senza spuntarla: è facoltativa')
  await pag.getByRole('button', { name: /^Prenota/ }).click()
  await pag.getByText(/Prenotazione inviata/).waitFor({ timeout: 10000 }).catch(() => {})
  ok(corpo?.promozioni === false, `senza spunta alla prenotazione arriva «no» (${JSON.stringify(corpo?.promozioni)})`)
  await sito.close()
  const inglese = await browser.newContext({ locale: 'en-GB', viewport: { width: 390, height: 844 } })
  const pe = await inglese.newPage()
  await pe.goto(`${BASE}/en/eventi/${ev.id}`, { waitUntil: 'networkidle' })
  ok((await pe.locator('[data-spunta-promozioni]').innerText()).trim() === 'Let me know about upcoming events', 'su /en la casella è in inglese')
  await inglese.close()

  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1360, height: 1000 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sMia) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  await page.goto(`${BASE}/admin/contatti`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-tabella-contatti]').waitFor({ timeout: 60000 })
  const scrivi = page.locator('[data-scrivi-lista]')
  await page.locator('[data-lista]', { hasText: 'ZZ Degustazione consenso' }).click()
  ok(/Scrivi a questa lista \(1\)/.test(await scrivi.innerText()) && await scrivi.isEnabled(), `il pulsante dice a quanti arriverà: «${(await scrivi.innerText()).trim()}»`)
  // Chi è in lista d'attesa ha detto sì, ma se la sua email risulta non valida non conta: il pulsante segue il database.
  await page.locator('[data-lista]', { hasText: 'ZZ Serata piena' }).click()
  const inAttesa = (await raggiungibili()).filter(x => x.email === att).length
  ok(inAttesa ? /\(1\)/.test(await scrivi.innerText()) : await scrivi.isDisabled(), `e cambia con la lista: un’email che rimbalza non viene contata (${inAttesa ? 'valida: 1' : 'non valida: pulsante spento'})`)
  await page.locator('[data-lista="fonte|manuale"]').click()
  ok(await scrivi.isDisabled() && /Nessuno in questa lista ha dato il consenso/.test(await scrivi.getAttribute('title')), 'dove nessuno ha detto sì non si preme, e dice perché')
  await page.locator('[data-lista]', { hasText: 'ZZ Serata consenso' }).click()
  await scrivi.click()
  await page.waitForURL(/\/admin\/newsletter\/[0-9a-f-]{36}/, { timeout: 30000 })
  await page.locator('[data-conto-destinatari]:not([data-conto-destinatari=""])').waitFor({ timeout: 30000 })
  const scelta = await page.locator('[data-scegli-lista]').evaluate(el => el.selectedOptions[0]?.textContent || '')
  const conto = (await page.locator('[data-conto-destinatari]').innerText()).replace(/\s+/g, ' ')
  ok(/Chi ha prenotato «ZZ Serata consenso»/.test(scelta) && /di questa lista/.test(conto), `si apre una bozza di newsletter già destinata a quella lista, col suo conto («${conto}»)`)
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  await ctx.close()

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL SÌ È UN SÌ, E SI SCRIVE SOLO A CHI L’HA DETTO')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
