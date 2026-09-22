// Correggere e cancellare una prenotazione, provate contro il sistema vivo.
//
// Nate dal caso di Garage 22 (22/09/2026): una persona ha prenotato per **15**
// invece che per 5, e l'unico rimedio era annullare e riscrivere tutto a mano.
//
// La sonda lavora su un evento **suo**, creato e cancellato qui dentro: non
// tocca mai una prenotazione di un cliente. Le email dell'evento restano spente.
//
//   node probe-prenotazione-correzione.mjs
//   TEST_URL=http://localhost:3000 node probe-prenotazione-correzione.mjs

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { config } from 'dotenv'
config({ path: '.env.test' })

const TEST_URL = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const URL_SB = (process.env.SUPABASE_URL || '').replace(/^﻿/, '').trim()
const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } })
const anon = createClient(URL_SB, process.env.SUPABASE_ANON_KEY.trim(), { auth: { persistSession: false } })

const esiti = []
const prova = (ok, testo, extra = '') => {
  esiti.push(ok)
  console.log(`  ${ok ? '✓' : '✗'} ${testo}${extra ? ' — ' + extra : ''}`)
}

let userId = null, eventoId = null
try {
  console.log(`\nCORREGGERE UNA PRENOTAZIONE — ${TEST_URL}\n`)

  // ── un utente effimero (il dominio finto è l'unico che può essere super_admin)
  const email = `probe-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: creato, error: e1 } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (e1) throw new Error('createUser: ' + e1.message)
  userId = creato.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'super_admin', full_name: 'Probe' }, { onConflict: 'id' })
  const { data: sessione, error: e2 } = await anon.auth.signInWithPassword({ email, password })
  if (e2) throw new Error('signIn: ' + e2.message)
  const H = { Authorization: `Bearer ${sessione.session.access_token}`, 'Content-Type': 'application/json' }

  // ── un evento di prova, con le email spente: nessuno riceve niente
  const { data: ent } = await admin.from('entita').select('id, tipo, azienda_id').eq('slug', 'struttura-test').single()
  const { data: ev, error: e3 } = await admin.from('eventi').insert({
    title: 'ZZ sonda correzione (cancellare)', slug: 'zz-corr-' + Date.now().toString(36),
    date_start: new Date(Date.now() + 86400000 * 30).toISOString(),
    price: 10, prezzo_modo: 'cifra', seats_total: 20, posti_riservati: 0,
    active: true, published: true, notify_owner_on_booking: false, send_guest_confirmation: false,
    entity_tipo: ent.tipo, entity_id: ent.id, azienda_id: ent.azienda_id,
  }).select('id').single()
  if (e3) throw new Error('evento: ' + e3.message)
  eventoId = ev.id

  const { data: pren } = await admin.from('event_bookings').insert({
    event_id: eventoId, guest_name: 'ZZ Prova', guest_email: 'prova@example.com',
    seats: 15, total_amount: 150, status: 'confirmed', privacy_accettata: true,
  }).select('id').single()
  await fetch(`${TEST_URL}/api/eventi/${eventoId}`, { headers: H })   // scalda la route

  const postiEvento = async () => (await admin.from('eventi').select('seats_booked').eq('id', eventoId).single()).data.seats_booked
  const laPrenotazione = async () => (await admin.from('event_bookings').select('*').eq('id', pren.id).maybeSingle()).data

  // ── 1. il caso vero: 15 → 5
  const r1 = await fetch(`${TEST_URL}/api/eventi/bookings/${pren.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ seats: 5 }) })
  const b1 = await laPrenotazione()
  prova(r1.status === 200 && b1.seats === 5, 'i posti si correggono da 15 a 5', `stato ${r1.status}, posti ${b1?.seats}`)
  prova(b1?.total_amount === 50, 'il totale si rifà dal prezzo dell\'evento (5 × 10 €)', `${b1?.total_amount} €`)
  prova(await postiEvento() === 5, 'i posti occupati dell\'evento seguono la correzione', `occupati ${await postiEvento()}`)

  // ── 2. i dati di contatto
  const r2 = await fetch(`${TEST_URL}/api/eventi/bookings/${pren.id}`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ guest_name: 'ZZ Corretto', guest_email: 'giusta@example.com', guest_phone: '3330000000' }),
  })
  const b2 = await laPrenotazione()
  prova(r2.status === 200 && b2.guest_email === 'giusta@example.com' && b2.guest_name === 'ZZ Corretto',
    'nome, email e telefono si correggono', `${b2?.guest_name} · ${b2?.guest_email}`)

  // ── 3. il caso ostile: più posti di quanti ce ne siano
  const r3 = await fetch(`${TEST_URL}/api/eventi/bookings/${pren.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ seats: 999 }) })
  const b3 = await laPrenotazione()
  prova(r3.status === 400 && b3.seats === 5, 'oltre la capienza viene rifiutato e nulla cambia', `stato ${r3.status}, posti ${b3?.seats}`)

  // ── 4. zero posti non è una prenotazione
  const r4 = await fetch(`${TEST_URL}/api/eventi/bookings/${pren.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ seats: 0 }) })
  prova(r4.status === 400, 'zero posti viene rifiutato', `stato ${r4.status}`)

  // ── 5. senza token non si tocca niente
  const r5 = await fetch(`${TEST_URL}/api/eventi/bookings/${pren.id}`, { method: 'DELETE' })
  prova(r5.status === 401 || r5.status === 403, 'senza autenticazione la cancellazione è negata', `stato ${r5.status}`)
  prova(!!(await laPrenotazione()), 'la prenotazione è ancora lì dopo il tentativo anonimo')

  // ── 6. la cancellazione vera
  const r6 = await fetch(`${TEST_URL}/api/eventi/bookings/${pren.id}`, { method: 'DELETE', headers: H })
  prova(r6.status === 200 && !(await laPrenotazione()), 'la prenotazione si cancella davvero', `stato ${r6.status}`)
  prova(await postiEvento() === 0, 'i posti tornano liberi dopo la cancellazione', `occupati ${await postiEvento()}`)

} catch (e) {
  console.log('\n⛔ la sonda si è fermata:', e.message)
  esiti.push(false)
} finally {
  if (eventoId) {
    await admin.from('event_bookings').delete().eq('event_id', eventoId)
    await admin.from('eventi').delete().eq('id', eventoId)
  }
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {})
  console.log('\n[pulizia] evento di prova e utente effimero eliminati')
}

const falliti = esiti.filter(x => !x).length
console.log(falliti ? `\n✗ ${falliti} controlli falliti su ${esiti.length}\n` : `\n✓ tutti i ${esiti.length} controlli passati\n`)
process.exit(falliti ? 1 : 0)
