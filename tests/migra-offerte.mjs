// PASSO 3 — Attività, escursioni e risorse diventano offerte.
//
// Si migrano per prime perché sono quelle a **zero utilizzi**: se qualcosa non
// torna qui, non se ne accorge nessun cliente. Gli eventi restano intatti e si
// spostano per ultimi, quando il motore avrà già girato con roba vera.
//
// Cosa diventa cosa:
//   attività   → modo «richiesta»   (nessuna data, nessun posto: si chiede)
//   escursioni → modo «data_fissa» se hanno una data leggibile, «richiesta» altrimenti
//   risorse    → modo «calendario» o «coperti», secondo la loro `modalita`
//
// ⚠️ **Simula e basta**, se non gli si passa `--esegui`. È la stessa cautela di
// `probe-comprimi-esistenti`: si guarda cosa farebbe, poi lo si lascia fare.
//
// È **idempotente**: ogni offerta porta `origine` e `origine_id`, e chi c'è già
// non viene ricreato. Si può rilanciare senza duplicare niente.
//
// Uso:  node migra-offerte.mjs             → mostra cosa farebbe
//       node migra-offerte.mjs --esegui    → lo fa

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })
const esegui = process.argv.includes('--esegui')

function slugDa(testo, fallback) {
  const s = String(testo || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || fallback
}

// Le escursioni hanno un campo `dates` in testo libero: «Ogni martedì»,
// «15 marzo», «su richiesta». Solo una data vera fa di un'escursione un evento;
// tutto il resto resta «su richiesta», che è il modo che non promette niente.
function dataDa(testo) {
  if (!testo) return null
  const m = String(testo).match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (!m) return null
  const [, g, mm, a] = m
  const anno = a.length === 2 ? 2000 + Number(a) : Number(a)
  const d = new Date(Date.UTC(anno, Number(mm) - 1, Number(g), 10, 0))
  return isNaN(d) ? null : d.toISOString()
}

const daFare = []
// Quello che NON viene migrato, e perché. Saltare una riga in silenzio è il
// modo migliore per accorgersi fra un mese che un dato del cliente non c'è più.
const saltati = []

// ── attività: dentro `entita.activities`, raggruppate per categoria ──────────
const { data: entita } = await admin.from('entita')
  .select('id, slug, name, azienda_id, activities, excursions').eq('active', true)

for (const e of entita || []) {
  for (const cat of (e.activities || [])) {
    for (const it of (cat.items || [])) {
      if (!it?.name) { saltati.push({ tipo:'attività', dove:e.slug, perche:'senza nome', id: it?.id }); continue }
      daFare.push({
        origine: 'attivita', origine_id: it.id || null, dove: e.slug,
        riga: {
          azienda_id: e.azienda_id, entity_id: e.id,
          modo: 'richiesta',
          // `bookable` diceva se compariva il pulsante «prenota»: chi non lo
          // aveva chiedeva e basta, e resta così.
          impegno: it.bookable ? 'prenota' : 'chiedi',
          titolo: it.name, descrizione: it.description || null,
          slug: slugDa(it.name, `attivita-${(it.id || '').slice(0, 8)}`),
          cover_url: it.photo_url || null, luogo: it.location || null,
          attiva: it.active !== false, pubblicata: it.active !== false,
          origine: 'attivita', origine_id: it.id || null,
        },
      })
    }
  }

  // ── escursioni: elenco piatto in `entita.excursions` ──────────────────────
  for (const x of (e.excursions || [])) {
    if (!x?.name) { saltati.push({ tipo:'escursione', dove:e.slug, perche:'senza nome', id: x?.id }); continue }
    const quando = dataDa(x.dates)
    daFare.push({
      origine: 'escursione', origine_id: x.id || null, dove: e.slug,
      riga: {
        azienda_id: e.azienda_id, entity_id: e.id,
        modo: quando ? 'data_fissa' : 'richiesta',
        impegno: 'chiedi',
        titolo: x.name, descrizione: x.description || null,
        slug: slugDa(x.name, `escursione-${(x.id || '').slice(0, 8)}`),
        cover_url: x.photo_url || null, luogo: x.meeting_point || null,
        prezzo: Number(x.price) || 0,
        data_inizio: quando,
        posti_totali: Number(x.seats) > 0 ? Number(x.seats) : null,
        // La durata e cosa include stavano in campi di testo che la tabella
        // nuova non ha: finiscono in coda alla descrizione, perché perderli
        // sarebbe perdere quello che il cliente ha scritto.
        cta_condizioni: [x.duration ? `Durata: ${x.duration}` : null,
                         x.includes ? `Include: ${x.includes}` : null].filter(Boolean).join('\n') || null,
        attiva: x.active !== false, pubblicata: x.active !== false,
        origine: 'escursione', origine_id: x.id || null,
      },
    })
  }
}

// ── risorse del booking ─────────────────────────────────────────────────────
const { data: risorse } = await admin.from('risorse').select('*')
for (const r of risorse || []) {
  daFare.push({
    origine: 'risorsa', origine_id: r.id, dove: r.entity_id,
    riga: {
      azienda_id: r.azienda_id, entity_id: r.entity_id,
      modo: r.modalita === 'coperti' ? 'coperti' : 'calendario',
      impegno: 'prenota',
      titolo: r.nome, descrizione: r.descrizione || null,
      slug: slugDa(r.nome, `risorsa-${r.id.slice(0, 8)}`),
      colore: r.colore || '#00b5b5',
      prezzo: Number(r.prezzo) || 0, valuta: r.valuta || 'EUR',
      durata_minuti: r.durata_minuti || 60, quantita: r.quantita || 1,
      max_coperti: r.max_coperti ?? null,
      disponibilita: r.disponibilita || {}, chiusure: r.chiusure || [],
      attiva: true, pubblicata: true,
      origine: 'risorsa', origine_id: r.id,
    },
  })
}

// ── chi c'è già non si tocca ────────────────────────────────────────────────
const { data: esistenti } = await admin.from('offerte').select('origine, origine_id')
const gia = new Set((esistenti || []).map(o => `${o.origine}:${o.origine_id}`))
const nuovi = daFare.filter(x => !gia.has(`${x.origine}:${x.origine_id}`))

console.log('\n' + '='.repeat(66))
console.log(`  ${esegui ? 'MIGRAZIONE' : 'PROVA — non scrive niente'}`)
console.log('='.repeat(66) + '\n')

if (!daFare.length) { console.log('  Niente da migrare.\n'); process.exit(0) }

const perTipo = {}
for (const x of nuovi) perTipo[x.origine] = (perTipo[x.origine] || 0) + 1
console.log(`  ${daFare.length} elementi trovati · ${gia.size} già migrati · ${nuovi.length} da fare`)
if (saltati.length) {
  console.log(`\n  NON MIGRATI (${saltati.length}) — restano dov'erano, nessuno li tocca:`)
  for (const s of saltati) console.log(`     ${s.tipo} in «${s.dove}»: ${s.perche}`)
}
console.log('')
for (const x of nuovi) {
  console.log(`  ${x.origine.padEnd(11)} «${x.riga.titolo}»`)
  console.log(`     ${x.riga.modo} + ${x.riga.impegno}${x.riga.data_inizio ? '  data: ' + x.riga.data_inizio.slice(0,10) : ''}${x.riga.posti_totali ? '  posti: ' + x.riga.posti_totali : ''}`)
}

if (!esegui) {
  console.log(`\n  Per farlo davvero: node migra-offerte.mjs --esegui\n`)
  process.exit(0)
}

let scritti = 0, falliti = 0
for (const x of nuovi) {
  const { error } = await admin.from('offerte').insert(x.riga)
  if (error) { falliti++; console.log(`  ✗ «${x.riga.titolo}»: ${error.message}`) }
  else scritti++
}
console.log(`\n  ${scritti} offerte create${falliti ? `, ${falliti} FALLITE` : ''}`)
console.log('  Le attività, le escursioni e le risorse originali NON sono state toccate.\n')
process.exit(falliti ? 1 : 0)
