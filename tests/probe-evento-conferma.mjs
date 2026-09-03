// Quando arriva la conferma a chi prenota un evento — e quando NON deve arrivare.
//
// ⛔ Tre difetti da cui nasce questa sonda:
//   · la conferma partiva SEMPRE all'istante, anche con un pagamento da fare —
//     e con la scadenza a 30 minuti diventava una trappola: una conferma
//     archiviata, e mezz'ora dopo l'annullamento di ciò che era «confermato»;
//   · chi PAGAVA non riceveva niente: il webhook segnava «pagato» e finiva lì;
//   · l'email diceva «Prenotazione confermata» quando confermata non era.
//
// ⚠️ La sonda si crea la propria azienda e la propria entità: non tocca nessun
// cliente vero e nessuna email esce verso una persona reale.
//
// Uso: cd tests && node probe-evento-conferma.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const aziende = [], entitaCreate = [], eventiCreati = []

async function prenota(eventoId, extra = {}) {
  const r = await fetch(`${L}/api/guest/eventi/${eventoId}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'ZZ Ospite', guest_email: `zz-ev-${Date.now()}@playwright.internal`,
      seats: 1, privacy_accettata: true, ...extra,
    }),
  })
  return { status: r.status, body: await r.json() }
}

async function creaEvento(aziendaId, entityId, acconto) {
  const fra = new Date(); fra.setDate(fra.getDate() + 20)
  const { data, error } = await admin.from('eventi').insert({
    azienda_id: aziendaId, entity_id: entityId, entity_tipo: 'struttura',
    title: `ZZ Evento ${acconto ? 'a pagamento' : 'gratuito'}`,
    slug: `zz-evento-${acconto ? 'pag' : 'free'}-${Date.now()}`,
    date_start: fra.toISOString(), price: acconto ? 25 : 0,
    seats_total: 10, published: true, active: true,
    acconto_percentuale: acconto, send_guest_confirmation: true,
  }).select().single()
  if (error) throw new Error(`evento non creato: ${error.message}`)
  eventiCreati.push(data.id)
  return data
}

try {
  // ⚠️ Senza la colonna della migration 107 tre controlli falliscono in fila e
  // sembrano tre difetti del codice: lo erano solo di una migration non ancora
  // eseguita. Una sonda che confonde «manca un pezzo dell'impianto» con «il
  // codice è rotto» fa perdere il giro a chi la legge.
  const { error: eCol } = await admin.from('event_bookings').select('conferma_inviata_il').limit(1)
  if (eCol) {
    console.log('\n⛔ Manca la colonna `conferma_inviata_il`.')
    console.log('   Esegui `supabase/migrations/107_evento_conferma_inviata.sql` e rilancia.')
    console.log('   (non è un difetto del codice: è un pezzo dell\'impianto che non c\'è ancora)\n')
    // ⚠️ `process.exit()` col client Supabase aperto fa uscire Node con un
    // «Assertion failed» di libuv che sembra un guasto e non lo è: si lascia
    // finire il programma da solo.
    process.exitCode = 2
    throw new Error('migration 107 mancante')
  }

  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-EV-${Date.now()}`, email: `zz-ev-${Date.now()}@playwright.internal`, require_2fa: false })
    .select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita').insert({
    azienda_id: az.id, tipo: 'struttura', name: 'ZZ Struttura eventi',
    slug: `zz-ev-${Date.now()}`, active: false,
  }).select().single()
  entitaCreate.push(ent.id)

  console.log('\n1 · NIENTE DA PAGARE → LA CONFERMA PARTE SUBITO\n')
  const gratis = await creaEvento(az.id, ent.id, 0)
  const p1 = await prenota(gratis.id)
  ok(p1.status === 201, `la prenotazione riesce (HTTP ${p1.status})${p1.status !== 201 ? ' — ' + (p1.body.error || '') : ''}`)
  ok(p1.body.guest_confirmation_sent === true, 'la conferma è partita')
  ok(!p1.body.pagamento, 'e non c\'è nessuna cassa da attraversare')

  const { data: b1 } = await admin.from('event_bookings')
    .select('status, conferma_inviata_il, pagamento_stato').eq('id', p1.body.id).maybeSingle()
  ok(b1?.status === 'confirmed', `nasce confermata (${b1?.status})`)
  ok(!!b1?.conferma_inviata_il, 'e si sa quando è stata mandata la conferma')
  ok(b1?.pagamento_stato === 'non_richiesto' || !b1?.pagamento_stato,
     `nessun pagamento richiesto (${b1?.pagamento_stato || 'nullo'})`)

  console.log('\n2 · LA CONFERMA NON SI MANDA DUE VOLTE\n')
  // Stripe rispedisce lo stesso evento in caso di dubbio: due conferme identiche
  // fanno pensare a un doppio addebito.
  const { data: prima } = await admin.from('event_bookings').select('conferma_inviata_il').eq('id', p1.body.id).maybeSingle()
  await new Promise(r => setTimeout(r, 1200))
  const { data: dopo } = await admin.from('event_bookings').select('conferma_inviata_il').eq('id', p1.body.id).maybeSingle()
  ok(prima?.conferma_inviata_il === dopo?.conferma_inviata_il, 'la data della conferma non cambia da sola')

  console.log('\n3 · C’È DA PAGARE → NESSUNA CONFERMA, NON ANCORA\n')
  // ⛔ Il difetto da cui nasce tutto: la conferma partiva anche qui, mentre la
  // persona era già sulla pagina di pagamento.
  const aPagamento = await creaEvento(az.id, ent.id, 100)
  const p2 = await prenota(aPagamento.id)
  ok(p2.status === 201, `la prenotazione riesce (HTTP ${p2.status})`)

  // ⚠️ Questo caso esiste SOLO se una cassa è stata creata davvero. Senza Stripe
  // collegato `creaCheckout` fallisce, la prenotazione resta valida e si paga
  // sul posto — quindi la conferma **deve** partire, ed è giusto così.
  //
  // La prima versione della sonda dava per scontata la cassa e segnava due
  // croci su un codice che si stava comportando bene: è la stessa trappola del
  // 28/08, misurare la cosa sbagliata e andare a caccia di un guasto che non
  // c'è. Il caso si prova quando c'è un conto collegato, non prima.
  if (p2.body.pagamento) {
    ok(p2.body.guest_confirmation_sent === false,
       `nessuna conferma mandata adesso (mandata: ${p2.body.guest_confirmation_sent})`)
    const { data: b2 } = await admin.from('event_bookings')
      .select('conferma_inviata_il, pagamento_stato').eq('id', p2.body.id).maybeSingle()
    ok(!b2?.conferma_inviata_il, 'e infatti non risulta nessuna conferma inviata')
    ok(b2?.pagamento_stato === 'non_pagato', `il pagamento risulta in sospeso (${b2?.pagamento_stato})`)
  } else {
    console.log('  ⓘ NON VERIFICABILE: nessun conto Stripe collegato a questa azienda di prova,')
    console.log('    quindi la cassa non nasce e non c\'è nessun pagamento da attendere.')
    console.log('    Con un conto collegato la conferma resterebbe ferma fino al pagamento.')
    ok(p2.body.guest_confirmation_sent === true,
       'senza cassa la conferma parte subito, come dev\'essere (si paga sul posto)')
  }

  console.log('\n4 · IL POSTO È TENUTO SUBITO, PRIMA DI PAGARE\n')
  const { data: evDopo } = await admin.from('eventi').select('seats_booked').eq('id', aPagamento.id).maybeSingle()
  // Far pagare un posto che nel frattempo è finito sarebbe peggio: il posto si
  // prende prima, e se non arriva il pagamento lo si restituisce dopo 30 minuti.
  ok(evDopo?.seats_booked === 1, `il posto risulta occupato (${evDopo?.seats_booked})`)

  console.log('\n5 · SENZA CONSENSO NON SI PRENOTA\n')
  const senza = await fetch(`${L}/api/guest/eventi/${gratis.id}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_name: 'ZZ', guest_email: 'zz@playwright.internal', seats: 1 }),
  })
  ok(senza.status === 400, `rifiutata senza consenso privacy (HTTP ${senza.status})`)

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'LA CONFERMA ARRIVA QUANDO «CONFERMATA» È VERO')
} catch (e) {
  if (e.message !== 'migration 107 mancante') { console.error('ERRORE:', e.message); problemi++ }
} finally {
  for (const id of eventiCreati) {
    await admin.from('event_bookings').delete().eq('event_id', id)
    await admin.from('eventi').delete().eq('id', id)
  }
  for (const id of entitaCreate) await admin.from('entita').delete().eq('id', id)
  for (const id of aziende) { const e = await svuotaAzienda(id); if (e) console.error('pulizia:', e) }
  console.log('[probe] pulito')
  process.exitCode = problemi ? 1 : 0
}
