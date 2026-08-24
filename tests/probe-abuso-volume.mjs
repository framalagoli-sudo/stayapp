// A5 — quanto costa a noi (o a un nostro cliente) chi ripete una richiesta lecita?
//
// Prove:
//  1. la prenotazione ospite non si può ripetere all'infinito (scrive nel CRM del
//     cliente, gli manda un'email e fa scattare le sue automazioni)
//  2. una recensione negativa non si può reinviare più volte: la guardia stava su
//     `pubblica`, che resta false proprio quando il voto è basso, quindi ogni
//     reinvio spediva un'altra email al titolare
//
// Uso: node probe-abuso-volume.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'

let problemi = 0
const esito = (ok, testo) => { console.log(`  ${ok ? '✓' : '✗'} ${testo}`); if (!ok) problemi++ }

let az = null, entita = null, recensioneId = null

try {
  const { data: a } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-AB-${Date.now()}`, email: 'zz-probe@playwright.internal' }).select().single()
  az = a.id
  const { data: e } = await admin.from('properties')
    .insert({ azienda_id: az, slug: `zz-ab-${Date.now()}`, name: 'Struttura di prova', active: true, email: 'zz-probe@playwright.internal' })
    .select().single()
  entita = e
  console.log(`\nazienda ed entità di prova create (email interna, nessun titolare reale disturbato)\n`)

  // ── 1. Prenotazioni ospite ripetute ─────────────────────────────────────────
  console.log('[1] prenotazioni ospite ripetute (ognuna scrive nel CRM e manda un’email)')
  let passate = 0, bloccataAl = null
  for (let i = 1; i <= 16; i++) {
    const r = await fetch(`${BASE}/api/guest/book`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_tipo: 'struttura', entity_id: entita.id,
        item_type: 'activity', item_name: 'Prova',
        name: `Probe ${i}`, email: `probe${i}@playwright.internal`,
      }),
    })
    if (r.status === 429) { bloccataAl = i; break }
    if (r.ok) passate++
  }
  console.log(`     ${passate} passate${bloccataAl ? `, bloccata alla n° ${bloccataAl}` : ', mai bloccata'}`)
  esito(!!bloccataAl, bloccataAl ? 'il limite scatta' : 'nessun limite: si inonda la casella di un cliente')

  // ── 2. Reinvio della stessa recensione negativa ─────────────────────────────
  console.log('\n[2] la stessa recensione NEGATIVA reinviata più volte')
  const { data: rec } = await admin.from('recensioni').insert({
    azienda_id: az, entity_tipo: 'struttura', entity_id: entita.id,
    autore: 'Probe', stelle: 5, testo: '', fonte: 'form', verificata: false, pubblica: false,
  }).select().single()
  recensioneId = rec?.id

  if (!rec?.token) {
    console.log('     (nessun token generato: prova saltata)')
  } else {
    const invia = () => fetch(`${BASE}/api/guest/recensione/${rec.token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autore: 'Probe', stelle: 1, testo: 'prova' }),
    })
    const primo = await invia()
    const secondo = await invia()
    const terzo = await invia()
    console.log(`     1° invio → ${primo.status}   2° → ${secondo.status}   3° → ${terzo.status}`)
    esito(primo.ok, 'il primo invio è accettato (il flusso legittimo funziona)')
    esito(secondo.status === 410 && terzo.status === 410,
      secondo.status === 410 ? 'i reinvii sono respinti' : 'REINVIO POSSIBILE: un’email al titolare per ogni colpo')
  }

  console.log('\n' + '─'.repeat(62))
  console.log(problemi ? `${problemi} PROBLEMI DA GUARDARE` : 'NESSUN PROBLEMA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  if (az) {
    await admin.from('requests').delete().eq('property_id', entita?.id || '00000000-0000-0000-0000-000000000000')
    await admin.from('recensioni').delete().eq('azienda_id', az)
    await admin.from('contatti').delete().eq('azienda_id', az)
    if (entita) await admin.from('properties').delete().eq('id', entita.id)
    const { error } = await admin.from('aziende').delete().eq('id', az)
    if (error) console.error('pulizia azienda:', error.message)
    console.log('[probe] dati di prova eliminati')
  }
  process.exit(problemi ? 1 : 0)
}
