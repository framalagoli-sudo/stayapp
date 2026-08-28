// Tutte le prenotazioni in un posto solo.
//
// Il difetto trovato contando, il 28/08: le prenotazioni finivano in `requests`
// come **testo**, e la pagina «Prenotazioni» le riconosceva dall'inizio del
// messaggio (`[Prenotazione…`). I componenti guest scrivevano «Prenotazione
// escursione:» senza la quadra: metà delle prenotazioni finiva fra le richieste
// di servizio e nessuno se ne accorgeva. C'erano anche **due voci di menu**
// chiamate «Prenotazioni».
//
// ⚠️ Gli eventi restano fuori per scelta: hanno la loro strada.
//
// Uso: node probe-prenotazioni-unificate.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const L = process.env.TEST_LOCALE || TEST_URL
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }
const prenota = corpo => fetch(`${L}/api/guest/prenota`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
})

let az = null, en = null, off = null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-PU-${Date.now()}`, require_2fa: false }).select().single(); az = a.id
  const { data: e } = await admin.from('entita').insert({ azienda_id: az, tipo: 'attivita', slug: `zz-pu-${Date.now()}`, name: 'ZZ Tour', active: true }).select().single(); en = e.id
  const { data: o } = await admin.from('offerte').insert({
    azienda_id: az, entity_id: en, titolo: 'ZZ Degustazione', modo: 'richiesta', impegno: 'prenota',
    prezzo: 30, posti_totali: 4, attiva: true, pubblicata: true, origine: 'escursione',
  }).select().single(); off = o.id

  console.log('\nUNA PRENOTAZIONE È UNA PRENOTAZIONE\n')

  const base = { offerta_id: off, nome: 'Mario Rossi', contatto: 'mario@example.com' }
  ok((await prenota({ offerta_id: off })).status === 400, 'senza nome né recapito: respinta')
  ok((await prenota(base)).status === 400, 'senza consenso: respinta')
  ok((await prenota({ ...base, privacy_accettata: 'true' })).status === 400, 'consenso come testo invece che spunta: respinta')

  const r = await prenota({ ...base, privacy_accettata: true, n_persone: 2, messaggio: 'ZZ nota' })
  ok(r.status === 201, `con tutto quello che serve: accettata (HTTP ${r.status})`)

  const { data: righe } = await admin.from('prenotazioni').select('*').eq('offerta_id', off)
  ok(righe?.length === 1, `finisce in \`prenotazioni\`, non in \`requests\` (${righe?.length || 0})`)
  const p = righe?.[0]
  ok(p?.cliente_nome === 'Mario Rossi', 'il nome è un campo, non una riga di testo da interpretare')
  ok(p?.messaggio === 'ZZ nota', 'e il messaggio pure')
  ok(p?.importo_totale === 60, `il totale lo calcola il server: 30 × 2 = 60 (${p?.importo_totale})`)
  ok(p?.privacy_accettata === true && !!p?.privacy_accettata_il, 'la prova del consenso è registrata')

  const { count: inRequests } = await admin.from('requests').select('*', { count: 'exact', head: true }).eq('property_id', en)
  ok(inRequests === 0, `niente è finito fra le richieste di servizio (${inRequests})`)

  // ⚠️ Il difetto che nessuno aveva chiuso: i posti non si consumavano mai, e
  // un'offerta con capienza limitata accettava prenotazioni all'infinito.
  console.log('')
  const { data: dopo } = await admin.from('offerte').select('posti_occupati').eq('id', off).single()
  ok(dopo?.posti_occupati === 2, `i posti si consumano: 2 occupati su 4 (${dopo?.posti_occupati})`)

  const troppi = await prenota({ ...base, privacy_accettata: true, n_persone: 3 })
  ok(troppi.status === 409, `chiedendone più di quelli rimasti: respinta (HTTP ${troppi.status})`)
  const ultimi = await prenota({ ...base, nome: 'Anna B.', privacy_accettata: true, n_persone: 2 })
  ok(ultimi.status === 201, 'gli ultimi due posti si prendono')
  const oltre = await prenota({ ...base, nome: 'Terzo', privacy_accettata: true, n_persone: 1 })
  ok(oltre.status === 409, `a posti finiti non si prenota più (HTTP ${oltre.status})`)

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  UN POSTO SOLO, E I POSTI SI CONTANO DAVVERO')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  if (off) await admin.from('prenotazioni').delete().eq('offerta_id', off)
  if (az) await admin.from('offerte').delete().eq('azienda_id', az)
  if (en) { await admin.from('requests').delete().eq('property_id', en); await admin.from('entita').delete().eq('id', en) }
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
