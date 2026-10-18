// Sonda: ogni scrittura pubblica ha un limite d'abuso (giro 14 dell'agente, 17/10/2026).
//
// Le scritture pubbliche (senza login) sono la superficie dell'abuso: spam dei
// moduli, prenotazioni a raffica, brute-force di un token. Devono avere tutte un
// `rateLimit(...)`. Non si prova floodando la produzione (niente volume, scelta
// di Francesco): si legge il CODICE e si verifica che il limite ci sia — così una
// route pubblica nuova senza limite viene segnalata prima del deploy.
//
// A mano o nel deploy. Uso: cd tests && node probe-rate-limit.mjs
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const API = join(dirname(fileURLToPath(import.meta.url)), '..', 'client-next', 'app', 'api')
// Le cartelle pubbliche: ci si arriva senza login, quindi le scritture vanno limitate.
const CARTELLE_PUBBLICHE = ['guest', 'form-builder/public', 'booking/public', 'loyalty/public', 'shop/public', 'public']

// Route di sola lettura/effetti nulli, esenti di proposito (nessuna scrittura o
// nessun costo): si dichiara qui, col motivo, invece di lasciarle sfuggire.
const ESENTI = new Set([
  // (vuoto: al 17/10 tutte le scritture pubbliche hanno un limite)
])

let rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }

function* routeFiles(dir) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* routeFiles(p)
    else if (e.name === 'route.js') yield p
  }
}

try {
  console.log(`\nOGNI SCRITTURA PUBBLICA HA UN LIMITE\n`)
  const mancanti = []
  let controllate = 0
  for (const sub of CARTELLE_PUBBLICHE) {
    for (const file of routeFiles(join(API, sub))) {
      const code = readFileSync(file, 'utf8')
      // Una «scrittura»: esporta POST/PUT/PATCH/DELETE, oppure una GET che muta
      // (disiscrizione via link). Qui: qualunque metodo che muta.
      const scrive = /export async function (POST|PUT|PATCH|DELETE)/.test(code)
        || /disiscrivi\(/.test(code)   // unsubscribe muta anche via GET
      if (!scrive) continue
      const rel = file.replace(API, 'api').replace(/\\/g, '/')
      if (ESENTI.has(rel)) continue
      controllate++
      if (!/rateLimit\(/.test(code)) mancanti.push(rel)
    }
  }
  esito(mancanti.length === 0, `tutte le ${controllate} scritture pubbliche hanno rateLimit()`, mancanti.length ? `SENZA LIMITE: ${mancanti.join(', ')}` : '')
  console.log(`\n  (controllate ${controllate} route pubbliche che mutano)`)
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
}
console.log(`\n[probe] ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
process.exit(rossi ? 1 : 0)
