// L'ultimo posto: quello che succede quando i posti stanno finendo davvero.
//
// Nata da una segnalazione di Francesco (22/09/2026): prenotando su un evento
// quasi pieno l'ospite vedeva `guestFetch /api/guest/eventi/…/book: 400` —
// cioè l'indirizzo della nostra API al posto di una spiegazione.
//
// Prova, su un evento creato e cancellato qui dentro:
//   · il 61° posto su 60 viene rifiutato, e il messaggio dice quanti ne restano
//   · l'ultimo posto si prenota davvero (il caso «59 al telefono e uno sul sito»)
//   · chi è in lista d'attesa NON occupa posti nel controllo anti-overbooking
//   · i posti riservati al telefono restano fuori dalla portata del pubblico
//
//   node probe-posti-ultimo.mjs
//   TEST_URL=http://localhost:3000 node probe-posti-ultimo.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const TEST_URL = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const admin = createClient(
  (process.env.SUPABASE_URL || '').replace(/^﻿/, '').trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } })

const esiti = []
const prova = (ok, testo, extra = '') => {
  esiti.push(ok)
  console.log(`  ${ok ? '✓' : '✗'} ${testo}${extra ? ' — ' + extra : ''}`)
}
// ⚠️ Il limite anti-abuso è 10 prenotazioni all'ora per indirizzo: a furia di
// rilanciare la sonda scatta, e un 429 NON è un guasto del prodotto. Dirlo
// invece di segnare una croce: un controllo che mente è peggio di uno assente.
function fermataDalLimite(r) {
  if (r.stato !== 429) return false
  console.log('  ⏸ limite anti-abuso raggiunto (10 prenotazioni/ora per IP): questo controllo non è stato misurato.')
  return true
}

const prenota = (id, seats, nome) => fetch(`${TEST_URL}/api/guest/eventi/${id}/book`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ guest_name: nome, guest_email: `${nome.replace(/\s/g, '').toLowerCase()}@example.com`, seats, privacy_accettata: true }),
}).then(async r => ({ stato: r.status, corpo: await r.json().catch(() => ({})) }))

let eventoId = null
try {
  console.log(`\nL'ULTIMO POSTO — ${TEST_URL}\n`)
  const { data: ent } = await admin.from('entita').select('id, tipo, azienda_id').eq('slug', 'struttura-test').single()

  const creaEvento = async (patch) => {
    if (eventoId) { await admin.from('event_bookings').delete().eq('event_id', eventoId); await admin.from('eventi').delete().eq('id', eventoId) }
    const { data } = await admin.from('eventi').insert({
      title: 'ZZ sonda ultimo posto (cancellare)', slug: 'zz-ultimo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date_start: new Date(Date.now() + 86400000 * 40).toISOString(),
      price: 0, prezzo_modo: 'gratuito', active: true, published: true,
      notify_owner_on_booking: false, send_guest_confirmation: false,
      entity_tipo: ent.tipo, entity_id: ent.id, azienda_id: ent.azienda_id, ...patch,
    }).select('id').single()
    eventoId = data.id
    return data.id
  }

  // ── 1. Il 61° su 60 ────────────────────────────────────────────────────────
  await creaEvento({ seats_total: 60, posti_riservati: 0, lista_attesa: false })
  await admin.from('event_bookings').insert({
    event_id: eventoId, guest_name: 'ZZ Gruppo', guest_email: 'gruppo@example.com',
    seats: 59, status: 'confirmed', privacy_accettata: true,
  })
  await admin.from('eventi').update({ seats_booked: 59 }).eq('id', eventoId)

  const r60 = await prenota(eventoId, 1, 'ZZ Sessantesimo')
  prova([200, 201].includes(r60.stato), 'il 60° posto si prenota', `stato ${r60.stato}`)

  const r61 = await prenota(eventoId, 1, 'ZZ Sessantunesimo')
  prova(r61.stato === 400, 'il 61° viene rifiutato', `stato ${r61.stato}`)
  prova(!/guestFetch|\/api\//.test(r61.corpo.error || ''), 'il messaggio non contiene indirizzi della nostra API', `«${r61.corpo.error}»`)
  prova(r61.corpo.posti_liberi === 0, 'la risposta dice che i posti liberi sono zero')

  // ── 2. «Ne hai chiesti più di quanti ne restano» ───────────────────────────
  await creaEvento({ seats_total: 10, posti_riservati: 0, lista_attesa: false })
  await admin.from('event_bookings').insert({
    event_id: eventoId, guest_name: 'ZZ Otto', guest_email: 'otto@example.com',
    seats: 8, status: 'confirmed', privacy_accettata: true,
  })
  await admin.from('eventi').update({ seats_booked: 8 }).eq('id', eventoId)
  const r4 = await prenota(eventoId, 4, 'ZZ Quattro')
  prova(r4.stato === 400 && /2 posti/.test(r4.corpo.error || ''), 'chiedendone 4 quando ne restano 2, il messaggio lo dice', `«${r4.corpo.error}»`)

  // ── 3. L'ultimo posto col telefono: 59 riservati, 1 online ─────────────────
  await creaEvento({ seats_total: 60, posti_riservati: 59, lista_attesa: true })
  const rUnico = await prenota(eventoId, 1, 'ZZ Unico')
  prova([200, 201].includes(rUnico.stato), 'con 59 posti tenuti per il telefono, l\'unico online si prenota', `stato ${rUnico.stato}`)
  const rDopo = await prenota(eventoId, 1, 'ZZ Tardivo')
  if (!fermataDalLimite(rDopo)) prova(rDopo.stato === 400 && /lista d'attesa/i.test(rDopo.corpo.error || ''),
    'il successivo trova esaurito e viene mandato in lista d\'attesa', `«${rDopo.corpo.error}»`)

  // ── 4. Chi è in lista d'attesa non occupa posti ────────────────────────────
  await creaEvento({ seats_total: 4, posti_riservati: 0, lista_attesa: true })
  await admin.from('event_bookings').insert([
    { event_id: eventoId, guest_name: 'ZZ Attesa 1', guest_email: 'a1@example.com', seats: 3, status: 'waitlist', privacy_accettata: true },
    { event_id: eventoId, guest_name: 'ZZ Attesa 2', guest_email: 'a2@example.com', seats: 3, status: 'waitlist', privacy_accettata: true },
  ])
  const rConAttesa = await prenota(eventoId, 3, 'ZZ Vero')
  const rimasta = (await admin.from('event_bookings').select('id').eq('event_id', eventoId).eq('guest_name', 'ZZ Vero')).data
  if (!fermataDalLimite(rConAttesa)) prova([200, 201].includes(rConAttesa.stato) && rimasta.length === 1,
    'sei posti in lista d\'attesa non rubano il posto a chi prenota davvero', `stato ${rConAttesa.stato}`)

} catch (e) {
  console.log('\n⛔ la sonda si è fermata:', e.message)
  esiti.push(false)
} finally {
  if (eventoId) {
    await admin.from('event_bookings').delete().eq('event_id', eventoId)
    await admin.from('eventi').delete().eq('id', eventoId)
  }
  const { data: c } = await admin.from('contatti').select('id').ilike('email', '%@example.com')
  if (c?.length) await admin.from('contatti').delete().in('id', c.map(x => x.id))
  console.log('\n[pulizia] evento di prova, prenotazioni e contatti eliminati')
}

const falliti = esiti.filter(x => !x).length
console.log(falliti ? `\n✗ ${falliti} controlli falliti su ${esiti.length}\n` : `\n✓ tutti i ${esiti.length} controlli passati\n`)
process.exit(falliti ? 1 : 0)
