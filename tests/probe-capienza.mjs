// A2 — la capienza è un limite vero?
//
// Comportamento atteso (definito con Francesco):
//   · non si prenota oltre il limite imposto
//   · su due richieste simultanee per l'ultimo posto vince chi arriva prima
//
// Il controllo "leggi i posti → decidi → inserisci" non è atomico: due richieste
// che arrivano insieme leggono lo stesso valore, passano entrambe e la capienza
// salta. Qui si misura con richieste davvero simultanee (Promise.all), perché in
// sequenza il difetto non si vede.
//
// Uso: node probe-capienza.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'

let problemi = 0
const esito = (ok, testo) => { console.log(`  ${ok ? '✓' : '✗'} ${testo}`); if (!ok) problemi++ }

// Le prove ripetute esauriscono il limite di frequenza e il 429 che ne segue
// sembra un difetto della capienza: qui si azzera il proprio contatore, così si
// misura quello che si vuole misurare. (Il limite in sé è verificato altrove,
// da probe-rate-limit.mjs.)
async function azzeraLimite(nome) {
  const { data } = await admin.from('rate_limits').select('key').like('key', `${nome}:%`)
  for (const r of data || []) await admin.from('rate_limits').delete().eq('key', r.key)
}

let az = null, entita = null, evento = null, risorsa = null

