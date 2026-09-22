// PROGETTO.md dice la verità? Confronto con quello che c'è davvero su Vercel.
//
// ⛔ Il 22/09/2026 Francesco ha chiesto «con quale account ho creato Stripe?» e
// leggendo il documento ha trovato scritto: «Stripe non è mai stato collegato,
// su Vercel non c'è nessuna chiave». Le chiavi erano lì **da tre settimane**.
// Il documento è quello che legge chi subentra in emergenza: una riga falsa lì
// vale più di un bug.
//
// `verifica-regole.mjs` controlla già che ogni variabile **usata nel codice**
// sia documentata. Ma «Stripe non è mai stato collegato» non è una variabile:
// è un **fatto**, e nessun controllo sul codice poteva smentirlo. Questa sonda
// confronta le affermazioni del documento con la realtà del fornitore.
//
//   node probe-documenti.mjs
//
// Serve il CLI di Vercel autenticato (lo stesso che usa il deploy).

import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..')
const doc = readFileSync(join(RADICE, 'PROGETTO.md'), 'utf8')

// Le chiavi che raccontano se un fornitore è collegato davvero. Non tutte le
// variabili: solo quelle che, se ci sono, vogliono dire «questo è acceso».
const FORNITORI = [
  { nome: 'Stripe',     chiavi: ['STRIPE_SECRET_KEY'] },
  { nome: 'Meta / WhatsApp', chiavi: ['META_APP_ID', 'META_APP_SECRET'] },
  { nome: 'Google',     chiavi: ['GOOGLE_CLIENT_ID', 'GOOGLE_PLACES_API_KEY'] },
  { nome: 'Unsplash',   chiavi: ['UNSPLASH_ACCESS_KEY'] },
  { nome: 'Anthropic',  chiavi: ['ANTHROPIC_API_KEY'] },
  { nome: 'Resend',     chiavi: ['RESEND_API_KEY'] },
  { nome: 'Cloudflare', chiavi: ['R2_ACCESS_KEY_ID', 'TURNSTILE_SECRET_KEY'] },
]

// Frasi con cui il documento dichiara che qualcosa NON è collegato. Se compaiono
// nella riga di un fornitore le cui chiavi però esistono, il documento mente.
const NEGAZIONI = /non è mai stato collegato|non c'è nessuna chiave|nessun account collegato|non è attivo|nessuno dei due è attivo/i

console.log('\nPROGETTO.md DICE LA VERITÀ?\n')

