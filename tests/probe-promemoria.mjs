// Il promemoria della prenotazione parte davvero?
//
// ⚠️ Il motore c'era già — `pre_visita` calcola *data della visita meno X ore* e
// programma l'invio — ma **nessuno l'ha mai acceso**: zero automazioni
// configurate, zero messaggi programmati in tutta la storia del progetto. Un
// codice mai eseguito non è codice che funziona: è codice che non ha ancora
// fallito.
//
// Si prova la catena intera senza aspettare ore: si prenota per domani con un
// promemoria a 24 ore, e si controlla che il messaggio venga **messo in coda
// all'istante giusto** — non che arrivi, perché arriverà domani.
//
// Uso: TEST_LOCALE=http://localhost:3000 node probe-promemoria.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const aziende = [], risorse = [], automazioni = []
try {
  const { data: ent } = await admin.from('entita').select('id, tipo, azienda_id').limit(1).maybeSingle()

  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-PROM-${Date.now()}`, require_2fa: false }).select().single()
  aziende.push(az.id)

  const { data: ris, error: errRis } = await admin.from('risorse').insert({
    azienda_id: az.id, entity_tipo: ent.tipo, entity_id: ent.id,
    nome: 'ZZ Sala massaggi', modalita: 'slot', durata_minuti: 60, quantita: 1,
    prezzo: 0, attiva: true, visibile_minisito: true,
    disponibilita: { lun: [{ start: '08:00', end: '20:00' }], mar: [{ start: '08:00', end: '20:00' }], mer: [{ start: '08:00', end: '20:00' }], gio: [{ start: '08:00', end: '20:00' }], ven: [{ start: '08:00', end: '20:00' }], sab: [{ start: '08:00', end: '20:00' }], dom: [{ start: '08:00', end: '20:00' }] },
  }).select().single()
  if (errRis) throw new Error(`risorsa non creata: ${errRis.message}`)
  risorse.push(ris.id)

  // Il promemoria: 24 ore prima della visita.
  // ⚠️ `entity_tipo` è obbligatorio: un'automazione appartiene a un'attività,
  // non solo a un'azienda. E l'errore si guarda — la prima versione di questa
  // sonda taceva e restituiva `null`, facendo sembrare rotto il motore.
  const { data: auto, error: errAuto } = await admin.from('automazioni').insert({
    azienda_id: az.id, entity_tipo: ent.tipo, entity_id: ent.id,
    nome: 'ZZ Promemoria', trigger_evento: 'pre_visita', attiva: true,
    // ⚠️ I campi sono quelli veri del pannello — `subject`, `heading`, `text` —
    // non nomi inventati: provare in una forma diversa da come il codice gira
    // nasconde il difetto invece di rivelarlo.
    steps: [{ delay_ore: 24, subject: 'Ci vediamo domani, {{nome}}', heading: 'A domani!', text: 'Ti aspettiamo il {{data}} alle {{ora}} per {{servizio}}.', cta_text: '', cta_url: '' }],
  }).select().single()
  if (errAuto) throw new Error(`automazione non creata: ${errAuto.message}`)
  automazioni.push(auto.id)

  // Una prenotazione fra tre giorni: il promemoria va messo in coda per due
  // giorni da ora, non per adesso.
  const fra = new Date(); fra.setDate(fra.getDate() + 3)
  const giorno = fra.toISOString().slice(0, 10)

  console.log('\nSI PRENOTA, E IL PROMEMORIA VA IN CODA\n')
  const r = await fetch(`${L}/api/booking/public/prenota`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      risorsa_id: ris.id, data: giorno, ora_inizio: '10:00',
      cliente_nome: 'ZZ Cliente', cliente_email: `zz-prom-${Date.now()}@playwright.internal`,
      n_persone: 1, privacy_accettata: true,
    }),
  })
  const pren = await r.json()
  ok(r.status === 201, `la prenotazione riesce (HTTP ${r.status})${r.status !== 201 ? ' — ' + (pren.error || '') : ''}`)

  // ⚠️ Il messaggio si programma in modo asincrono: si aspetta la scrittura,
  // non si dà per scontato che sia già lì.
  await new Promise(r => setTimeout(r, 2500))

  const { data: coda } = await admin.from('automazioni_log')
    .select('scheduled_at, status, contact_email').eq('automazione_id', auto.id)

  ok(coda?.length === 1, `un messaggio in coda (${coda?.length ?? 0})`)
  if (coda?.length) {
    const quando = new Date(coda[0].scheduled_at)
    const visita = new Date(`${giorno}T10:00:00`)
    const oreDiAnticipo = Math.round((visita - quando) / 3_600_000)
    // ⛔ Il controllo che conta: parte 24 ore PRIMA della visita, non 24 ore da
    // adesso. Sbagliare qui vuol dire mandare il promemoria al momento sbagliato
    // — o dopo che il cliente è già passato.
    ok(oreDiAnticipo === 24, `programmato ${oreDiAnticipo} ore prima della visita (atteso 24)`)
    ok(quando > new Date(), 'è nel futuro, non già scaduto')
    ok(coda[0].status !== 'sent', `non ancora inviato (${coda[0].status})`)
  }

  console.log('\nUNA PRENOTAZIONE FRA POCHE ORE NON RIEVOCA IL PASSATO\n')
  // Con la visita fra un'ora, il promemoria a 24 ore cadrebbe **ieri**: non va
  // messo in coda affatto, altrimenti partirebbe subito e in ritardo.
  const traPoco = new Date(Date.now() + 60 * 60 * 1000)
  const r2 = await fetch(`${L}/api/booking/public/prenota`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      risorsa_id: ris.id, data: traPoco.toISOString().slice(0, 10),
      ora_inizio: `${String(traPoco.getHours()).padStart(2, '0')}:00`,
      cliente_nome: 'ZZ Tardi', cliente_email: `zz-tardi-${Date.now()}@playwright.internal`,
      n_persone: 1, privacy_accettata: true,
    }),
  })
  await new Promise(r => setTimeout(r, 2500))
  const { data: coda2 } = await admin.from('automazioni_log').select('id').eq('automazione_id', auto.id)
  ok(r2.status === 201 && coda2?.length === 1,
     `la prenotazione riesce e NON aggiunge un promemoria scaduto (in coda: ${coda2?.length ?? 0})`)

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL PROMEMORIA PARTE AL MOMENTO GIUSTO')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  for (const id of automazioni) {
    await admin.from('automazioni_log').delete().eq('automazione_id', id)
    await admin.from('automazioni').delete().eq('id', id)
  }
  for (const id of risorse) {
    await admin.from('prenotazioni').delete().eq('risorsa_id', id)
    await admin.from('risorse').delete().eq('id', id)
  }
  // ⚠️ Si cancella per AZIENDA, non per gli id raccolti: se la sonda si ferma
  // a meta', tutto quello che e' nato dopo l'ultimo id registrato resterebbe
  // orfano in produzione. E' successo: tre aziende ZZ rimaste, con dentro
  // prenotazioni e contatti.
  for (const id of aziende) { const errore = await svuotaAzienda(id); if (errore) console.error('pulizia:', errore) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