try {
  const { data: a } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-CAP-${Date.now()}`, email: 'zz-probe@playwright.internal' }).select().single()
  az = a.id
  const { data: e } = await admin.from('properties')
    .insert({ azienda_id: az, slug: `zz-cap-${Date.now()}`, name: 'Struttura prova', active: true, email: 'zz-probe@playwright.internal' })
    .select().single()
  entita = e

  // ── 1. Evento con UN SOLO posto, 4 richieste simultanee ────────────────────
  await azzeraLimite('evento-book')
  console.log('\n[1] evento con 1 solo posto — 4 prenotazioni simultanee')
  const { data: ev } = await admin.from('eventi').insert({
    azienda_id: az, entity_tipo: 'struttura', entity_id: entita.id,
    title: `ZZ-CAP-EV-${Date.now()}`, slug: `zz-cap-ev-${Date.now()}`,
    date_start: new Date(Date.now() + 7 * 864e5).toISOString(),
    seats_total: 1, seats_booked: 0, price: 0, active: true, published: true,
  }).select().single()
  evento = ev

  const prenotaEvento = (i) => fetch(`${BASE}/api/guest/eventi/${ev.id}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_name: `Probe ${i}`, guest_email: `probe${i}@playwright.internal`, seats: 1 }),
  }).then(r => r.status)

  const esiti = await Promise.all([0, 1, 2, 3].map(prenotaEvento))
  const accettate = esiti.filter(s => s < 300).length
  console.log(`     esiti: ${esiti.join(', ')}`)

  const { data: bk } = await admin.from('event_bookings').select('seats, status').eq('event_id', ev.id)
  const postiPresi = (bk || []).filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.seats || 1), 0)
  console.log(`     posti effettivamente occupati: ${postiPresi} su 1`)
  esito(accettate === 1 && postiPresi === 1,
    accettate === 1 ? 'vince una sola richiesta, come deve essere'
                    : `${accettate} richieste accettate e ${postiPresi} posti occupati su 1 — CAPIENZA SFONDATA`)

  // ── 2. Risorsa booking: stesso slot prenotato più volte ────────────────────
  await azzeraLimite('booking-prenota')
  console.log('\n[2] risorsa con capienza 1 — stesso slot, 3 prenotazioni simultanee')
  const { data: ri } = await admin.from('risorse').insert({
    azienda_id: az, entity_tipo: 'struttura', entity_id: entita.id,
    nome: `ZZ-CAP-RIS-${Date.now()}`, modalita: 'slot', durata_minuti: 60,
    quantita: 1, prezzo: 0, attiva: true, conferma_auto: true,
    disponibilita: { lun: [['09:00', '18:00']], mar: [['09:00', '18:00']], mer: [['09:00', '18:00']],
                     gio: [['09:00', '18:00']], ven: [['09:00', '18:00']], sab: [['09:00', '18:00']], dom: [['09:00', '18:00']] },
  }).select().single()
  risorsa = ri

  const giorno = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)
  const prenotaSlot = (i) => fetch(`${BASE}/api/booking/public/prenota`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      risorsa_id: ri.id, data: giorno, ora_inizio: '10:00',
      cliente_nome: `Probe ${i}`, cliente_email: `probe-slot${i}@playwright.internal`, n_persone: 1,
    }),
  }).then(r => r.status)

  const esiti2 = await Promise.all([0, 1, 2].map(prenotaSlot))
  console.log(`     esiti: ${esiti2.join(', ')}`)
  const { data: pren } = await admin.from('prenotazioni')
    .select('id, stato').eq('risorsa_id', ri.id).eq('data', giorno).eq('ora_inizio', '10:00')
  const attive = (pren || []).filter(p => p.stato !== 'cancellata').length
  console.log(`     prenotazioni attive sullo stesso slot: ${attive}`)
  esito(attive <= 1, attive <= 1 ? 'lo slot accetta una sola prenotazione'
                                 : `${attive} prenotazioni sullo STESSO slot da 1 posto — nessun controllo`)

  // ── 3. Non-regressione: se i posti bastano, devono passare tutti ───────────
  await azzeraLimite('evento-book')
  console.log('\n[3] evento con 5 posti — 3 prenotazioni simultanee (devono passare tutte)')
  const { data: ev2 } = await admin.from('eventi').insert({
    azienda_id: az, entity_tipo: 'struttura', entity_id: entita.id,
    title: `ZZ-CAP-OK-${Date.now()}`, slug: `zz-cap-ok-${Date.now()}`,
    date_start: new Date(Date.now() + 8 * 864e5).toISOString(),
    seats_total: 5, seats_booked: 0, price: 0, active: true, published: true,
  }).select().single()

  const esiti3 = await Promise.all([0, 1, 2].map(i => fetch(`${BASE}/api/guest/eventi/${ev2.id}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_name: `Libero ${i}`, guest_email: `libero${i}@playwright.internal`, seats: 1 }),
  }).then(r => r.status)))
  const ok3 = esiti3.filter(s => s < 300).length
  console.log(`     esiti: ${esiti3.join(', ')}`)
  const { data: bk2 } = await admin.from('event_bookings').select('seats').eq('event_id', ev2.id)
  console.log(`     prenotazioni registrate: ${(bk2 || []).length}`)
  esito(ok3 === 3 && (bk2 || []).length === 3,
    ok3 === 3 ? 'con posti sufficienti passano tutte: nessuna prenotazione persa'
              : `solo ${ok3} su 3 accettate — il controllo rifiuta prenotazioni legittime`)
  await admin.from('event_bookings').delete().eq('event_id', ev2.id)
  await admin.from('eventi').delete().eq('id', ev2.id)

  console.log('\n' + '─'.repeat(62))
  console.log(problemi ? `${problemi} PROBLEMI DA GUARDARE` : 'NESSUN PROBLEMA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  if (evento) await admin.from('event_bookings').delete().eq('event_id', evento.id)
  if (risorsa) await admin.from('prenotazioni').delete().eq('risorsa_id', risorsa.id)
  if (az) {
    await admin.from('eventi').delete().eq('azienda_id', az)
    await admin.from('risorse').delete().eq('azienda_id', az)
    await admin.from('contatti').delete().eq('azienda_id', az)
    if (entita) await admin.from('properties').delete().eq('id', entita.id)
    const { error } = await admin.from('aziende').delete().eq('id', az)
    if (error) console.error('pulizia azienda:', error.message)
    console.log('[probe] dati di prova eliminati')
  }
  process.exit(problemi ? 1 : 0)
}
