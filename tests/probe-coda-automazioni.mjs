// Quanto ci mette il promemoria a entrare in coda — e ci entra sempre?
//
// Il lavoro che una route fa DOPO aver risposto non e' garantito: su Vercel la
// funzione puo' essere congelata appena risposto. Misurato il 01/09: quattro
// promemoria su cinque entro tre secondi, il quinto solo dopo trenta. Da qui
// `after()` nella route di prenotazione.
//
// ⚠️ Il rate limit e' 12 prenotazioni/ora per IP: lanciandola due volte di
// seguito le prove successive tornano 429 e i conti sembrano peggiorati.
// Uso: cd tests && node probe-coda-automazioni.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'

const aziende = [], risorse = [], automazioni = []
const orario = Object.fromEntries(['lun','mar','mer','gio','ven','sab','dom'].map(g => [g, [{ start: '08:00', end: '20:00' }]]))
try {
  const { data: ent } = await admin.from('entita').select('id, tipo').limit(1).maybeSingle()
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-DIAG-${Date.now()}`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const { data: ris } = await admin.from('risorse').insert({
    azienda_id: az.id, entity_tipo: ent.tipo, entity_id: ent.id, nome: 'ZZ Diagnosi',
    modalita: 'slot', durata_minuti: 60, quantita: 1, prezzo: 0, attiva: true,
    visibile_minisito: true, disponibilita: orario,
  }).select().single()
  risorse.push(ris.id)
  const { data: auto } = await admin.from('automazioni').insert({
    azienda_id: az.id, entity_tipo: ent.tipo, entity_id: ent.id,
    nome: 'ZZ Diagnosi', trigger_evento: 'pre_visita', attiva: true,
    steps: [{ delay_ore: 24, canale: 'email', subject: 'x', heading: 'x', text: 'x', cta_text: '', cta_url: '' }],
  }).select().single()
  automazioni.push(auto.id)

  const fra = new Date(); fra.setDate(fra.getDate() + 5)
  const giorno = fra.toISOString().slice(0, 10)

  // Cinque prenotazioni identiche: se il lavoro dopo la risposta viene troncato,
  // il numero di righe che arrivano è ballerino. Se il codice fosse sbagliato,
  // sarebbero zero tutte le volte.
  const esiti = []
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${L}/api/booking/public/prenota`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        risorsa_id: ris.id, data: giorno, ora_inizio: `1${i}:00`,
        cliente_nome: 'ZZ', cliente_email: `zz-diag-${Date.now()}-${i}@playwright.internal`,
        n_persone: 1, privacy_accettata: true,
      }),
    })
    esiti.push(r.status)
  }
  console.log('prenotazioni:', esiti.join(', '))

  for (const attesa of [3, 10, 30, 60]) {
    await new Promise(r => setTimeout(r, attesa * 1000 - (attesa === 3 ? 0 : 0)))
    const { count } = await admin.from('automazioni_log').select('id', { count: 'exact', head: true }).eq('automazione_id', auto.id)
    console.log(`dopo ~${attesa}s cumulati: ${count} righe su 5 attese`)
  }
} catch (e) { console.error('ERRORE:', e.message) }
finally {
  for (const id of automazioni) { await admin.from('automazioni_log').delete().eq('automazione_id', id); await admin.from('automazioni').delete().eq('id', id) }
  for (const id of risorse) { await admin.from('prenotazioni').delete().eq('risorsa_id', id); await admin.from('risorse').delete().eq('id', id) }
  // Per AZIENDA, non per gli id raccolti: se la sonda si ferma a meta', quello
  // che e' nato dopo resterebbe orfano in produzione.
  for (const id of aziende) { const errore = await svuotaAzienda(id); if (errore) console.error('pulizia:', errore) }
  console.log('[diagnosi] pulito')
}
