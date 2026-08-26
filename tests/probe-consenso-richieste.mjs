// Prenotare un'escursione senza lasciare i propri dati non deve riuscire.
// E deve riuscire su **tutti e tre** i tipi di entità, non solo sulle strutture.
//
// Due difetti trovati provando dal vivo, non leggendo il codice:
//   1. il modulo non chiedeva nome né recapito: il titolare riceveva
//      «Prenotazione escursione — 2 persone» e non poteva richiamare nessuno;
//   2. la chiave esterna di `requests` puntava ancora alla vecchia tabella delle
//      strutture, quindi una richiesta da un ristorante o da un'attività
//      rispondeva 500. Provando sempre con la stessa struttura non si vedeva.
//
// Uso: node probe-consenso-richieste.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_URL || 'https://www.oltrenova.com'
const nati = { aziende: [], entita: [] }
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }
const invia = corpo => fetch(`${L}/api/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })

async function entitaDiProva(tipo) {
  const n = `zz-rq-${tipo}-${Date.now()}`
  const { data: a, error: ea } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-RQ-${n}`, require_2fa: false }).select().single()
  if (ea) throw new Error(`azienda: ${ea.message}`)
  nati.aziende.push(a.id)
  const { data: e, error: ee } = await admin.from('entita').insert({ azienda_id: a.id, tipo, slug: n, name: `ZZ ${tipo}`, active: true }).select().single()
  if (ee) throw new Error(`entita ${tipo}: ${ee.message}`)
  nati.entita.push(e.id)
  return e.id
}

try {
  const ent = await entitaDiProva('struttura')
  const base = { property_id: ent, type: 'escursione', message: 'Prenotazione escursione: ZZ — 2 persone' }

  console.log('\nPRENOTARE SENZA LASCIARE I PROPRI DATI\n')
  ok((await invia(base)).status === 400, 'senza nome né recapito: respinta')
  ok((await invia({ ...base, nome: 'Mario' })).status === 400, 'col solo nome: respinta')
  ok((await invia({ ...base, nome: 'Mario', contatto: 'm@x.it' })).status === 400, 'senza consenso: respinta')
  ok((await invia({ ...base, nome: 'Mario', contatto: 'm@x.it', privacy_accettata: 'true' })).status === 400, 'consenso come testo invece che spunta: respinta')
  const { count: dopo } = await admin.from('requests').select('*', { count: 'exact', head: true }).eq('property_id', ent)
  ok(dopo === 0, `nessun dato personale salvato nei tentativi respinti (${dopo} righe)`)

  console.log('\n  con tutto quello che serve:\n')
  const buona = await invia({ ...base, nome: 'Mario Rossi', contatto: 'mario@example.com', privacy_accettata: true, canale: 'whatsapp' })
  ok(buona.ok, `accettata (HTTP ${buona.status})`)
  const { data: r } = await admin.from('requests').select('*').eq('property_id', ent).maybeSingle()
  ok(/Mario Rossi/.test(r?.message || ''), 'il nome è nel messaggio che il titolare legge')
  ok(/mario@example\.com/.test(r?.message || ''), 'e il recapito pure')
  ok(/WhatsApp/i.test(r?.message || ''), 'ed è segnato che ha scelto WhatsApp')
  ok(r?.privacy_accettata === true, 'il consenso è registrato')
  ok(!!r?.privacy_accettata_il, `è registrato quando (${r?.privacy_accettata_il?.slice(0, 19)})`)
  ok((r?.privacy_testo || '').length > 30, 'ed è registrata la formula che ha letto')

  // ⚠️ Provare sempre con la stessa struttura nascondeva un 500 su due tipi su tre.
  console.log('\nDA TUTTI E TRE I TIPI DI ENTITÀ\n')
  for (const tipo of ['ristorante', 'attivita']) {
    const id = await entitaDiProva(tipo)
    const res = await invia({ property_id: id, type: 'escursione', message: 'Prenotazione escursione: ZZ — 2 persone',
      nome: 'Mario Rossi', contatto: 'mario@example.com', privacy_accettata: true })
    ok(res.ok, `${tipo}: accettata (HTTP ${res.status})${res.ok ? '' : ' — ' + (await res.text()).slice(0, 120)}`)
  }

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  NESSUNA PRENOTAZIONE SENZA UN MODO PER RISPONDERE, SU OGNI TIPO')
} catch (er) { console.error('ERRORE:', er.message); ko++ }
finally {
  for (const id of nati.entita) { await admin.from('requests').delete().eq('property_id', id); await admin.from('entita').delete().eq('id', id) }
  for (const id of nati.aziende) { const { error } = await admin.from('aziende').delete().eq('id', id); if (error) console.error('pulizia azienda:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
