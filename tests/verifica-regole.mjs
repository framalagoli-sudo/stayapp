// Le nostre regole, verificate sul codice — prima che diventi produzione.
//
// Le sonde di sicurezza girano DOPO il deploy e provano il sistema vivo: sono
// il secondo muro. Questo è il primo: legge il codice e cerca le violazioni
// delle regole che ci siamo dati, ognuna nata da un difetto vero già successo.
//
// Non sostituisce il pensiero — trova solo ciò che è meccanico. Ma quello che
// trova, lo trova sempre, e non dipende da chi si ricorda.
//
// Uso:  node verifica-regole.mjs            (dalla cartella tests)
//       node verifica-regole.mjs --solo-modificati   (solo i file toccati da git)

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { execSync } from 'child_process'

const RADICE = join(process.cwd(), '..')
const APP = join(RADICE, 'client-next')

// Route che rispondono senza login perché è il loro mestiere. La stessa lista
// di probe-security-sweep.mjs: se una route è qui, è stata guardata a mano.
const PUBBLICHE_PER_MESTIERE = [
  'app/api/guest/', 'app/api/public/', '/public/', 'app/api/cron/',
  'app/api/resend-webhook/', 'app/api/whatsapp/webhook/',
  'app/api/auth/forgot-password/', 'app/api/auth/reset-password/',
  'app/api/auth/signup/', 'app/api/auth/signup-status/', 'app/api/auth/platform-config/',
  'app/api/contatti/subscribe/', 'app/api/client-error/',
  'app/api/llms/', 'app/api/manifest/', 'app/api/sitemap/', 'app/api/newsletter/archive/',
  'app/api/landing-seo/', 'app/api/google-calendar/callback/', 'app/api/upload/',
]

// Un'eccezione si può dichiarare, ma il motivo va scritto: basta un commento
// «regola-ok: perché» sulla riga sopra. Senza motivo non vale — è il modo per
// evitare che si zittisca l'allarme senza averlo guardato.
function dichiarataOk(righe, indice) {
  // Cinque righe: un motivo scritto per bene occupa più di una riga, e la
  // dichiarazione sta sopra il blocco, non necessariamente attaccata alla riga.
  const sopra = righe.slice(Math.max(0, indice - 5), indice).join('\n')
  const m = sopra.match(/regola-ok:\s*(.+)/)
  return m && m[1].trim().length > 12
}

const violazioni = []
function segnala(regola, file, riga, dettaglio, perche) {
  violazioni.push({ regola, file: relative(RADICE, file).replace(/\\/g, '/'), riga, dettaglio, perche })
}

function tuttiIFile(dir, ext = ['.js', '.jsx'], fuori = ['node_modules', '.next', '.git', 'public']) {
  const out = []
  for (const nome of readdirSync(dir)) {
    if (fuori.includes(nome)) continue
    const p = join(dir, nome)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...tuttiIFile(p, ext, fuori))
    else if (ext.some(e => nome.endsWith(e))) out.push(p)
  }
  return out
}

const soloModificati = process.argv.includes('--solo-modificati')
let filtro = null
if (soloModificati) {
  try {
    const usciti = execSync('git diff --name-only HEAD', { cwd: RADICE }).toString()
      + execSync('git diff --name-only --cached', { cwd: RADICE }).toString()
    filtro = new Set(usciti.split('\n').filter(Boolean).map(s => s.trim()))
  } catch { filtro = null }
}
const interessa = p => !filtro || filtro.has(relative(RADICE, p).replace(/\\/g, '/'))

const file = tuttiIFile(APP).filter(interessa)
const righe = f => readFileSync(f, 'utf8').split('\n')

