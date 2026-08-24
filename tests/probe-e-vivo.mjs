// «È VIVO?» — il giro di controllo che cerca le funzioni morte in silenzio.
//
// Non chiede "questa funzione è sicura" ma "questa funzione risponde ancora".
// Nasce da due scoperte del 24/08: il chatbot rispondeva "Entità non trovata" a
// qualsiasi domanda su strutture e ristoranti (colonne inesistenti nella select)
// e il webhook dei rimbalzi era muto da 45 giorni. Nessuno se n'era accorto,
// perché niente grida quando qualcosa muore.
//
// Usa entità VERE di produzione: è l'unico modo di accorgersi di un guasto che
// dipende dai dati reali. Non scrive nulla — solo letture.
//
// Uso: node probe-e-vivo.mjs [--verbose]

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const verbose = process.argv.includes('--verbose')

const rotti = [], spenti = [], vivi = []

// Tre esiti diversi, e la distinzione è il punto di tutto il giro:
//   VIVO   — risponde e restituisce qualcosa di sensato
//   SPENTO — risponde correttamente ma non c'è nulla da mostrare (nessun dato
//            inserito): non è un guasto, è una funzione che nessuno usa
//   ROTTO  — errore, o risposta che non ha senso per i dati che esistono
function esito(stato, area, dettaglio) {
  const riga = `${area.padEnd(26)} ${dettaglio}`
  if (stato === 'rotto') { rotti.push(riga); console.log(`  ✗ ROTTO   ${riga}`) }
  else if (stato === 'spento') { spenti.push(riga); if (verbose) console.log(`  ○ spento  ${riga}`) }
  else { vivi.push(riga); if (verbose) console.log(`  ✓ vivo    ${riga}`) }
}

async function chiama(path, opts = {}) {
  try {
    const r = await fetch(BASE + path, { ...opts, signal: AbortSignal.timeout(25000) })
    const testo = await r.text()
    return { status: r.status, testo, json: (() => { try { return JSON.parse(testo) } catch { return null } })() }
  } catch (e) { return { status: 0, testo: e.message, json: null } }
}

console.log(`\nControllo su ${BASE} — funzioni viste con i dati veri di produzione\n`)

// ── Le entità reali su cui provare ──────────────────────────────────────────
const entita = {}
for (const [tipo, tab] of [['struttura', 'properties'], ['ristorante', 'ristoranti'], ['attivita', 'attivita']]) {
  const { data } = await admin.from(tab).select('id, slug, name').eq('active', true).limit(1).maybeSingle()
  if (data) entita[tipo] = data
}
const prefisso = { struttura: 's', ristorante: 'r', attivita: 'a' }

// ── 1. I siti dei clienti ───────────────────────────────────────────────────
console.log('SITI PUBBLICI')
for (const [tipo, e] of Object.entries(entita)) {
  const r = await chiama(`/${prefisso[tipo]}/${e.slug}`)
  const haContenuto = r.status === 200 && r.testo.length > 5000
  esito(haContenuto ? 'vivo' : 'rotto', `sito ${tipo}`, `${e.slug} → ${r.status}, ${r.testo.length} byte`)
}

// ── 2. Dati che i siti caricano ─────────────────────────────────────────────
console.log('\nDATI DEI SITI')
for (const [tipo, e] of Object.entries(entita)) {
  const percorso = tipo === 'struttura' ? `/api/guest/${e.slug}` : `/api/guest/${prefisso[tipo]}/${e.slug}`
  const r = await chiama(percorso)
  esito(r.status === 200 && r.json?.name ? 'vivo' : 'rotto', `scheda ${tipo}`, `→ ${r.status}${r.json?.name ? ` (${r.json.name})` : ''}`)
}

