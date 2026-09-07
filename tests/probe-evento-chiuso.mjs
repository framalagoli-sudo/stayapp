// Quando non si può più prenotare, si vede — e non si può.
//
// ⛔ Il modulo restava aperto anche a posti finiti: si compilava nome, email,
// telefono e la spunta privacy, si premeva, e solo allora arrivava «posti non
// disponibili». Con una campagna a pagamento sopra è il modo peggiore di
// spendere un clic, e di trattare una persona.
//
// Due motivi diversi di non poter prenotare, due frasi diverse:
//   · il titolare ha chiuso  → «Prenotazioni chiuse» + il suo messaggio
//   · i posti sono finiti    → «Tutto esaurito»
//
// ⚠️ Ambiente tutto finto. E si prova anche il **caso ostile**: nascondere il
// modulo ferma chi guarda la pagina, non chi manda una richiesta a mano.
//
// Uso: cd tests && node probe-evento-chiuso.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const aziende = [], entitaCreate = [], eventiCreati = []

const prenota = async (id) => {
  const r = await fetch(`${L}/api/guest/eventi/${id}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'ZZ Tentativo', guest_email: `zz-${Date.now()}@playwright.internal`,
      seats: 1, privacy_accettata: true,
    }),
  })
  return { status: r.status, body: await r.json() }
}

try {
  // ⚠️ Senza le colonne della 110, l'update più sotto fallisce **in blocco** —
  // compreso `seats_total` — e quattro controlli cadono in fila sembrando
  // quattro difetti del codice. Lo erano di una migration non eseguita.
  const { error: eCol } = await admin.from('eventi').select('prenotazioni_chiuse').limit(1)
  if (eCol) {
    console.log('\n⛔ Mancano le colonne `prenotazioni_chiuse`.')
    console.log('   Esegui `supabase/migrations/110_eventi_prenotazioni_chiuse.sql` e rilancia.')
    console.log('   (non è un difetto del codice: è un pezzo dell\'impianto che non c\'è ancora)\n')
    process.exitCode = 2
    throw new Error('migration 110 mancante')
  }

  const t = Date.now()
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-CHIUSO-${t}`, email: `zz-${t}@playwright.internal`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita')
    .insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale', slug: `zz-ch-${t}`, active: true }).select().single()
  entitaCreate.push(ent.id)
  const fra = new Date(); fra.setDate(fra.getDate() + 10)
  const { data: ev } = await admin.from('eventi').insert({
    azienda_id: az.id, entity_id: ent.id, entity_tipo: 'struttura',
    title: 'ZZ Serata di prova', slug: `zz-serata-${t}`, date_start: fra.toISOString(),
    price: 0, seats_total: 2, published: true, active: true,
  }).select().single()
  eventiCreati.push(ev.id)

  console.log('\n1 · APERTO: si prenota, e la pagina mostra il modulo\n')
  const p1 = await prenota(ev.id)
  ok(p1.status === 201, `la prima prenotazione riesce (HTTP ${p1.status})`)
  let html = await (await fetch(`${L}/eventi/${ev.id}`)).text()
  ok(!/Tutto esaurito|Prenotazioni chiuse/.test(html), 'la pagina non dice ancora nulla di chiuso')

  console.log('\n2 · POSTI FINITI: «Tutto esaurito», e non si prenota\n')
  const p2 = await prenota(ev.id)   // il secondo riempie (2 posti totali)
  ok(p2.status === 201, `il secondo posto si prende (HTTP ${p2.status})`)
  const p3 = await prenota(ev.id)
  ok(p3.status === 400, `il terzo viene rifiutato (HTTP ${p3.status}) — «${p3.body.error}»`)

  console.log('\n3 · IL TITOLARE CHIUDE A MANO\n')
  // Il caso di Garage 22: il locale è pieno ma il sistema conta ancora posti,
  // perché le prenotazioni al telefono non sono state segnate tutte.
  await admin.from('eventi').update({
    seats_total: 100,   // posti liberi secondo il sistema
    prenotazioni_chiuse: true,
    prenotazioni_chiuse_testo: 'Siamo al completo! Scrivici comunque: teniamo una lista d’attesa.',
  }).eq('id', ev.id)

  const p4 = await prenota(ev.id)
  ok(p4.status === 400, `non si prenota più, anche con posti liberi (HTTP ${p4.status})`)
  ok(/lista d’attesa/.test(p4.body.error || ''), `e il messaggio è quello del titolare: «${p4.body.error}»`)

  console.log('\n4 · CHI GUARDA LA PAGINA LO LEGGE, PRIMA DI COMPILARE\n')
  // ⚠️ La pagina è codice di browser: nell'HTML c'è l'involucro. Quello che si
  // può verificare da qui è che il dato ARRIVI — senza, la pagina non potrebbe
  // saperlo e mostrerebbe il modulo com'era.
  const api = await (await fetch(`${L}/api/guest/eventi/${ev.id}`)).json()
  ok(api.prenotazioni_chiuse === true, `la pagina riceve «chiuse» (${api.prenotazioni_chiuse})`)
  ok(!!api.prenotazioni_chiuse_testo, `e riceve il messaggio da mostrare`)

  console.log('\n5 · RIAPERTO: torna tutto come prima\n')
  await admin.from('eventi').update({ prenotazioni_chiuse: false }).eq('id', ev.id)
  const p5 = await prenota(ev.id)
  ok(p5.status === 201, `si torna a prenotare (HTTP ${p5.status})`)

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'CHI NON PUÒ PRENOTARE LO SCOPRE PRIMA DI COMPILARE')
} catch (e) {
  if (e.message !== 'migration 110 mancante') { console.error('ERRORE:', e.message); problemi++ }
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
