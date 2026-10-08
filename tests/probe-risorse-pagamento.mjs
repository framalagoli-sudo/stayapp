// Prenotazione di una risorsa con pagamento: chi non paga non è prenotato.
//
// Stesso schema degli eventi (01/10/2026), portato sulle risorse l'08/10/2026
// prima che servisse: nessuna risorsa incassava ancora online, ma chi apriva la
// cassa riceveva «Prenotazione confermata» e teneva il posto senza scadenza.
//
// Cosa prova:
//   1. senza conto collegato → si paga sul posto, la prenotazione vale subito;
//   2. conferma a mano + acconto → NESSUNA cassa (non si fa pagare ciò che si
//      può ancora rifiutare), e resta «da confermare» finché il titolare decide;
//   3. conferma automatica + acconto + conto → cassa con scadenza, prenotazione
//      «in attesa», posto tenuto, niente promemoria finché non paga;
//   4. il pagamento (webhook firmato) la rende vera, una volta sola, con la
//      cifra PAGATA — l'acconto — e non il totale;
//   5. il titolare che la conferma a mano = pagherà sul posto;
//   6. un pagamento su una prenotazione annullata non la resuscita;
//   7. col browser: il modulo annuncia il pagamento solo quando arriva davvero,
//      il pannello distingue «Attende il pagamento» da «Da confermare».
//
// ⛔ Solo in LOCALE: usa i conti Stripe di PROVA già esistenti nella sandbox
// (non ne crea: un conto Standard non si attiva né si cancella via API, e
// ogni lancio ne lascerebbe uno) e firma il webhook col segreto di .env.local.
// Per aprire una cassa Stripe pretende che il conto abbia un nome: fra quelli
// di prova se ne cerca uno che ce l'ha (cassa vera) e uno che non ce l'ha (il
// caso del cliente che ha iniziato il collegamento e non l'ha finito).
// In locale le email sono spente. Non chiama MAI lo scheduler delle automazioni.
// Il giro che libera chi non paga (cron) si prova in produzione con
// `--cron`: lì gira da solo ogni cinque minuti.
//
// Uso:  cd tests && TEST_URL=http://localhost:3000 node probe-risorse-pagamento.mjs
//       cd tests && node probe-risorse-pagamento.mjs --cron      (produzione, ~6 minuti)
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { createRequire } from 'module'
import { randomBytes } from 'crypto'
import fs from 'fs'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const soloCron = process.argv.includes('--cron')
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const locale = /localhost|127\.0\.0\.1/.test(BASE)
if (!soloCron && !locale) { console.error('Solo in locale: TEST_URL=http://localhost:3000 (in produzione: --cron)'); process.exit(2) }
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const pausa = ms => new Promise(r => setTimeout(r, ms))
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const giorno = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const riga = id => a.from('prenotazioni').select('*').eq('id', id).single().then(r => r.data)
const inCoda = id => a.from('automazioni_log').select('id', { count: 'exact', head: true }).eq('source_id', id).then(r => r.count || 0)
const finche = async (leggi, cond, max = 20) => { let v; for (let i = 0; i < max; i++) { v = await leggi(); if (cond(v)) return v; await pausa(1000) } return v }
const aziende = [], utenti = []
const tutto = [{ start: '09:00', end: '18:00' }]

async function azienda(nome) {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  az.ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: `ZZ Locale ${nome}`, slug: `zz-rp-${nome.toLowerCase()}-${t}`, active: true, minisito: { active: true } }).select().single(), 'entità')
  return az
}
const risorsa = (az, nome, extra = {}) => deve(a.from('risorse').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: az.ent.id, nome, modalita: 'slot', durata_minuti: 60, quantita: 1,
  prezzo: 40, acconto_percentuale: 50, attiva: true, visibile_minisito: true, conferma_auto: true,
  disponibilita: { lun: tutto, mar: tutto, mer: tutto, gio: tutto, ven: tutto, sab: tutto, dom: tutto }, ...extra }).select().single(), 'risorsa')
