// Prenotazione di un evento con pagamento: chi non paga non è prenotato.
//
// Nata dalla segnalazione di Francesco su Garage 22 (01/10/2026): chi apriva la
// cassa di Stripe e non pagava restava «confermato» e occupava posti veri —
// 17 su 60 per una serata — e il titolare riceveva «Nuova prenotazione».
//
// Solo in LOCALE (TEST_URL=http://localhost:…), con il server avviato così:
//   RESEND_API_KEY= CRON_SECRET=<qualcosa> npm run dev
// Nessuna email parte e la cassa vera di Stripe non si apre: la parte «paga»
// la fa un webhook firmato con il segreto di test di .env.local.
// ⚠️ Non chiama MAI lo scheduler delle automazioni: lavorerebbe sulla coda vera.
//
// Uso: CRON_SECRET=<lo stesso> TEST_URL=http://localhost:3001 node probe-eventi-pagamento.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { createRequire } from 'module'
import fs from 'fs'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const BASE = process.env.TEST_URL
if (!/localhost|127\.0\.0\.1/.test(BASE || '')) { console.error('Solo in locale: TEST_URL=http://localhost:…'); process.exit(2) }
const CRON = process.env.CRON_SECRET
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const require = createRequire(import.meta.url)
const Stripe = require('../client-next/node_modules/stripe')
const localEnv = Object.fromEntries(fs.readFileSync('../client-next/.env.local', 'utf8').split(/\r?\n/).filter(l => l.includes('='))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SEGRETO = localEnv.STRIPE_WEBHOOK_SECRET
const stripe = new Stripe(localEnv.STRIPE_SECRET_KEY || 'sk_test_x')

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const pausa = ms => new Promise(r => setTimeout(r, ms))
const prenotazione = id => a.from('event_bookings').select('status, pagamento_stato').eq('id', id).single().then(r => r.data)
const inCoda = id => a.from('automazioni_log').select('id', { count: 'exact', head: true }).eq('source_id', id).then(r => r.count || 0)

async function pagaConWebhook(sessionId) {
  const payload = JSON.stringify({ id: `evt_probe_${Date.now()}`, object: 'event', type: 'checkout.session.completed',
    data: { object: { id: sessionId, object: 'checkout.session', payment_intent: 'pi_probe', payment_status: 'paid' } } })
  const firma = stripe.webhooks.generateTestHeaderString({ payload, secret: SEGRETO })
  return fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', headers: { 'stripe-signature': firma, 'content-type': 'application/json' }, body: payload })
}

let aziendaId = null
try {
  const tag = Date.now()
  const { data: az, error: e1 } = await a.from('aziende').insert({ ragione_sociale: `ZZ-PAGAMENTI-${tag}`, require_2fa: false, moduli: { ristorante: true } }).select().single()
  if (e1) throw new Error('azienda: ' + e1.message)
  aziendaId = az.id
  const { data: ent, error: e2 } = await a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale prova', slug: `zz-pagamenti-${tag}`, active: true }).select().single()
  if (e2) throw new Error('entità: ' + e2.message)
  const { data: ev, error: e3 } = await a.from('eventi').insert({
    azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, title: 'ZZ Serata di prova', slug: `zz-serata-${tag}`,
    date_start: new Date(Date.now() + 10 * 86400000).toISOString(), price: 10, seats_total: 10,
    published: true, active: true, notify_owner_on_booking: true,
  }).select().single()
  if (e3) throw new Error('evento: ' + e3.message)
  await a.from('automazioni').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, nome: 'ZZ prova', trigger_evento: 'nuova_prenotazione', attiva: true,
    steps: [{ delay_ore: 48, subject: 'prova', heading: 'prova', text: 'prova' }] })

  console.log('\n1. NESSUN CONTO STRIPE → la prenotazione si paga sul posto ed è subito vera')
  const r = await fetch(`${BASE}/api/guest/eventi/${ev.id}/book`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ guest_name: 'Prova', guest_email: `zz-pag-${tag}@playwright.internal`, seats: 1, privacy_accettata: true }) })
  const j = await r.json()
  ok(r.status === 201 && !j.pagamento, `prenotazione accettata senza cassa (HTTP ${r.status})`)
  await pausa(3000)
  const p1 = await prenotazione(j.id)
  ok(p1?.status === 'confirmed', `nasce confermata (stato: ${p1?.status})`)
  ok(await inCoda(j.id) > 0, 'l\'automazione «nuova prenotazione» è in coda')

  console.log('\n2. CASSA APERTA DA PIÙ DI 30 MINUTI, MAI PAGATA')
  const sid = `cs_test_probe_${tag}`
  const { data: b2 } = await a.from('event_bookings').insert({ event_id: ev.id, guest_name: 'Non paga', guest_email: `zz-np-${tag}@playwright.internal`,
    seats: 2, total_amount: 20, status: 'pending', pagamento_stato: 'non_pagato', pagamento_id: sid,
    created_at: new Date(Date.now() - 40 * 60000).toISOString(), privacy_accettata: true }).select().single()
  ok(await inCoda(b2.id) === 0, 'finché non paga nessuna automazione in coda')
  if (CRON) {
    const c = await fetch(`${BASE}/api/cron/prenotazioni-scadute`, { headers: { Authorization: `Bearer ${CRON}` } }).then(x => x.json())
    const mio = (c.motivi || []).find(m => m.startsWith(b2.id))
    ok(!!mio, `il cron dice perché non riesce a verificarla: «${(mio || '').slice(38, 140)}»`)
    ok((await prenotazione(b2.id))?.status === 'pending', 'nel dubbio non la annulla (resta in attesa)')
  } else console.log('  · cron non provato: manca CRON_SECRET')

  console.log('\n3. ARRIVA IL PAGAMENTO (webhook firmato)')
  const w = await pagaConWebhook(sid)
  ok(w.status === 200, `webhook accettato (HTTP ${w.status})`)
  const p3 = await prenotazione(b2.id)
  ok(p3?.status === 'confirmed' && p3?.pagamento_stato === 'pagato', `diventa confermata e pagata (${p3?.status}/${p3?.pagamento_stato})`)
  ok(await inCoda(b2.id) > 0, 'solo adesso l\'automazione entra in coda')
  const w2 = await pagaConWebhook(sid)
  const dopo = await a.from('automazioni_log').select('id', { count: 'exact', head: true }).eq('source_id', b2.id)
  ok(w2.status === 200 && dopo.count === (await inCoda(b2.id)), 'lo stesso webhook ripetuto non duplica niente')

  console.log('\n4. PAGAMENTO SU UNA PRENOTAZIONE GIÀ ANNULLATA')
  const sid4 = `cs_test_probe4_${tag}`
  const { data: b4 } = await a.from('event_bookings').insert({ event_id: ev.id, guest_name: 'Tardi', guest_email: `zz-t-${tag}@playwright.internal`,
    seats: 1, total_amount: 10, status: 'cancelled', pagamento_stato: 'non_pagato', pagamento_id: sid4, privacy_accettata: true }).select().single()
  await pagaConWebhook(sid4)
  const p4 = await prenotazione(b4.id)
  ok(p4?.status === 'cancelled', `resta annullata (${p4?.status}) — e il titolare riceve un avviso da rimborsare`)
  ok(await inCoda(b4.id) === 0, 'nessuna automazione per una prenotazione annullata')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (aziendaId) await cancellaAziendaDiProva(aziendaId)
  console.log('\n[probe] dati di prova cancellati')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nCHI NON PAGA NON È PRENOTATO; CHI PAGA LO DIVENTA, UNA VOLTA SOLA')
  process.exit(problemi ? 1 : 0)
}
