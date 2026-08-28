// Le risorse prenotabili del booking diventano offerte.
//
// Erano l'ultima porta separata per creare qualcosa che si prenota: un campo da
// padel e un corso sono la stessa cosa vista da due menu diversi. `offerte`
// conteneva già quasi tutto — mancavano tre campi, aggiunti con la migration
// 095: anticipo, cancellazione, conferma automatica.
//
// ⚠️ **Copia, non sposta.** Le risorse restano vive: il `BookingWidget` continua
// a leggerle finché non sarà pronto a leggere le offerte. Così non esiste un
// istante in cui un cliente non può prenotare.
//
// Uso:  node migra-risorse.mjs            → dice cosa farebbe
//       node migra-risorse.mjs --esegui   → lo fa
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const esegui = process.argv.includes('--esegui')

// La modalità della risorsa diventa il «modo» dell'offerta. Sono gli stessi
// nomi tranne uno: `slot` si chiama `calendario` fra le offerte.
const MODO = { slot: 'calendario', coperti: 'coperti', giornaliero: 'data_fissa' }

function daRisorsa(r) {
  return {
    azienda_id: r.azienda_id,
    entity_id: r.entity_id,
    titolo: r.nome || 'Prenotabile',
    descrizione: r.descrizione || null,
    modo: MODO[r.modalita] || 'richiesta',
    // Una risorsa si prenota: non è mai una semplice richiesta di informazioni.
    impegno: 'prenota',
    prezzo: Number(r.prezzo) || 0,
    valuta: r.valuta || 'EUR',
    colore: r.colore || null,
    durata_minuti: r.durata_minuti ?? null,
    quantita: r.quantita ?? 1,
    max_coperti: r.max_coperti ?? null,
    // `disponibilita` e `blocchi` hanno la stessa forma: cambiano nome, non
    // struttura. `chiusure` è come si chiamano i blocchi fra le offerte.
    disponibilita: r.disponibilita || {},
    chiusure: r.blocchi || [],
    anticipo_ore: r.anticipo_ore ?? 1,
    cancellazione_ore: r.cancellazione_ore ?? 24,
    conferma_auto: r.conferma_auto !== false,
    attiva: r.attiva !== false,
    // `visibile_minisito` diventa `pubblicata`: è la stessa domanda — si vede
    // sul sito?
    pubblicata: r.visibile_minisito !== false,
    origine: 'risorsa', origine_id: r.id,
  }
}

const { data: risorse, error } = await admin.from('risorse').select('*')
if (error) { console.error('Non riesco a leggere le risorse:', error.message); process.exit(1) }

const { data: giaFatte } = await admin.from('offerte').select('origine_id').eq('origine', 'risorsa')
const fatte = new Set((giaFatte || []).map(o => o.origine_id))

console.log(esegui ? '\nCOPIO LE RISORSE IN OFFERTE\n' : '\nCOSA FAREI (nessuna scrittura: manca --esegui)\n')
let nuove = 0, saltate = 0

for (const r of risorse || []) {
  if (fatte.has(r.id)) { console.log(`  · «${r.nome}» già copiata`); saltate++; continue }
  const riga = daRisorsa(r)
  const quando = riga.modo === 'coperti' ? `coperti (max ${riga.max_coperti})`
    : riga.modo === 'data_fissa' ? 'a giornate'
    : `a slot di ${riga.durata_minuti} min`
  console.log(`  → «${riga.titolo}» · ${quando} · €${riga.prezzo}${riga.quantita > 1 ? ` × ${riga.quantita}` : ''}${riga.pubblicata ? '' : ' (non sul sito)'}`)
  if (!esegui) { nuove++; continue }
  const { error: er } = await admin.from('offerte').insert(riga)
  if (er) console.error(`    ✗ ${er.message}`)
  else nuove++
}

console.log('\n' + '-'.repeat(62))
if (!esegui) {
  console.log(`  ${nuove} da copiare, ${saltate} già fatte.`)
  console.log('  Per farlo davvero: node migra-risorse.mjs --esegui')
  console.log('  ⚠️ Le risorse restano vive: il widget pubblico continua a leggere')
  console.log('     quelle finché non saprà leggere le offerte. Nessun buco.')
} else {
  console.log(`  ${nuove} copiate, ${saltate} già fatte.`)
  console.log('  Le risorse sono ancora lì: le prenotazioni dal sito funzionano come prima.')
}