const prenota = (r, quando, ora, chi) => fetch(`${BASE}/api/booking/public/prenota`, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ risorsa_id: r.id, data: quando, ora_inizio: ora, cliente_nome: `ZZ ${chi}`, cliente_email: `zz-rp-${chi.toLowerCase()}-${t}@playwright.internal`, n_persone: 1, privacy_accettata: true }) })
  .then(async x => ({ stato: x.status, j: await x.json().catch(() => ({})) }))
async function accesso(aziendaId) {
  const email = `zz-rp-${utenti.length}-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenti.push(u.user.id)
  await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: 'ZZ', azienda_id: aziendaId }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return s.session
}

let browser = null
try {
  // ── In produzione: solo il giro che libera chi non paga ────────────────────
  if (soloCron) {
    console.log('\nIL GIRO CHE LIBERA CHI NON PAGA (produzione: gira da solo ogni 5 minuti)\n')
    const az = await azienda('SCADE')
    const r = await risorsa(az, 'ZZ Sala scade')
    // Una prenotazione «in attesa del pagamento» nata 40 minuti fa, senza una
    // cassa: nessuno può pagarla. Non si interroga Stripe (niente allarmi veri)
    // e l'email va al pozzo di Resend, non a una persona.
    const p = await deve(a.from('prenotazioni').insert({ risorsa_id: r.id, azienda_id: az.id, entity_tipo: 'ristorante', entity_id: az.ent.id,
      data: giorno(9), ora_inizio: '10:00', ora_fine: '11:00', cliente_nome: 'ZZ Non Paga', cliente_email: 'delivered@resend.dev', n_persone: 1,
      stato: 'in_attesa', pagamento_stato: 'non_pagato', importo_totale: 40, importo_online: 20, prezzo_unitario: 40,
      privacy_accettata: true, created_at: new Date(Date.now() - 40 * 60000).toISOString() }).select().single(), 'prenotazione')
    // Accanto, una richiesta che aspetta il TITOLARE: quella non si tocca.
    const q = await deve(a.from('prenotazioni').insert({ risorsa_id: r.id, azienda_id: az.id, entity_tipo: 'ristorante', entity_id: az.ent.id,
      data: giorno(9), ora_inizio: '12:00', ora_fine: '13:00', cliente_nome: 'ZZ Aspetta', cliente_email: `zz-rp-aspetta-${t}@playwright.internal`, n_persone: 1,
      stato: 'in_attesa', pagamento_stato: 'non_richiesto', importo_totale: 40, prezzo_unitario: 40,
      privacy_accettata: true, created_at: new Date(Date.now() - 40 * 60000).toISOString() }).select().single(), 'richiesta')
    const occupato = async ora => (await fetch(`${BASE}/api/booking/public/disponibilita/${r.id}?data=${giorno(9)}`).then(x => x.json()))?.slots?.find(s => s.ora === ora)
    console.log('  … aspetto il prossimo giro (fino a 7 minuti)')
    const dopo = await finche(() => riga(p.id), x => x?.stato === 'cancellata', 420)
    ok(dopo?.stato === 'cancellata' && dopo?.pagamento_stato === 'non_pagato', `chi non ha pagato entro mezz’ora viene annullato da solo (${dopo?.stato})`)
    ok((await riga(q.id))?.stato === 'in_attesa', 'una richiesta che aspetta il titolare NON viene toccata')
    const s10 = await occupato('10:00')
    ok(!s10 || s10.disponibili > 0 || s10.disponibile !== false, `e l’orario torna prenotabile (${JSON.stringify(s10 || 'non in elenco')})`)
    const riprova = await prenota(r, giorno(9), '10:00', 'Dopo')
    ok(riprova.stato === 201, `infatti un altro lo può prenotare (HTTP ${riprova.stato}${riprova.j?.error ? ' ' + riprova.j.error : ''})`)
  } else {
    const require = createRequire(import.meta.url)
    const Stripe = require('../client-next/node_modules/stripe')
    const localEnv = Object.fromEntries(fs.readFileSync('../client-next/.env.local', 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.includes('='))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
    const stripe = new Stripe(localEnv.STRIPE_SECRET_KEY || 'sk_test_x')
    const pagaConWebhook = sid => {
      const payload = JSON.stringify({ id: `evt_probe_${Date.now()}`, object: 'event', type: 'checkout.session.completed',
        data: { object: { id: sid, object: 'checkout.session', payment_intent: 'pi_probe', payment_status: 'paid' } } })
      const firma = stripe.webhooks.generateTestHeaderString({ payload, secret: localEnv.STRIPE_WEBHOOK_SECRET })
      return fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', headers: { 'stripe-signature': firma, 'content-type': 'application/json' }, body: payload })
    }

    console.log('\n1 · SENZA UN CONTO COLLEGATO\n')
    const senza = await azienda('SENZA')
    const r1 = await risorsa(senza, 'ZZ Sala senza conto')
    const p1 = await prenota(r1, giorno(5), '10:00', 'Uno')
    const d1 = await riga(p1.j.id)
    ok(p1.stato === 201 && !p1.j.pagamento && d1?.stato === 'confermata' && d1?.pagamento_stato === 'non_richiesto' && d1?.importo_online === null, `nessuna cassa: vale subito e si paga sul posto (HTTP ${p1.stato} · ${d1?.stato}/${d1?.pagamento_stato})`)

    const conti = { pronto: null, aMeta: null }
    for await (const acc of stripe.accounts.list({ limit: 100 })) {
      const haNome = !!(acc.business_profile?.name || acc.settings?.dashboard?.display_name)
      if (haNome && !conti.pronto) conti.pronto = acc.id
      if (!haNome && !conti.aMeta) conti.aMeta = acc.id
    }
    if (!conti.pronto) throw new Error('nella sandbox di Stripe non c’è un conto di prova con un nome: la cassa vera non si può aprire')

    if (conti.aMeta) {
      console.log('\n1b · CONTO COLLEGATO A METÀ: la cassa non si apre\n')
      const meta = await azienda('META')
      await a.from('aziende').update({ stripe_account_id: conti.aMeta }).eq('id', meta.id)
      const rm = await risorsa(meta, 'ZZ Sala a metà')
      const pm = await prenota(rm, giorno(5), '10:00', 'Meta')
      const dm = await riga(pm.j.id)
      ok(pm.stato === 201 && !pm.j.pagamento && dm?.stato === 'confermata' && dm?.pagamento_stato === 'non_richiesto' && dm?.importo_online === null,
        `la prenotazione NON si perde: resta valida e si paga sul posto (HTTP ${pm.stato} · ${dm?.stato}/${dm?.pagamento_stato}) — e parte l’allarme`)
      ok(await finche(() => a.from('contatti_attivita').select('id', { count: 'exact', head: true }).eq('riferimento', pm.j.id).then(r => r.count || 0), n => n > 0, 10) > 0, 'e la persona entra comunque fra i contatti')
    }

    const con = await azienda('CONTO')
    const sCon = await accesso(con.id)
    const H = { Authorization: `Bearer ${sCon.access_token}`, 'content-type': 'application/json' }
    const conto = conti.pronto
    await a.from('aziende').update({ stripe_account_id: conto }).eq('id', con.id)
    await a.from('automazioni').insert({ azienda_id: con.id, entity_tipo: 'ristorante', entity_id: con.ent.id, nome: 'ZZ prova', trigger_evento: 'nuova_prenotazione', attiva: true,
      steps: [{ delay_ore: 48, subject: 'prova', heading: 'prova', text: 'prova' }] })
    const paga = await risorsa(con, 'ZZ Sala paga')
    const mano = await risorsa(con, 'ZZ Sala a mano', { conferma_auto: false })

    console.log('\n2 · CONFERMA A MANO + ACCONTO: non si fa pagare ciò che si può ancora rifiutare\n')
    const grezzo = await fetch(`${BASE}/api/booking/public/risorse/ristorante/${con.ent.id}`).then(x => x.text())
    const elenco = JSON.parse(grezzo)
    ok(elenco.find(x => x.id === paga.id)?.paga_online === true && elenco.find(x => x.id === mano.id)?.paga_online === false, 'l’elenco pubblico dice quale risorsa manda alla cassa e quale no')
    ok(!grezzo.includes('azienda_id') && !grezzo.includes(con.id) && !grezzo.includes('stripe'), 'e non fa uscire né l’azienda né niente del conto')
    const p2 = await prenota(mano, giorno(5), '10:00', 'Due')
    const d2 = await riga(p2.j.id)
    ok(p2.stato === 201 && !p2.j.pagamento && d2?.stato === 'in_attesa' && d2?.pagamento_stato === 'non_richiesto', `nessuna cassa, resta da confermare (${d2?.stato}/${d2?.pagamento_stato})`)
    const inventato = await fetch(`${BASE}/api/booking/prenotazioni/${p2.j.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ stato: 'pagata_davvero' }) })
    ok(inventato.status === 400 && (await riga(p2.j.id))?.stato === 'in_attesa', `uno stato inventato dal pannello viene rifiutato (HTTP ${inventato.status})`)
    const approva = await fetch(`${BASE}/api/booking/prenotazioni/${p2.j.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ stato: 'confermata' }) })
    ok(approva.status === 200 && (await riga(p2.j.id))?.stato === 'confermata', `il titolare la approva e diventa confermata (HTTP ${approva.status})`)

    console.log('\n3 · CASSA APERTA: tiene il posto, ma non è ancora prenotato\n')
    const p3 = await prenota(paga, giorno(5), '10:00', 'Tre')
    const d3 = await riga(p3.j.id)
    ok(p3.stato === 201 && /^https:\/\/checkout\.stripe\.com\//.test(p3.j.pagamento?.url || ''), `c’è il link della cassa (HTTP ${p3.stato}${p3.j?.error ? ' ' + p3.j.error : ''})`)
    ok(d3?.stato === 'in_attesa' && d3?.pagamento_stato === 'non_pagato' && !!d3?.pagamento_id, `nasce in attesa del pagamento (${d3?.stato}/${d3?.pagamento_stato})`)
    ok(Number(d3?.importo_online) === 20 && p3.j.pagamento?.importo === 20 && p3.j.pagamento?.saldo === 20, `la cifra portata alla cassa è scritta sulla riga: €${d3?.importo_online} su €${d3?.importo_totale}`)
    const sessione = await stripe.checkout.sessions.retrieve(d3.pagamento_id, {}, { stripeAccount: conto })
    const minuti = Math.round((sessione.expires_at * 1000 - Date.now()) / 60000)
    ok(minuti >= 29 && minuti <= 32 && sessione.amount_total === 2000, `la cassa scade fra ${minuti} minuti (non fra 24 ore) e chiede ${sessione.amount_total / 100} €`)
    const doppia = await prenota(paga, giorno(5), '10:00', 'Quattro')
    ok(doppia.stato === 409, `intanto il posto è tenuto: un altro non lo prende (HTTP ${doppia.stato})`)
    await pausa(3000)
    ok(await inCoda(p3.j.id) === 0, 'finché non paga: nessun promemoria, nessuna «nuova prenotazione»')

    console.log('\n4 · ARRIVA IL PAGAMENTO (webhook firmato)\n')
    const w = await pagaConWebhook(d3.pagamento_id)
    const d4 = await riga(p3.j.id)
    ok(w.status === 200 && d4?.stato === 'confermata' && d4?.pagamento_stato === 'pagato', `diventa confermata e pagata (HTTP ${w.status} · ${d4?.stato}/${d4?.pagamento_stato})`)
    const coda = await inCoda(p3.j.id)
    ok(coda > 0, `solo adesso le automazioni entrano in coda (${coda})`)
    const w2 = await pagaConWebhook(d3.pagamento_id)
    ok(w2.status === 200 && await inCoda(p3.j.id) === coda, 'lo stesso webhook ripetuto non duplica niente')
    const esito = await fetch(`${BASE}/api/guest/pagamento/esito?session_id=${d3.pagamento_id}`).then(x => x.text())
    const ej = JSON.parse(esito)
    ok(ej.trovato && ej.titolo === 'ZZ Sala paga' && Number(ej.importo) === 20 && Number(ej.saldo) === 20 && ej.pagato === true, `chi torna dalla cassa legge cosa e quanto ha pagato: «${ej.titolo}» €${ej.importo}, restano €${ej.saldo}`)
    ok(!esito.includes('@') && !esito.includes('ZZ Tre'), 'senza nomi né indirizzi')
    const incassi = await fetch(`${BASE}/api/stripe/incassi?azienda_id=${con.id}`, { headers: H }).then(x => x.json())
    const mio = (incassi.righe || []).find(x => x.id === `prenotazione-${p3.j.id}`)
    ok(mio?.importo === 20 && mio?.cosa === 'ZZ Sala paga', `in «Pagamenti» compare l’acconto arrivato, non il totale (€${mio?.importo} · ${mio?.cosa})`)

    console.log('\n5 · IL TITOLARE LA TIENE LUI: pagherà sul posto\n')
    const p5 = await prenota(paga, giorno(5), '12:00', 'Cinque')
    const tiene = await fetch(`${BASE}/api/booking/prenotazioni/${p5.j.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ stato: 'confermata' }) })
    const d5 = await riga(p5.j.id)
    ok(tiene.status === 200 && d5?.stato === 'confermata' && d5?.pagamento_stato === 'non_richiesto' && d5?.importo_online === null, `confermata a mano: il pagamento online non è più atteso (${d5?.stato}/${d5?.pagamento_stato})`)
    ok(await finche(() => inCoda(p5.j.id), n => n > 0, 8) > 0, 'e adesso che è vera partono anche le sue automazioni')
    const w5 = await pagaConWebhook(d5.pagamento_id)
    ok(w5.status === 200 && (await riga(p5.j.id))?.pagamento_stato === 'pagato' && (await riga(p5.j.id))?.stato === 'confermata', 'se poi paga lo stesso dalla cassa ancora aperta, il denaro si segna')

    console.log('\n6 · PAGAMENTO SU UNA PRENOTAZIONE GIÀ ANNULLATA\n')
    const p6 = await prenota(paga, giorno(5), '14:00', 'Sei')
    await a.from('prenotazioni').update({ stato: 'cancellata' }).eq('id', p6.j.id)
    const w6 = await pagaConWebhook((await riga(p6.j.id)).pagamento_id)
    const d6 = await riga(p6.j.id)
    ok(w6.status === 200 && d6?.stato === 'cancellata' && await inCoda(p6.j.id) === 0, `resta annullata (${d6?.stato}) — parte l’avviso «da rimborsare», nessun promemoria`)

    console.log('\n7 · COL BROWSER: il modulo e il pannello\n')
    await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: con.ent.id, slug: '__home__', titolo: 'Home', status: 'pubblicata', blocks: [{ id: 'b1', type: 'booking', data: { titolo_sezione: 'ZZ Prenota' } }] }), 'pagina')
    browser = await chromium.launch()
    const sito = await (await browser.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 } })).newPage()
    const erroriSito = []
    sito.on('pageerror', e => erroriSito.push(e.message))
    const finoAlModulo = async (nome, ora) => {
      await sito.goto(`${BASE}/r/${con.ent.slug}`, { waitUntil: 'networkidle' })
      await sito.getByRole('button', { name: 'Accetto' }).click({ timeout: 5000 }).catch(() => {})
      await sito.getByText(nome, { exact: true }).first().click()
      await sito.locator('input[type="date"]').fill(giorno(6))
      await sito.getByRole('button', { name: new RegExp('^' + ora) }).first().click()
      await sito.getByPlaceholder('Nome e cognome *').waitFor({ timeout: 15000 })
    }
    await finoAlModulo('ZZ Sala paga', '10:00')
    const avviso = (await sito.locator('[data-avviso-pagamento]').innerText().catch(() => '')).trim()
    ok(/valida solo dopo il pagamento dell’acconto/.test(avviso) && await sito.getByRole('button', { name: 'Conferma e paga' }).count() === 1, `dove si paga online il modulo lo dice prima: «${avviso}»`)
    await finoAlModulo('ZZ Sala a mano', '10:00')
    ok(await sito.locator('[data-avviso-pagamento]').count() === 0 && await sito.getByRole('button', { name: 'Conferma prenotazione' }).count() === 1, 'dove si approva a mano NON annuncia un pagamento che non arriverà')
    await sito.getByPlaceholder('Nome e cognome *').fill('ZZ Sette')
    await sito.getByPlaceholder('Email *').fill(`zz-rp-sette-${t}@playwright.internal`)
    await sito.locator('input[type="checkbox"]').first().check()
    await sito.getByRole('button', { name: 'Conferma prenotazione' }).click()
    await sito.locator('[data-esito-prenotazione]').waitFor({ timeout: 20000 }).catch(() => {})
    const fine = (await sito.locator('[data-esito-prenotazione]').innerText().catch(() => '')).trim()
    ok(fine === 'Richiesta inviata' && await sito.getByText(/Non è ancora confermata/).count() === 1, `chi chiede una risorsa che si approva a mano legge «${fine}», non «confermata»`)
    ok(erroriSito.length === 0, `nessun errore nel browser sul sito${erroriSito.length ? ' — ' + erroriSito[0] : ''}`)

    // Una che sta pagando adesso, per vederla nel pannello.
    const p7 = await prenota(paga, giorno(7), '10:00', 'Otto')
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1360, height: 1000 },
      storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sCon) }] }] } })
    const page = await ctx.newPage()
    const errori = []
    page.on('pageerror', e => errori.push(e.message))
    await page.goto(`${BASE}/admin/prenotazioni`, { waitUntil: 'domcontentloaded' })
    await page.getByText('ZZ Otto').first().waitFor({ timeout: 60000 }).catch(() => {})
    const testo = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    ok(/Attende il pagamento/.test(testo) && await page.locator('[data-attende-pagamento]').count() >= 1 && /Conferma: pagherà sul posto/.test(testo), 'nel pannello chi sta pagando è «Attende il pagamento», con scritto che non serve fare niente')
    ok(/1 da confermare/.test(testo) && /attende il pagamento|attendono il pagamento/.test(testo), 'e in cima «da confermare» conta solo la richiesta che aspetta il titolare')
    ok(/Pagato €20\.00/.test(testo), 'la pagata mostra la cifra arrivata: «Pagato €20.00»')
    if (process.argv[2] && !process.argv[2].startsWith('--')) await page.screenshot({ path: `${process.argv[2]}/risorse-pannello.png`, fullPage: true })
    await page.goto(`${BASE}/admin/booking/risorse`, { waitUntil: 'domcontentloaded' })
    // La scheda si apre da «Modifica»: quello sulla riga che porta il nome della risorsa.
    await page.getByText('ZZ Sala a mano').first().waitFor({ timeout: 60000 })
    await page.getByText('ZZ Sala a mano', { exact: true }).first().locator('xpath=ancestor::*[.//button[normalize-space()="Modifica"]][1]').getByRole('button', { name: 'Modifica' }).first().click()
    await page.locator('[data-avviso-conferma-manuale]').waitFor({ timeout: 15000 }).catch(() => {})
    const titolo = (await page.locator('h1').first().innerText().catch(() => '')).trim()
    ok(titolo === 'Modifica: ZZ Sala a mano' && await page.locator('[data-avviso-conferma-manuale]').count() === 1, `nella scheda della risorsa («${titolo}»): acconto + conferma a mano avvisa che il pagamento online non verrà chiesto`)
    await page.locator('#conferma_auto').check()
    ok(await page.locator('[data-avviso-conferma-manuale]').count() === 0, 'e accendendo «Conferma automatica» l’avviso sparisce')
    ok(errori.length === 0, `nessun errore nel browser nel pannello${errori.length ? ' — ' + errori[0] : ''}`)
    void p7
  }

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'CHI NON PAGA NON È PRENOTATO; CHI PAGA LO DIVENTA, UNA VOLTA SOLA')
} catch (e) {
  console.error('ERRORE:', e.message.split('\n')[0]); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