for (const f of file) {
  const testo = readFileSync(f, 'utf8')
  const rr = testo.split('\n')
  const percorso = relative(APP, f).replace(/\\/g, '/')
  const eRoute = percorso.startsWith('app/api/') && percorso.endsWith('route.js')
  const ePubblica = PUBBLICHE_PER_MESTIERE.some(r => percorso.includes(r))
  const eClient = testo.includes("'use client'")

  // ── 1. Ogni route API si autentica, o dichiara di essere pubblica ──────────
  if (eRoute && !ePubblica) {
    const haControllo = /requireAuth|requireEntityAccess|requireRecordAccess|CRON_SECRET|verificaTokenAnteprima|svix|stripe/i.test(testo)
    const soloGet = !/export async function (POST|PATCH|PUT|DELETE)/.test(testo)
    if (!haControllo) {
      segnala('route senza controllo di accesso', f, 1,
        `nessun requireAuth/requireEntityAccess/requireRecordAccess${soloGet ? ' (solo GET)' : ''}`,
        'le route usano la chiave di servizio e scavalcano la RLS: senza controllo applicativo chiunque legge i dati di chiunque')
    }
  }

  // ── 2. Niente select('*') dove risponde anche chi non ha fatto login ──────
  if (eRoute && ePubblica) {
    rr.forEach((r, i) => {
      if (/\.select\(\s*['"]\*['"]\s*\)/.test(r) && !dichiarataOk(rr, i)) {
        segnala("select('*') su route pubblica", f, i + 1, r.trim().slice(0, 90),
          'una colonna aggiunta domani verrebbe pubblicata da sola — è già successo con il catalogo shop e con la password del WiFi')
      }
    })
  }

  // ── 3. Il browser non importa mai codice che tocca supabaseAdmin ──────────
  if (eClient) {
    const importati = [...testo.matchAll(/from '@\/lib\/([a-z0-9-]+)'/g)].map(m => m[1])
    for (const modulo of new Set(importati)) {
      const p = join(APP, 'lib', `${modulo}.js`)
      try {
        const dentro = readFileSync(p, 'utf8')
        if (/supabaseAdmin|supabase-server|SERVICE_ROLE/.test(dentro)) {
          segnala('codice server importato dal browser', f, 1, `importa lib/${modulo}.js`,
            'trascina nel bundle pubblico codice che apre la connessione con la chiave di servizio')
        }
      } catch {}
    }
    for (const segreto of ['SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'CRON_SECRET', 'STRIPE_SECRET', 'ANTHROPIC_API_KEY']) {
      if (testo.includes(segreto)) {
        segnala('segreto nominato in codice di browser', f, rr.findIndex(r => r.includes(segreto)) + 1, segreto,
          'anche se Next non lo inlina, il nome in un file client indica che qualcuno si aspetta di leggerlo lì')
      }
    }
  }

  // ── 4. `.catch()` su un query builder Postgrest non intercetta niente ─────
  rr.forEach((r, i) => {
    if (/\.(select|insert|update|delete|upsert)\([^)]*\)[^\n]*\.catch\(/.test(r)
        && /supabaseAdmin|\.from\(|supabase\./.test(r) && !dichiarataOk(rr, i)) {
      segnala('.catch() su query Supabase', f, i + 1, r.trim().slice(0, 90),
        'il query builder non è una Promise: l\'errore non viene intercettato e il fallimento passa in silenzio')
    }
  })

  // ── 5. Dopo createUser il profilo si scrive con upsert ───────────────────
  if (/auth\.admin\.createUser/.test(testo) && /from\('profiles'\)\s*\.insert\(/.test(testo)) {
    segnala('insert su profiles dopo createUser', f,
      rr.findIndex(r => /from\('profiles'\)\s*\.insert\(/.test(r)) + 1, "usare .upsert({...}, { onConflict: 'id' })",
      'un trigger ha già creato la riga: l\'insert va in chiave duplicata ed è così che la registrazione non poteva riuscire')
  }

  // ── 6. Un valore del client non finisce grezzo in una proprietà CSS ──────
  rr.forEach((r, i) => {
    const m = r.match(/(objectPosition|aspectRatio|gridTemplateColumns|backgroundImage):\s*([a-zA-Z_$][\w$.?]*)\s*[,}]/)
    if (m && !/^(rapportoDi|focal\b|\w*Style|theme|primary)/.test(m[2]) && /\.(focal|formato|ratio|posizione|custom)/i.test(m[2])) {
      segnala('valore del client dentro una proprietà CSS', f, i + 1, r.trim().slice(0, 90),
        'va fatto passare da una funzione che cerca in un catalogo chiuso, mai usato così com\'è')
    }
  })
}

// ── 7. Ogni migration nuova concede i permessi in modo esplicito ───────────
const MIG = join(RADICE, 'supabase', 'migrations')
const migrazioni = readdirSync(MIG).filter(n => n.endsWith('.sql')).sort()
const ultime = migrazioni.slice(-6)   // solo le recenti: le vecchie sono storia
for (const nome of ultime) {
  const p = join(MIG, nome)
  if (!interessa(p)) continue
  const sql = readFileSync(p, 'utf8')
  if (/CREATE TABLE/i.test(sql) && !/GRANT\s+/i.test(sql)) {
    segnala('migration senza GRANT', p, 1, nome,
      'dal 2026 i permessi non sono più impliciti: senza GRANT la tabella è irraggiungibile o, peggio, lo è troppo')
  }
  if (/CREATE TABLE/i.test(sql) && !/ENABLE ROW LEVEL SECURITY/i.test(sql)) {
    segnala('migration senza RLS', p, 1, nome,
      'la RLS è il secondo muro per le query che arrivano al database senza passare dalle route')
  }
}

// ── esito ──────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70))
console.log(`  LE NOSTRE REGOLE, SUL CODICE${soloModificati ? ' (solo i file modificati)' : ''}`)
console.log('='.repeat(70))
console.log(`\n  ${file.length} file esaminati, ${ultime.length} migration recenti\n`)

if (!violazioni.length) {
  console.log('  ✓ nessuna violazione delle regole meccaniche\n')
  console.log('  (questo non dice che il codice è sicuro: dice che non viola le')
  console.log('   regole che sappiamo controllare da soli. Il resto è pensiero.)\n')
  process.exit(0)
}

const perRegola = {}
for (const v of violazioni) (perRegola[v.regola] ||= []).push(v)
for (const [regola, elenco] of Object.entries(perRegola)) {
  console.log(`  ✗ ${regola.toUpperCase()}  (${elenco.length})`)
  console.log(`     perché: ${elenco[0].perche}`)
  for (const v of elenco.slice(0, 8)) console.log(`     · ${v.file}:${v.riga}  ${v.dettaglio}`)
  if (elenco.length > 8) console.log(`     · … e altre ${elenco.length - 8}`)
  console.log()
}
console.log('='.repeat(70))
console.log(`  ${violazioni.length} DA GUARDARE — una per una, prima di deployare`)
console.log('='.repeat(70) + '\n')
process.exit(1)
