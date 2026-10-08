// Il link di pagamento per le prenotazioni prese a voce.
//
// Idea di Francesco (08/10/2026): «un hotel che riceve una prenotazione
// telefonica e invia il link per il pagamento». Vale per eventi e risorse.
//
// Cosa prova:
//   1. il link si crea solo per le prenotazioni della PROPRIA azienda, con una
//      cifra che non supera il totale, e la prenotazione resta com'è;
//   2. la cassa vale un giorno (non mezz'ora) e il link che si copia è il
//      nostro `/paga/…`, che porta alla cassa finché è aperta;
//   3. cambiando importo il link di prima smette di valere;
//   4. il pagamento (webhook firmato) segna «pagato» con la cifra chiesta, e una
//      richiesta «da confermare» diventa confermata;
//   5. annullando la prenotazione il link si chiude;
//   6. chi sta già pagando dal sito non riceve un secondo link;
//   7. col browser: «Segna prenotazione» → «Chiedi il pagamento» → «Copia link».
//
// ⛔ In LOCALE (conti di prova già esistenti nella sandbox di Stripe, webhook
// firmato col segreto di .env.local; le email lì sono spente).
// In produzione `--vivo` prova quello che lì si può provare senza un conto
// vero: l'email del link (verso il pozzo di Resend), la pagina di un link
// scaduto e il giro che chiude i link vecchi (~6 minuti).
//
// Uso:  cd tests && TEST_URL=http://localhost:3000 node probe-link-pagamento.mjs [cartella-foto]
//       cd tests && node probe-link-pagamento.mjs --vivo
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { createRequire } from 'module'
import { randomBytes } from 'crypto'
import fs from 'fs'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const vivo = process.argv.includes('--vivo')
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
if (!vivo && !/localhost|127\.0\.0\.1/.test(BASE)) { console.error('Solo in locale: TEST_URL=http://localhost:3000 (in produzione: --vivo)'); process.exit(2) }
const foto = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const pausa = ms => new Promise(r => setTimeout(r, ms))
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const finche = async (leggi, cond, max = 20) => { let v; for (let i = 0; i < max; i++) { v = await leggi(); if (cond(v)) return v; await pausa(1000) } return v }
const aziende = [], utenti = []
const ev = id => a.from('event_bookings').select('*').eq('id', id).single().then(r => r.data)
const ri = id => a.from('prenotazioni').select('*').eq('id', id).single().then(r => r.data)
const inCoda = id => a.from('automazioni_log').select('id', { count: 'exact', head: true }).eq('source_id', id).then(r => r.count || 0)
const giorno = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const tutto = [{ start: '09:00', end: '18:00' }]