// ── 3. Il chatbot, verticale per verticale ──────────────────────────────────
console.log('\nCHATBOT (era muto su 2 verticali su 3)')
for (const [tipo, e] of Object.entries(entita)) {
  const r = await chiama('/api/guest/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_tipo: tipo, entity_id: e.id, messages: [{ role: 'user', content: 'Dove siete?' }] }),
  })
  const risponde = r.status === 200 && r.json?.reply?.length > 10
  esito(risponde ? 'vivo' : 'rotto', `chatbot ${tipo}`, `→ ${r.status}${r.json?.error ? ` (${r.json.error})` : ''}`)
}

// ── 4. Le funzioni che i clienti vedono sul sito ────────────────────────────
console.log('\nFUNZIONI SUL SITO')
const e0 = entita.struttura || entita.ristorante || entita.attivita
const tipo0 = entita.struttura ? 'struttura' : entita.ristorante ? 'ristorante' : 'attivita'
const controlli = [
  ['eventi',        `/api/guest/eventi?entity_tipo=${tipo0}&entity_id=${e0.id}`,        'eventi'],
  ['blog',          `/api/blog/public?limit=3`,                                          'articoli'],
  ['pagine',        `/api/guest/pagine/${tipo0}/${e0.id}`,                               'pagine'],
  ['recensioni',    `/api/guest/recensioni/${tipo0}/${e0.id}`,                           'recensioni'],
  ['sitemap',       `/api/sitemap/${tipo0}/${e0.slug}`,                                  'sitemap'],
  ['manifest PWA',  `/api/manifest/${prefisso[tipo0]}/${e0.slug}`,                                 'manifest'],
  ['SEO landing',   `/api/landing-seo`,                                                  'seo'],
]
for (const [nome, percorso] of controlli) {
  const r = await chiama(percorso)
  if (r.status !== 200) { esito('rotto', nome, `→ ${r.status}`); continue }
  const vuoto = r.testo === '[]' || r.testo === '{}' || r.testo === 'null'
  esito(vuoto ? 'spento' : 'vivo', nome, `→ 200${vuoto ? ' (nessun dato)' : ` (${r.testo.length} byte)`}`)
}

// ── 5. Moduli: quanti dati hanno davvero ────────────────────────────────────
console.log('\nMODULI — quanto sono usati davvero')
const moduli = [
  ['Contatti (CRM)', 'contatti'], ['Richieste', 'requests'], ['Prenotazioni', 'prenotazioni'], ['Risorse prenotabili', 'risorse'], ['Posti eventi venduti', 'event_bookings'],
  ['Eventi', 'eventi'], ['Blog', 'articoli'], ['Newsletter', 'newsletters'],
  ['Pagine sito', 'pagine'], ['Vetrine', 'vetrine'], ['Form builder', 'form_builder'],
  ['Preventivi', 'preventivi'], ['Recensioni', 'recensioni'], ['Shop', 'prodotti'],
  ['Loyalty', 'loyalty_programs'], ['Survey', 'survey_risposte'], ['Automazioni', 'automazioni'],
]
const conteggi = []
for (const [nome, tabella] of moduli) {
  const { count, error } = await admin.from(tabella).select('*', { count: 'exact', head: true })
  conteggi.push([nome, error ? 'n/d' : count])
}
const larghezza = Math.max(...conteggi.map(([n]) => n.length))
for (const [nome, n] of conteggi) {
  const barra = typeof n === 'number' && n > 0 ? '█'.repeat(Math.min(20, Math.ceil(n / 3))) : ''
  console.log(`  ${nome.padEnd(larghezza)}  ${String(n).padStart(5)}  ${barra}${n === 0 ? '  ← nessuno lo usa' : ''}`)
}

// ── Riepilogo ───────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(66))
console.log(`vive: ${vivi.length}   spente (nessun dato): ${spenti.length}   ROTTE: ${rotti.length}`)
if (rotti.length) {
  console.log('\nDA GUARDARE:')
  rotti.forEach(r => console.log('  ✗ ' + r))
} else {
  console.log('\nNessuna funzione rotta fra quelle controllate.')
}
if (spenti.length && !verbose) console.log(`\n(${spenti.length} funzioni rispondono ma non hanno dati: --verbose per l'elenco)`)
process.exit(rotti.length ? 1 : 0)
