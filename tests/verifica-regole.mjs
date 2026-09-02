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

// Un commento che NOMINA il client di servizio non lo importa.
//
// Senza questo, un file scritto apposta per il browser veniva segnalato per la
// riga in cui spiegava perché NON tocca il server: l'avviso suonava proprio
// addosso a chi aveva fatto la cosa giusta. E un allarme che suona a vuoto è il
// modo più rapido di insegnare a ignorarlo.
//
// ⚠️ Si tolgono i blocchi /* */ e le righe che **iniziano** con //. Tagliare da
// metà riga in poi mangerebbe il codice dopo un 'https://…' e renderebbe cieca
// la regola: meglio un falso positivo raro che un falso negativo silenzioso.
function senzaCommenti(testo) {
  return testo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .filter(r => !/^\s*\/\//.test(r))
    .join('\n')
}

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
        const dentro = senzaCommenti(readFileSync(p, 'utf8'))
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

// ── 8. Una sonda non lavora MAI sui dati di un cliente vero ────────────────
//
// Il 02/09/2026 `probe-recensioni.mjs` prendeva «la prima entità attiva che
// trovo» — cioè un cliente — e il caso «due stelle» fa partire per posta un
// avviso al titolare. È arrivata a un cliente reale una recensione inventata,
// e il proprietario ha telefonato a Francesco.
//
// ⚠️ Un'email mandata non si richiama indietro: non basta che la sonda pulisca
// il database dopo. E non basta nemmeno la buona volontà di chi la scrive — la
// riga incriminata sembrava innocua, era solo un `.limit(1)`.
//
// Una sonda si crea la propria azienda e la propria entità, e le cancella.
// Se davvero deve leggere un'entità esistente (solo per guardare, senza
// scrivere e senza far partire niente), lo dichiara con `regola-ok: <motivo>`.
const SONDE = join(RADICE, 'tests')
for (const f of readdirSync(SONDE).filter(n => /^probe-.*\.mjs$/.test(n))) {
  const p = join(SONDE, f)
  if (!interessa(p)) continue
  const rr = readFileSync(p, 'utf8').split('\n')
  rr.forEach((r, i) => {
    // Pesca un'entità o un'azienda esistente senza dire quale: è il gesto che
    // ha fatto scrivere a un cliente vero.
    const pesca = /\.from\(['"](entita|aziende|properties|ristoranti|attivita)['"]\)/.test(r)
    if (!pesca) return
    const contesto = rr.slice(i, Math.min(rr.length, i + 4)).join(' ')
    // ⚠️ Il gesto pericoloso è UNO SOLO: prendere «una qualsiasi». Rileggere
    // un'entità di cui si ha già l'id è normale e va lasciato passare, o la
    // regola suonerebbe a ogni riga — e un allarme che suona sempre viene
    // ignorato anche quando ha ragione.
    if (/\.eq\(\s*['"](id|slug)['"]/.test(contesto)) return
    if (!/\.limit\(\s*\d+\s*\)|maybeSingle\(\)|\.single\(\)/.test(contesto)) return
    // Creare o cancellare la propria è esattamente ciò che deve fare.
    if (/\.insert\(|\.delete\(|\.update\(/.test(contesto)) return
    // Un filtro sul marchio ZZ dice che sta cercando roba sua.
    if (/ZZ-|ZZ |playwright\.internal/.test(contesto)) return
    if (dichiarataOk(rr, i)) return
    segnala('sonda che pesca un cliente vero', p, i + 1, r.trim().slice(0, 90),
      'una sonda che scrive o fa partire notifiche su un\'entità reale manda email a persone reali, e quelle non si richiamano indietro')
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

// ── 📘 un collegamento nuovo verso l'esterno va scritto in PROGETTO.md ──────
//
// `PROGETTO.md` esiste per una persona che non ha mai visto questo sistema e
// deve prenderlo in mano — un erede, un socio, un acquirente. Vale finché è
// vero, e invecchia in un modo solo: **qualcuno collega un fornitore nuovo e
// nessuno lo scrive**. Da lì in poi il documento mente, e mente proprio nel
// punto che conta: l'elenco di chi tiene acceso il servizio.
//
// Una regola a calendario («rivedilo ogni sei mesi») si dimentica. Questo è
// l'evento che conta davvero: una **variabile d'ambiente nuova** è quasi sempre
// un fornitore nuovo o un collegamento nuovo verso l'esterno.
function collegamentiNonDocumentati() {
  let progetto = ''
  try { progetto = readFileSync(join(RADICE, 'PROGETTO.md'), 'utf8') } catch { return [] }

  // Non sono fornitori: indirizzi del servizio stesso e interruttori interni.
  // Stanno fuori perché citarli nel documento non aiuterebbe nessuno a capire
  // da chi dipende OltreNova.
  const NON_FORNITORI = [
    'APP_URL', 'CLIENT_URL', 'STAYAPP_DOMAIN', 'VERCEL_URL',
    'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_STAYAPP_DOMAIN',
    'NEXT_INTERNAL_API_URL', 'NODE_ENV',
    'TURNSTILE_SOFT', 'TURNSTILE_STRICT', 'TURNSTILE_TEST_BYPASS',
  ]

  const usate = new Set()
  for (const p of file) {
    const testo = readFileSync(p, 'utf8')
    for (const m of testo.matchAll(/process\.env\.([A-Z0-9_]+)/g)) usate.add(m[1])
  }
  return [...usate].filter(v => !NON_FORNITORI.includes(v) && !progetto.includes(v)).sort()
}

const nonDocumentati = collegamentiNonDocumentati()
if (nonDocumentati.length) {
  console.log('\n' + '='.repeat(70))
  console.log('  📘 UN COLLEGAMENTO NUOVO NON È SCRITTO IN PROGETTO.md')
  console.log('='.repeat(70) + '\n')
  for (const v of nonDocumentati) console.log(`  · ${v}`)
  console.log('\n  Una variabile nuova è quasi sempre un fornitore nuovo. PROGETTO.md')
  console.log('  serve a chi prende in mano il sistema senza averlo mai visto: se')
  console.log('  l\'elenco dei fornitori è incompleto, il documento mente proprio')
  console.log('  nel punto che conta.')
  console.log('\n  Aggiungila alla tabella delle chiavi (§8) dicendo dove si')
  console.log('  rigenera e cosa si rompe se manca — mai il valore.')
  console.log('  Se non è un fornitore, aggiungila a NON_FORNITORI qui sopra.\n')
  process.exit(1)
}

// ── ⛔ il cancello: cosa sto togliendo al cliente? ──────────────────────────
//
// Il 29/08/2026 ho tolto la voce «Risorse» dal menu convinto che «Offerte» la
// sostituisse. Non era vero, e Francesco si è ritrovato senza il posto in cui
// configurava quello che vende. La regola c'era, scritta da me due giorni
// prima, e non è servita: **le regole scritte sono passive**, si leggono a
// inizio sessione e poi non si rileggono.
//
// Questo invece è un cancello: gira da solo prima di ogni deploy e non dipende
// da chi si ricorda. Guarda cosa i commit non ancora pubblicati **tolgono** —
// voci di menu, pagine, route — e si ferma finché Francesco non ha autorizzato.
//
// Aggiungere è reversibile, togliere no: chi cercava quella voce non la trova e
// non sa dove guardare. E nel frattempo non lavora.
function cosaSparisce() {
  let diff = ''
  try {
    // I commit fatti e non ancora pubblicati: è esattamente ciò che il deploy
    // sta per mandare in produzione.
    diff = execSync('git diff origin/main...HEAD -- client-next', { cwd: RADICE, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  } catch {
    // Nessun remoto, o primo commit: non c'è niente da confrontare, e un
    // controllo che non può misurare non deve inventarsi un esito.
    return []
  }
  if (!diff.trim()) return []

  const persi = []
  let fileCorrente = ''
  for (const riga of diff.split('\n')) {
    const f = riga.match(/^\+\+\+ b\/(.+)/)
    if (f) { fileCorrente = f[1]; continue }
    if (!riga.startsWith('-') || riga.startsWith('---')) continue

    // Una voce di menu tolta.
    const nav = riga.match(/label="([^"]+)"/) || riga.match(/label:\s*'([^']+)'/)
    if (nav && /<NavItem|sub:\s*'/.test(riga)) persi.push({ cosa: `la voce «${nav[1]}»`, dove: fileCorrente })

    // Una funzione tolta dal catalogo che il cliente accende e spegne.
    const fn = riga.match(/chiave:\s*'([^']+)'.*titolo:\s*'([^']+)'/)
    if (fn) persi.push({ cosa: `la funzione «${fn[2]}»`, dove: fileCorrente })
  }

  // Pagine e route cancellate: qui il file sparisce del tutto.
  try {
    const tolti = execSync('git diff --diff-filter=D --name-only origin/main...HEAD -- client-next', { cwd: RADICE, encoding: 'utf8' })
    for (const f of tolti.split('\n').filter(Boolean)) {
      if (/app\/.*\/page\.js$/.test(f)) persi.push({ cosa: 'una pagina', dove: f })
      if (/app\/api\/.*\/route\.js$/.test(f)) persi.push({ cosa: 'una route API', dove: f })
    }
  } catch { /* già gestito sopra */ }

  return persi
}

// L'autorizzazione si dichiara nel messaggio di commit: `autorizzato: <motivo>`.
// Nel messaggio e non in un file, perché resta attaccata **a quel** cambiamento
// e si rilegge nella storia fra sei mesi.
function autorizzazioneNeiCommit() {
  try {
    const msg = execSync('git log origin/main..HEAD --format=%B', { cwd: RADICE, encoding: 'utf8' })
    const m = msg.match(/autorizzato:\s*(.+)/i)
    return m && m[1].trim().length > 8 ? m[1].trim() : null
  } catch { return null }
}

const sparisce = cosaSparisce()
if (sparisce.length) {
  const autorizzato = autorizzazioneNeiCommit()
  if (autorizzato) {
    console.log(`\n  ⛔→✓ ${sparisce.length} cose sparirebbero, ma è autorizzato: «${autorizzato}»\n`)
  } else {
    console.log('\n' + '='.repeat(70))
    console.log('  ⛔ QUESTO DEPLOY TOGLIE QUALCOSA AL CLIENTE')
    console.log('='.repeat(70) + '\n')
    for (const p of sparisce) console.log(`  · ${p.cosa}  —  ${p.dove}`)
    console.log('\n  Aggiungere è reversibile, togliere no: chi cercava quella voce')
    console.log('  non la trova e non sa dove guardare. E nel frattempo non lavora.')
    console.log('\n  Prima di procedere serve il permesso di Francesco. Portagli:')
    console.log('    · cosa cambia   · cosa vedrà lui   · cosa si perde se sbaglio')
    console.log('\n  Se una porta nuova sostituisce la vecchia, verificare che faccia')
    console.log('  TUTTO quello che faceva — non la metà.')
    console.log('\n  Quando ha detto sì, scriverlo nel commit:  autorizzato: <motivo>\n')
    process.exit(1)
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