let reali = []
try {
  const out = execSync('npx vercel env ls production', { cwd: join(RADICE, 'client-next'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  reali = [...out.matchAll(/^\s+([A-Z][A-Z0-9_]{2,})\s/gm)].map(m => m[1])
} catch {
  console.log('  ⏸ non ho potuto leggere le variabili da Vercel (CLI non autenticato?): controllo non eseguito.\n')
  process.exit(0)
}
const presente = k => reali.includes(k)

// ⚠️ Cosa è davvero una variabile d'ambiente lo dice il CODICE, non il modo in
// cui una parola è scritta nel documento: senza questo, la sonda segnalava
// `LETTURE_GRATUITE_AL_MESE`, che è una costante di `lib/recensioni-esterne.js`.
// Un allarme che suona a vuoto si smette di leggere.
const usateNelCodice = new Set()
try {
  const grep = execSync('git grep -ho "process\\.env\\.[A-Z0-9_]*" -- client-next', { cwd: RADICE, encoding: 'utf8' })
  for (const m of grep.matchAll(/process\.env\.([A-Z0-9_]+)/g)) usateNelCodice.add(m[1])
} catch { /* senza git grep i controlli 2 e 3 restano più larghi */ }

// Variabili di sola configurazione: non sono collegamenti verso l'esterno.
const CONFIGURAZIONE = /^(APP_URL|CLIENT_URL|NEXT_INTERNAL_API_URL|NEXT_PUBLIC_API_URL|NEXT_PUBLIC_STAYAPP_DOMAIN|STAYAPP_DOMAIN|TURNSTILE_TEST_BYPASS|DEMO_NOTIFY_EMAIL|VERCEL)/

const problemi = []

// 1. Un fornitore dichiarato spento che invece ha le sue chiavi in produzione.
//    Il nome si cerca in TUTTO il documento: i fornitori critici hanno una
//    sezione propria (§2.1–2.5), non una riga nella tabella degli «altri».
for (const f of FORNITORI) {
  // I fornitori critici stanno come TITOLO di sezione («### 2.4 Resend — le
  // email»), non in grassetto dentro una tabella: si cerca il nome, non lo stile.
  const cerca = new RegExp(f.nome.replace(/[/]/g, '.').replace(/\s+/g, '\\s*'), 'i')
  const righe = doc.split('\n').filter(l => cerca.test(l) && (l.startsWith('#') || l.startsWith('|')))
  if (!righe.length) { problemi.push(`«${f.nome}» non è nominato da nessuna parte nel documento`); continue }
  const attive = f.chiavi.filter(presente)
  if (attive.length && righe.some(r => NEGAZIONI.test(r))) {
    problemi.push(`«${f.nome}» è dichiarato NON collegato, ma su Vercel c'è ${attive.join(', ')}`)
  }
}

// 1-bis. Una chiave che sta in produzione e che il codice non usa più: è il
//    residuo di un servizio dismesso, e resta lì a fare superficie inutile.
// ⚠️ Un residuo che il documento DICHIARA non è una bugia: questa sonda
// controlla che il documento racconti la verità, non che la produzione sia
// perfetta. Restano promemoria, non errori — altrimenti resterebbe rossa per
// sempre e si smetterebbe di leggerla.
const promemoria = []
if (usateNelCodice.size) {
  for (const k of reali) {
    if (CONFIGURAZIONE.test(k) || usateNelCodice.has(k)) continue
    const riga = doc.split('\n').find(l => l.includes(k)) || ''
    const testo = `\`${k}\` è in produzione ma nessuna riga di codice la legge: residuo da togliere da Vercel`
    if (/residuo|va tolta|da togliere|dismess/i.test(riga)) promemoria.push(testo)
    else problemi.push(testo + ' — e il documento non lo dice')
  }
}

// 2. Una chiave in produzione che il documento non nomina da nessuna parte.
//    Quella già segnalata come residuo non si ripete: due righe per lo stesso
//    fatto fanno sembrare i problemi il doppio di quanti sono.
const giaDette = new Set((problemi.join(' ').match(/`[A-Z0-9_]+`/g) || []).map(x => x.replaceAll('`', '')))
for (const k of reali) {
  if (CONFIGURAZIONE.test(k) || giaDette.has(k)) continue
  if (!doc.includes(k)) problemi.push(`\`${k}\` è configurata in produzione ma PROGETTO.md non la nomina`)
}

// 3. Una chiave documentata come presente che in produzione non c'è, senza che
//    il documento dichiari l'assenza: è una promessa che nessuno mantiene.
const CITATE = [...doc.matchAll(/`([A-Z][A-Z0-9_]{4,})`/g)].map(m => m[1])
for (const k of [...new Set(CITATE)]) {
  // Solo ciò che il codice legge da `process.env`: il resto sono costanti.
  if (usateNelCodice.size && !usateNelCodice.has(k)) continue
  if (presente(k) || CONFIGURAZIONE.test(k)) continue
  const riga = doc.split('\n').find(l => l.includes('`' + k + '`')) || ''
  const dichiaraAssenza = /manca|mancano|non c'è|non ci sono|aspetta|da mettere|assente|non è attiv/i.test(riga)
  if (!dichiaraAssenza) problemi.push(`\`${k}\` è documentata come se esistesse, ma in produzione non c'è`)
}

if (problemi.length) {
  console.log(`  ${problemi.length} ${problemi.length === 1 ? 'cosa che il documento racconta' : 'cose che il documento racconta'} male:\n`)
  for (const p of problemi) console.log('  · ' + p)
  console.log('\n  PROGETTO.md è quello che legge chi subentra in emergenza: va rimesso a posto adesso.\n')
  process.exit(1)
}
console.log('  ✓ fornitori e chiavi: il documento corrisponde alla realtà')
if (promemoria.length) {
  console.log('\n  Promemoria (dichiarati nel documento, restano da fare):')
  for (const p of promemoria) console.log('  · ' + p)
}
console.log('')
process.exit(0)
