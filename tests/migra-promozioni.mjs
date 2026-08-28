// Promozioni e pacchetti diventano offerte.
//
// Erano due elenchi dentro il JSONB del minisito: una quarta porta per creare
// cose da vendere, che non parlava con nient'altro. Lo stesso difetto già
// chiuso sullo shop.
//
// ⚠️ **Copia, non sposta.** Gli originali restano dentro `minisito` finché
// Francesco non conferma che i siti sono identici. È il metodo che ha reso
// invisibili l'unificazione delle entità e quella dei prodotti: se qualcosa non
// torna, si spegne il blocco nuovo e tutto è come prima.
//
// Uso:  node migra-promozioni.mjs            → dice cosa farebbe
//       node migra-promozioni.mjs --esegui   → lo fa
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const esegui = process.argv.includes('--esegui')

// Un numero scritto a mano dal cliente: «200», «€ 200», «200,00», o niente.
const aNumero = v => {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
// Una data vuota nel JSON è `""`, che il database rifiuta.
const aData = v => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v : null)

function daPromozione(p, entita) {
  const pieno = aNumero(p.price_original)
  const scontato = aNumero(p.price_discounted)
  return {
    azienda_id: entita.azienda_id, entity_id: entita.id,
    titolo: p.title || 'Promozione',
    // `text` è la riga breve, `description_full` il testo lungo: si tiene il
    // più ricco dei due, senza perdere l'altro.
    descrizione: [p.description_full, p.text].filter(Boolean).join('\n\n') || null,
    categoria: p.badge || null,
    cover_url: p.cover_url || null,
    galleria: Array.isArray(p.gallery) ? p.gallery : [],
    // Il prezzo che si paga è quello scontato, se c'è. Il pieno va nel barrato:
    // scambiarli significherebbe addebitare il doppio.
    prezzo: scontato ?? pieno,
    prezzo_barrato: scontato != null ? pieno : null,
    data_inizio: aData(p.valid_from),
    data_fine: aData(p.expires_at),
    cta_label: p.cta_label || null,
    // `#` è un segnaposto che qualcuno ha lasciato: non è un indirizzo.
    cta_url: p.cta_url && p.cta_url !== '#' ? p.cta_url : null,
    cta_condizioni: p.conditions || null,
    modo: aData(p.valid_from) ? 'data_fissa' : 'richiesta',
    impegno: 'chiedi',
    attiva: true,
    // ⚠️ Nascono **non pubblicate**: comparirebbero due volte, una dal vecchio
    // blocco «Promozioni» e una dal nuovo «Offerte». Le pubblica Francesco
    // quando toglie il blocco vecchio.
    pubblicata: false,
    origine: 'promozione', origine_id: p.id,
  }
}

function daPacchetto(k, entita) {
  return {
    azienda_id: entita.azienda_id, entity_id: entita.id,
    titolo: k.name || 'Pacchetto',
    descrizione: k.tagline || null,
    categoria: k.badge || null,
    cover_url: k.cover_url || null,
    galleria: Array.isArray(k.gallery) ? k.gallery : [],
    incluso: Array.isArray(k.includes) ? k.includes : [],
    prezzo: aNumero(k.price),
    prezzo_etichetta: k.price_label || null,
    cta_label: k.cta_label || null,
    cta_url: k.cta_url && k.cta_url !== '#' ? k.cta_url : null,
    modo: 'richiesta', impegno: 'chiedi',
    attiva: true, pubblicata: false,
    origine: 'pacchetto', origine_id: k.id,
  }
}

const { data: entita, error } = await admin.from('entita').select('id, slug, azienda_id, minisito')
if (error) { console.error('Non riesco a leggere le entità:', error.message); process.exit(1) }

// Già migrate: si riconoscono dall'origine, così rilanciare non duplica.
const { data: giaFatte } = await admin.from('offerte')
  .select('origine_id').in('origine', ['promozione', 'pacchetto'])
const fatte = new Set((giaFatte || []).map(o => o.origine_id))

let nuove = 0, saltate = 0
console.log(esegui ? '\nCOPIO PROMOZIONI E PACCHETTI IN OFFERTE\n' : '\nCOSA FAREI (nessuna scrittura: manca --esegui)\n')

for (const e of entita || []) {
  const promo = e.minisito?.promozioni || []
  const pack = e.minisito?.pacchetti || []
  if (!promo.length && !pack.length) continue
  console.log(`  ${e.slug}`)

  for (const [elenco, converti, tipo] of [[promo, daPromozione, 'promozione'], [pack, daPacchetto, 'pacchetto']]) {
    for (const x of elenco) {
      if (fatte.has(x.id)) { console.log(`    · ${tipo}: «${x.title || x.name}» già copiata`); saltate++; continue }
      const riga = converti(x, e)
      console.log(`    → ${tipo}: «${riga.titolo}»${riga.prezzo != null ? ` · €${riga.prezzo}` : ''}${riga.prezzo_barrato ? ` (invece di €${riga.prezzo_barrato})` : ''}`)
      if (!esegui) { nuove++; continue }
      const { error: er } = await admin.from('offerte').insert(riga)
      if (er) console.error(`      ✗ ${er.message}`)
      else nuove++
    }
  }
}

console.log('\n' + '-'.repeat(62))
if (!esegui) {
  console.log(`  ${nuove} da copiare, ${saltate} già fatte.`)
  console.log('  Per farlo davvero: node migra-promozioni.mjs --esegui')
  console.log('  ⚠️ Nascono NON pubblicate: gli originali restano dove sono e i')
  console.log('     siti non cambiano di una virgola finché non le pubblichi.')
} else {
  console.log(`  ${nuove} copiate, ${saltate} già fatte.`)
  console.log('  Gli originali sono ancora nel minisito: i siti non sono cambiati.')
}