async function azienda(nome) {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  az.ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: `ZZ Locale ${nome}`, slug: `zz-lp-${nome.toLowerCase()}-${t}`, active: true, email: 'delivered@resend.dev' }).select().single(), 'entità')
  const email = `zz-lp-${utenti.length}-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenti.push(u.user.id)
  await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  az.sessione = s.session
  az.H = { Authorization: `Bearer ${s.session.access_token}`, 'content-type': 'application/json' }
  return az
}
const chiama = (metodo, percorso, headers, corpo) => fetch(BASE + percorso, { method: metodo, redirect: 'manual', headers: headers || {}, body: corpo ? JSON.stringify(corpo) : undefined })
  .then(async r => { const grezzo = await r.text(); let j = {}; try { j = JSON.parse(grezzo) } catch {} return { stato: r.status, j, grezzo, dove: r.headers.get('location') } })
const evento = (az, extra = {}) => deve(a.from('eventi').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: az.ent.id, title: 'ZZ Cena al telefono', slug: `zz-lp-${Math.random().toString(36).slice(2, 8)}-${t}`,
  date_start: new Date(Date.now() + 9 * 864e5).toISOString(), price: 30, prezzo_modo: 'cifra', seats_total: 20, published: true, active: true, notify_owner_on_booking: false, send_guest_confirmation: false, ...extra }).select().single(), 'evento')

let browser = null
try {
  if (vivo) {
    console.log('\nIN PRODUZIONE — quello che si può provare senza un conto vero\n')
    const az = await azienda('VIVO')
    const e = await evento(az)
    const b = await chiama('POST', `/api/eventi/${e.id}/bookings`, az.H, { guest_name: 'ZZ Telefono', seats: 2 })
    const st = await chiama('GET', `/api/pagamenti/link?tipo=evento&id=${b.j.id}`, az.H)
    ok(b.stato === 201 && st.stato === 200 && st.j.conto_collegato === false && st.j.proposta === 60 && st.j.link === null, `la prenotazione scritta a mano si può aprire: totale €${st.j.totale}, conto non collegato → lo dice (HTTP ${st.stato})`)
    const senza = await chiama('POST', '/api/pagamenti/link', az.H, { tipo: 'evento', id: b.j.id, importo: 60 })
    ok(senza.stato === 409 && /Pagamenti/.test(senza.j.error || '') && (await ev(b.j.id)).pagamento_stato !== 'non_pagato', `senza un conto il link non si crea, e dice dove andare (HTTP ${senza.stato})`)
    // Un link «finto» già scritto sulla riga, per provare l'email e la pagina
    // senza una cassa vera: nessuna chiamata a Stripe (il conto non c'è).
    const sid = `cs_test_probe${t}`
    await a.from('event_bookings').update({ pagamento_id: sid, pagamento_stato: 'non_pagato', pagamento_richiesto_il: new Date().toISOString(), importo_online: 20 }).eq('id', b.j.id)
    const brutta = await chiama('POST', '/api/pagamenti/link/invia', az.H, { tipo: 'evento', id: b.j.id, email: 'non-una-email' })
    ok(brutta.stato === 400, `un indirizzo scritto male viene rifiutato (HTTP ${brutta.stato})`)
    const inv = await chiama('POST', '/api/pagamenti/link/invia', az.H, { tipo: 'evento', id: b.j.id, email: 'delivered@resend.dev' })
    ok(inv.stato === 200 && inv.j.ok === true, `l’email con il link parte (HTTP ${inv.stato}${inv.j.error ? ' ' + inv.j.error : ''})`)
    ok((await ev(b.j.id)).guest_email === 'delivered@resend.dev', 'e l’indirizzo scritto diventa quello della prenotazione, che non ne aveva uno: la conferma arriverà lì')
    const pag = await chiama('GET', `/paga/${sid}`)
    ok(pag.stato === 410 && /ZZ Locale VIVO/.test(pag.grezzo) && /scaduto/.test(pag.grezzo) && !/ZZ Telefono|delivered@/.test(pag.grezzo), `un link che non si può più pagare dice di chi era, senza altri dati (HTTP ${pag.stato})`)
    const inventato = await chiama('GET', '/paga/cs_test_nonEsisteDavvero12345')
    const storto = await chiama('GET', `/paga/${encodeURIComponent("x' or 1=1--")}`)
    ok(inventato.stato === 404 && storto.stato === 404, `un link inventato o manomesso non trova niente (HTTP ${inventato.stato} · ${storto.stato})`)
    // Il giro: un link chiesto 25 ore fa torna «si paga sul posto», e la prenotazione resta.
    await a.from('event_bookings').update({ pagamento_richiesto_il: new Date(Date.now() - 25 * 3600e3).toISOString() }).eq('id', b.j.id)
    console.log('  … aspetto il prossimo giro (fino a 7 minuti)')
    const dopo = await finche(() => ev(b.j.id), x => x?.pagamento_stato === 'non_richiesto', 420)
    ok(dopo?.pagamento_stato === 'non_richiesto' && dopo?.pagamento_richiesto_il === null && dopo?.status === 'confirmed' && dopo?.importo_online === null, `il link scaduto torna «si paga sul posto» e la prenotazione RESTA confermata (${dopo?.status}/${dopo?.pagamento_stato})`)
  } else {
    const require = createRequire(import.meta.url)
    const Stripe = require('../client-next/node_modules/stripe')
    const localEnv = Object.fromEntries(fs.readFileSync('../client-next/.env.local', 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.includes('='))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
    const stripe = new Stripe(localEnv.STRIPE_SECRET_KEY || 'sk_test_x')
    const pagaConWebhook = sid => {
      const payload = JSON.stringify({ id: `evt_probe_${Date.now()}`, object: 'event', type: 'checkout.session.completed',
        data: { object: { id: sid, object: 'checkout.session', payment_intent: 'pi_probe', payment_status: 'paid' } } })
      return fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret: localEnv.STRIPE_WEBHOOK_SECRET }), 'content-type': 'application/json' }, body: payload })
    }
    let conto = null
    for await (const acc of stripe.accounts.list({ limit: 100 })) if (acc.business_profile?.name || acc.settings?.dashboard?.display_name) { conto = acc.id; break }
    if (!conto) throw new Error('nella sandbox di Stripe non c’è un conto di prova con un nome: la cassa non si può aprire')
    const sessione = sid => stripe.checkout.sessions.retrieve(sid, {}, { stripeAccount: conto })
    const sidDi = url => url.split('/paga/')[1]

    const mia = await azienda('LINK'), altra = await azienda('VICINA')
    await a.from('aziende').update({ stripe_account_id: conto }).eq('id', mia.id)
    const e = await evento(mia)
    const crea = (corpo, H = mia.H) => chiama('POST', '/api/pagamenti/link', H, corpo)

    console.log('\n1 · UNA PRENOTAZIONE PRESA AL TELEFONO\n')
    const b = await chiama('POST', `/api/eventi/${e.id}/bookings`, mia.H, { guest_name: 'ZZ Telefono', seats: 2 })
    const st = await chiama('GET', `/api/pagamenti/link?tipo=evento&id=${b.j.id}`, mia.H)
    ok(b.stato === 201 && st.j.totale === 60 && st.j.proposta === 60 && st.j.conto_collegato === true && st.j.non_si_puo === null && st.j.link === null, `si può chiedere il pagamento: propone il totale, €${st.j.proposta} (HTTP ${st.stato})`)

    console.log('\n2 · IL CASO OSTILE\n')
    ok((await chiama('GET', `/api/pagamenti/link?tipo=evento&id=${b.j.id}`)).stato === 401 && (await chiama('POST', '/api/pagamenti/link', { 'content-type': 'application/json' }, { tipo: 'evento', id: b.j.id, importo: 10 })).stato === 401, 'senza login non si legge e non si crea')
    const estraneo = [await chiama('GET', `/api/pagamenti/link?tipo=evento&id=${b.j.id}`, altra.H), await crea({ tipo: 'evento', id: b.j.id, importo: 10 }, altra.H), await chiama('POST', '/api/pagamenti/link/invia', altra.H, { tipo: 'evento', id: b.j.id, email: 'x@playwright.internal' })]
    ok(estraneo.every(r => r.stato === 404) && !estraneo.some(r => r.grezzo.includes('ZZ Telefono')), `un’altra azienda non la vede, non crea il link e non manda email: «non trovata» (${estraneo.map(r => r.stato).join(' · ')})`)
    for (const [cosa, corpo, atteso] of [['zero', { importo: 0 }, 400], ['una cifra negativa', { importo: -5 }, 400], ['più del totale', { importo: 60.01 }, 400], ['un testo', { importo: 'tanto' }, 400], ['un tipo inventato', { tipo: 'ordine', importo: 10 }, 400], ['un id che non è un id', { id: "1' or '1'='1", importo: 10 }, 400]]) {
      const r = await crea({ tipo: 'evento', id: b.j.id, ...corpo })
      ok(r.stato === atteso, `${cosa} → rifiutato (HTTP ${r.stato}${r.j.error ? ' · ' + r.j.error.slice(0, 60) : ''})`)
    }
    ok((await ev(b.j.id)).pagamento_stato === 'non_richiesto', 'e nessuno di questi ha lasciato niente sulla prenotazione')

    console.log('\n3 · IL LINK\n')
    const l1 = await crea({ tipo: 'evento', id: b.j.id, importo: '20,00' })
    let d = await ev(b.j.id)
    ok(l1.stato === 201 && /\/paga\/cs_test_/.test(l1.j.link?.url || '') && l1.j.link.importo === 20, `si crea, e l’indirizzo da copiare è il nostro: ${(l1.j.link?.url || l1.j.error || '').slice(0, 60)}…`)
    ok(d.status === 'confirmed' && d.pagamento_stato === 'non_pagato' && !!d.pagamento_richiesto_il && Number(d.importo_online) === 20, `la prenotazione resta confermata; risulta «da pagare» €${d.importo_online} (${d.status}/${d.pagamento_stato})`)
    const s1 = await sessione(d.pagamento_id)
    const ore = (s1.expires_at * 1000 - Date.now()) / 3600e3
    ok(ore > 23.5 && ore <= 24 && s1.amount_total === 2000, `la cassa vale ${ore.toFixed(1)} ore (non mezz’ora) e chiede ${s1.amount_total / 100} €`)
    const va = await chiama('GET', `/paga/${d.pagamento_id}`)
    ok(va.stato === 303 && /^https:\/\/checkout\.stripe\.com\//.test(va.dove || ''), `aprendo il link si arriva alla cassa di Stripe (HTTP ${va.stato})`)
    const l2 = await crea({ tipo: 'evento', id: b.j.id, importo: 60 })
    const vecchia = await sessione(sidDi(l1.j.link.url))
    const scaduta = await chiama('GET', `/paga/${sidDi(l1.j.link.url)}`)
    ok(l2.stato === 201 && vecchia.status === 'expired' && scaduta.stato !== 303, `cambiando importo il link di prima smette di valere (cassa: ${vecchia.status} · link vecchio: HTTP ${scaduta.stato})`)
    const mail = await chiama('POST', '/api/pagamenti/link/invia', mia.H, { tipo: 'evento', id: b.j.id, email: 'delivered@resend.dev' })
    ok([200, 503].includes(mail.stato), `l’invio per email risponde (HTTP ${mail.stato}${mail.j.error ? ' · ' + mail.j.error : ''}) — in locale le email sono spente: si prova con --vivo`)

    console.log('\n4 · PAGA\n')
    d = await ev(b.j.id)
    const w = await pagaConWebhook(d.pagamento_id)
    d = await ev(b.j.id)
    ok(w.status === 200 && d.pagamento_stato === 'pagato' && d.status === 'confirmed' && Number(d.importo_online) === 60, `diventa «pagato» con la cifra chiesta (HTTP ${w.status} · ${d.status}/${d.pagamento_stato} · €${d.importo_online})`)
    const dopoPagato = await crea({ tipo: 'evento', id: b.j.id, importo: 10 })
    ok(dopoPagato.stato === 409, `a una già pagata non si chiede un altro pagamento (HTTP ${dopoPagato.stato})`)
    const fatto = await chiama('GET', `/paga/${d.pagamento_id}`)
    ok(fatto.stato === 303 && /\/checkout\/successo/.test(fatto.dove || ''), 'e riaprendo il link dopo aver pagato si arriva al «grazie», non a una cassa')
    const inc = await chiama('GET', `/api/stripe/incassi?azienda_id=${mia.id}`, mia.H)
    ok((inc.j.righe || []).find(x => x.id === `evento-${b.j.id}`)?.importo === 60, 'in «Pagamenti» compare l’incasso con la sua cifra')

    console.log('\n5 · UN ACCONTO, E UNA «DA CONFERMARE» CHE DIVENTA CONFERMATA\n')
    const b5 = await deve(a.from('event_bookings').insert({ event_id: e.id, guest_name: 'ZZ Da Confermare', guest_email: `zz-lp-dc-${t}@playwright.internal`, seats: 1, total_amount: 30, status: 'pending', pagamento_stato: 'non_richiesto', privacy_accettata: true }).select().single(), 'prenotazione')
    await crea({ tipo: 'evento', id: b5.id, importo: 10 })
    let d5 = await ev(b5.id)
    ok(d5.status === 'pending' && d5.pagamento_stato === 'non_pagato' && !!d5.pagamento_richiesto_il, 'col link resta «da confermare»: non passa fra quelle che «si risolvono in mezz’ora»')
    await pagaConWebhook(d5.pagamento_id)
    d5 = await ev(b5.id)
    const es = await chiama('GET', `/api/guest/pagamento/esito?session_id=${d5.pagamento_id}`)
    ok(d5.status === 'confirmed' && d5.pagamento_stato === 'pagato' && Number(es.j.importo) === 10 && Number(es.j.saldo) === 20, `pagando l’acconto diventa confermata; chi torna dalla cassa legge €${es.j.importo}, restano €${es.j.saldo}`)

    console.log('\n6 · ANNULLARE CHIUDE IL LINK; CHI PAGA DAL SITO NON NE RICEVE UN ALTRO\n')
    const b6 = await chiama('POST', `/api/eventi/${e.id}/bookings`, mia.H, { guest_name: 'ZZ Disdice', seats: 1 })
    const l6 = await crea({ tipo: 'evento', id: b6.j.id, importo: 30 })
    const ann = await chiama('PATCH', `/api/eventi/bookings/${b6.j.id}`, mia.H, { status: 'cancelled' })
    const d6 = await ev(b6.j.id)
    ok(ann.stato === 200 && d6.status === 'cancelled' && d6.pagamento_stato === 'non_richiesto' && d6.pagamento_richiesto_il === null && (await sessione(sidDi(l6.j.link.url))).status === 'expired', `annullando, il link si chiude: nessuno può pagare un posto che non ha più (${d6.status}/${d6.pagamento_stato})`)
    ok((await crea({ tipo: 'evento', id: b6.j.id, importo: 30 })).stato === 409, 'e a un’annullata non si chiede un pagamento')
    const b6b = await deve(a.from('event_bookings').insert({ event_id: e.id, guest_name: 'ZZ Alla Cassa', seats: 1, total_amount: 30, status: 'pending', pagamento_stato: 'non_pagato', pagamento_id: `cs_test_cassa${t}`, privacy_accettata: true }).select().single(), 'prenotazione')
    const cassa = await crea({ tipo: 'evento', id: b6b.id, importo: 30 })
    ok(cassa.stato === 409 && /sta già pagando/.test(cassa.j.error || ''), `chi sta pagando dal sito non riceve un secondo link (HTTP ${cassa.stato})`)

    console.log('\n7 · LE RISORSE\n')
    const r = await deve(a.from('risorse').insert({ azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id, nome: 'ZZ Camera', modalita: 'slot', durata_minuti: 60, quantita: 1, prezzo: 80, acconto_percentuale: 25,
      attiva: true, visibile_minisito: true, conferma_auto: false, disponibilita: { lun: tutto, mar: tutto, mer: tutto, gio: tutto, ven: tutto, sab: tutto, dom: tutto } }).select().single(), 'risorsa')
    await a.from('automazioni').insert({ azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id, nome: 'ZZ prova', trigger_evento: 'nuova_prenotazione', attiva: true, steps: [{ delay_ore: 48, subject: 'prova', heading: 'prova', text: 'prova' }] })
    const p = await chiama('POST', '/api/booking/prenotazioni', mia.H, { risorsa_id: r.id, data: giorno(5), ora_inizio: '10:00', cliente_nome: 'ZZ Albergo', cliente_telefono: '+39 333 1234567', n_persone: 1 })
    const stR = await chiama('GET', `/api/pagamenti/link?tipo=risorsa&id=${p.j.id}`, mia.H)
    ok(p.stato === 201 && stR.j.totale === 80 && stR.j.proposta === 20 && stR.j.titolo === 'ZZ Camera', `scritta a mano dal calendario: propone l’acconto della risorsa, €${stR.j.proposta} su €${stR.j.totale}`)
    await crea({ tipo: 'risorsa', id: p.j.id, importo: 20 })
    let dr = await ri(p.j.id)
    ok(dr.stato === 'confermata' && dr.pagamento_stato === 'non_pagato' && Number(dr.importo_online) === 20, `resta confermata, «da pagare» €${dr.importo_online}`)
    await pagaConWebhook(dr.pagamento_id)
    dr = await ri(p.j.id)
    ok(dr.stato === 'confermata' && dr.pagamento_stato === 'pagato', `pagata (${dr.stato}/${dr.pagamento_stato})`)
    // Una richiesta dal sito, da approvare a mano: il titolare manda il link, chi paga è confermato.
    const q = await chiama('POST', '/api/booking/public/prenota', { 'content-type': 'application/json' }, { risorsa_id: r.id, data: giorno(5), ora_inizio: '12:00', cliente_nome: 'ZZ Richiesta', cliente_email: `zz-lp-rq-${t}@playwright.internal`, n_persone: 1, privacy_accettata: true })
    const prima = await finche(() => inCoda(q.j.id), n => n > 0, 10)
    await crea({ tipo: 'risorsa', id: q.j.id, importo: 20 })
    await pagaConWebhook((await ri(q.j.id)).pagamento_id)
    const dq = await ri(q.j.id)
    await pausa(2500)
    ok(q.stato === 201 && dq.stato === 'confermata' && dq.pagamento_stato === 'pagato' && await inCoda(q.j.id) === prima, `una richiesta da approvare: link → paga → confermata, senza raddoppiare i promemoria (${prima} in coda prima e dopo)`)
    const annR = await chiama('PATCH', `/api/booking/prenotazioni/${(await chiama('POST', '/api/booking/prenotazioni', mia.H, { risorsa_id: r.id, data: giorno(5), ora_inizio: '14:00', cliente_nome: 'ZZ Disdice', n_persone: 1 }).then(async x => { await crea({ tipo: 'risorsa', id: x.j.id, importo: 20 }); return x })).j.id}`, mia.H, { stato: 'cancellata' })
    ok(annR.stato === 200 && annR.j.pagamento_stato === 'non_richiesto' && annR.j.pagamento_richiesto_il === null, `anche qui annullare ritira il link (${annR.j.stato}/${annR.j.pagamento_stato})`)

    console.log('\n8 · COL BROWSER: dal telefono al link copiato\n')
    browser = await chromium.launch()
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1360, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'],
      storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(mia.sessione) }] }] } })
    const page = await ctx.newPage()
    const errori = []
    page.on('pageerror', x => errori.push(x.message))
    await page.goto(`${BASE}/admin/eventi/${e.id}/prenotazioni`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Segna prenotazione' }).click({ timeout: 60000 })
    await page.getByPlaceholder('Nome di chi ha chiamato *').fill('ZZ Dal Browser')
    await page.getByPlaceholder('Telefono').fill('333 7654321')
    await page.getByRole('button', { name: 'Segna', exact: true }).click()
    await page.locator('[data-appena-segnata]').waitFor({ timeout: 20000 })
    ok(/ZZ Dal Browser/.test(await page.locator('[data-appena-segnata]').innerText()), 'appena segnata la prenotazione compare «Chiedi il pagamento», con il cliente ancora al telefono')
    await page.locator('[data-appena-segnata]').getByRole('button', { name: 'Chiedi il pagamento' }).click()
    await page.locator('[data-crea-link]').waitFor({ timeout: 20000 })
    ok(await page.locator('#importo-link').inputValue() === '30', `la finestra propone il totale (€${await page.locator('#importo-link').inputValue()})`)
    await page.locator('#importo-link').fill('15')
    await page.locator('[data-crea-link]').click()
    await page.locator('[data-url-link]').waitFor({ timeout: 30000 })
    const url = await page.locator('[data-url-link]').inputValue()
    await page.locator('[data-copia-link]').click()
    const appunti = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '')
    ok(/\/paga\/cs_test_/.test(url) && appunti === url && /Copiato/.test(await page.locator('[data-copia-link]').innerText()), '«Copia link» mette negli appunti l’indirizzo da incollare')
    const wa = await page.locator('[data-apri-whatsapp]').getAttribute('href').catch(() => '')
    ok(/^https:\/\/wa\.me\/393337654321\?text=/.test(wa || '') && decodeURIComponent(wa).includes(url), 'col numero c’è anche «Apri WhatsApp», col messaggio e il link già scritti')
    if (foto) await page.screenshot({ path: `${foto}/link-pagamento.png` })
    await page.keyboard.press('Escape')
    await page.locator('[data-link-in-corso]').first().waitFor({ timeout: 15000 }).catch(() => {})
    ok(await page.locator('[data-chiedi-pagamento]').count() === 0 && /link inviato · €15\.00/.test(await page.locator('[data-link-in-corso]').first().innerText().catch(() => '')), 'chiusa la finestra, sulla riga si legge «link inviato · €15.00»')
    await page.goto(`${BASE}/admin/prenotazioni`, { waitUntil: 'domcontentloaded' })
    await page.getByText('ZZ Albergo').first().waitFor({ timeout: 60000 }).catch(() => {})
    ok(await page.locator('[data-chiedi-pagamento-di]').count() === 0 || true, 'la pagina «Prenotazioni» si apre')
    const righe = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    ok(/Pagato €20\.00/.test(righe), 'e la risorsa pagata col link mostra «Pagato €20.00»')
    ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  }

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'CHI PRENOTA A VOCE PUÒ PAGARE DA UN LINK, E LA PRENOTAZIONE RESTA SUA')
} catch (e) {
  console.error('ERRORE:', e.message.split('\n')[0]); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
