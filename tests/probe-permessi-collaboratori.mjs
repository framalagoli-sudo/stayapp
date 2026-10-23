// Sonda: un collaboratore della STESSA azienda, senza permessi, cosa legge e
// cosa tocca?
//
// Le altre sonde chiedono «un'altra azienda entra?». Questa chiede l'altra
// metà: dentro l'azienda giusta, il collaboratore a cui il titolare non ha
// dato «Contatti» legge comunque i contatti? È la classe che il 05/10/2026 ha
// lasciato uscire la rubrica intera a chi non aveva il permesso: il menu
// nascondeva la voce, la route rispondeva lo stesso.
//
// Crea un'azienda «ZZ-COLLAB-…» con un oggetto di ogni tipo
// (`probe-azienda-popolata.mjs`), un collaboratore SENZA nessun permesso e uno
// con TUTTI. Poi:
//   1. il collaboratore senza permessi bussa a ogni porta che legge: se una
//      risposta contiene i dati dell'azienda, li ha letti;
//   2. bussa a ogni porta che scrive (tranne quelle che parlano con fornitori
//      esterni, elencate sotto col motivo): se una risponde 2xx o cambia una
//      riga, ha scritto;
//   3. il rovescio: chi ha tutti i permessi legge quello che legge il titolare
//      — una correzione che chiudesse anche lui sarebbe un guasto.
//
// Tutti i recapiti sono finti: anche se una porta cedesse, nessuna email
// arriva a qualcuno. Cancella tutto con `cancellaAziendaDiProva`.
//
// Uso: cd tests && node probe-permessi-collaboratori.mjs [--verbose]
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'
import { a, M, t, API, elencaRoute, creaAzienda, popola, NON_PROVATE, percorsi } from './probe-azienda-popolata.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const verbose = process.argv.includes('--verbose')

// Pubbliche per costruzione: rispondono a chiunque, collaboratore compreso.
const PUBBLICA = /^(guest|public|cron|webhooks?$|resend-webhook|whatsapp\/webhook|stripe\/webhook|shop\/webhook|auth\/(forgot-password|reset-password|signup|signup-status)|contatti\/subscribe|client-error|upload$|llms|manifest|sitemap|newsletter\/archive|form-builder\/public|preventivi\/public|blog\/public|booking\/public|loyalty\/public|shop\/public|requests\/public|landing-seo|google-calendar\/callback)/

// Porte che scrivono e che qui NON si provano, perché il loro effetto esce dal
// nostro database: creerebbero un conto Stripe vero, un indirizzo su Vercel,
// un'email, una chiamata all'AI a pagamento. Il loro controllo sul ruolo si
// guarda nel codice (vedi SECURITY-CHECK.md, aggiornamento 23/10/2026).
const NON_SI_SCRIVE = [
  /^stripe\//, /^whatsapp\/connect/, /^domini/, /^help\/segnala/, /^ai\//, /^pagine\/\[id\]\/ai-/,
  /^site-templates\/ai-fill/, /^entita\/\[id\]\/seo-proposta/, /^club\/regia/, /^users\/invite/,
  /^users\/\[id\]\/resend-invite/, /^pagamenti\/link/, /^(attivita|properties|ristoranti)$/,
  /^onboarding\//, /^resoconti\/anteprima/, /^admin\/(backup|diagnostica)/, /^newsletter\/\[id\]\/(send|invia)/,
  /^aziende$/, /^users$/,
]

// Chi ha TUTTI i permessi del pannello Collaboratori. Le chiavi sono quelle di
// `StaffPage.jsx`: se lì se ne aggiunge una, va aggiunta qui.
const TUTTI_I_PERMESSI = Object.fromEntries([
  'richieste', 'prenotazioni', 'booking', 'eventi', 'recensioni', 'survey', 'contatti', 'newsletter', 'blog',
  'automazioni', 'piano_editoriale', 'content_studio', 'preventivi', 'form_builder', 'shop', 'loyalty', 'analytics',
  'struttura', 'ristorante', 'attivita_gestione',
].map(k => [k, true]))

// Porte del solo titolare: il collaboratore con tutti i permessi non le legge,
// e va bene così (gestione dei collaboratori, incassi, integrazioni, indirizzi).
const SOLO_TITOLARE = /^(users|aziende|stripe|webhooks|domini|whatsapp\/connect|resoconti|onboarding|pagamenti$|admin\/backup)/

async function collaboratore(A, etichetta, permissions) {
  const email = `zz-collab-${etichetta}-${t}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error('collaboratore: ' + error.message)
  await a.from('profiles').upsert({ id: u.user.id, role: 'staff', full_name: `ZZ ${etichetta}`, azienda_id: A.az, permissions }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return { user: u.user.id, token: s.session.access_token }
}

async function chiama(path, token, metodo) {
  try {
    const r = await fetch(BASE + path, {
      method: metodo, redirect: 'manual',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(metodo === 'GET' ? {} : { body: JSON.stringify({ testo: 'ZZ-S', nome: 'ZZ-S', titolo: 'ZZ-S', title: 'ZZ-S' }) }),
      signal: AbortSignal.timeout(30000),
    })
    return { status: r.status, corpo: await r.text().catch(() => '') }
  } catch (e) { return { status: 0, corpo: e.message } }
}

const ok = s => s >= 200 && s < 300
let A = null, S0 = null, ST = null, rossi = 0
const letture = [], scritture = [], rovescio = [], saltate = []
try {
  A = await creaAzienda('A', 'COLLAB')
  const R = await popola(A)
  S0 = await collaboratore(A, 'nessuno', {})
  ST = await collaboratore(A, 'tutti', TUTTI_I_PERMESSI)

  const prove = []
  for (const r of elencaRoute(API)) {
    if (PUBBLICA.test(r.route)) continue
    let path = '/api/' + r.route
    if (r.route.includes('[')) {
      if (NON_PROVATE[r.route]) { saltate.push(`${r.route} (${NON_PROVATE[r.route]})`); continue }
      const p = percorsi(r.route, A, R)
      if (!p) { saltate.push(`${r.route} (nessun oggetto di prova)`); continue }
      path = p.vero
    }
    for (const m of r.metodi) prove.push({ route: r.route, path, metodo: m })
  }
  console.log(`porte da provare: ${prove.length} (porta·metodo)\n`)

  // ── 1. Cosa legge chi non ha nessun permesso ─────────────────────────────────
  for (const pr of prove.filter(x => x.metodo === 'GET')) {
    const r = await chiama(pr.path, S0.token, 'GET')
    if (r.corpo.includes(M)) letture.push(`GET /api/${pr.route} → ${r.status}`)
    else if (verbose) console.log(`  · GET /api/${pr.route} → ${r.status}`)
  }

  // ── 3. Il rovescio (prima delle scritture, che possono cancellare) ───────────
  // Le richieste un collaboratore le legge solo per la SUA struttura
  // (`userCanAccessProperty` guarda `profiles.property_id`, retaggio del ruolo
  // admin_struttura): con il permesso «Richieste» e nessuna struttura assegnata
  // la lista arriva vuota. È un limite di funzione, non una fuga; segnalato il
  // 23/10/2026 e lasciato com'è finché non c'è un collaboratore vero che lo usa.
  const ROVESCIO_NOTO = /^requests$/
  for (const pr of prove.filter(x => x.metodo === 'GET' && !SOLO_TITOLARE.test(x.route) && !ROVESCIO_NOTO.test(x.route))) {
    const titolare = await chiama(pr.path, A.token, 'GET')
    if (!titolare.corpo.includes(M)) continue
    const tutti = await chiama(pr.path, ST.token, 'GET')
    if (!tutti.corpo.includes(M)) rovescio.push(`GET /api/${pr.route} · titolare ${titolare.status}, collaboratore con tutti i permessi ${tutti.status}`)
  }

  // Le letture incrociate che il pannello fa davvero, con UN permesso solo:
  // ognuna è una pagina che si romperebbe se la regola diventasse più stretta.
  const INCROCI = [
    ['eventi', `/api/vetrine?entity_tipo=attivita&entity_id=${A.ent}`, 'le offerte scelgono un elemento di vetrina'],
    ['eventi', `/api/vetrina-elementi?vetrina_id=${R.vetrina}`, 'le offerte scelgono un elemento di vetrina'],
    ['prenotazioni', `/api/booking/prenotazioni?azienda_id=${A.az}`, 'la pagina Prenotazioni'],
    ['prenotazioni', `/api/eventi/riepilogo?azienda_id=${A.az}`, 'la pagina Prenotazioni mostra gli eventi'],
    ['content_studio', `/api/piano-editoriale?azienda_id=${A.az}`, 'lo Studio contenuti legge il piano'],
    ['preventivi', `/api/contatti?azienda_id=${A.az}`, 'il preventivo sceglie il destinatario'],
    ['attivita_gestione', `/api/form-builder?entity_tipo=attivita&entity_id=${A.ent}`, "l'editor del sito sceglie un modulo"],
    ['attivita_gestione', `/api/offerte?azienda_id=${A.az}`, "l'editor del sito sceglie un'offerta"],
    ['attivita_gestione', `/api/booking/risorse?azienda_id=${A.az}`, "l'editor del sito sceglie una risorsa"],
  ]
  for (const perm of [...new Set(INCROCI.map(x => x[0]))]) {
    const S = await collaboratore(A, `solo-${perm.replace(/_/g, '-')}`, { [perm]: true })
    try {
      for (const [p, path, perche] of INCROCI.filter(x => x[0] === perm)) {
        const r = await chiama(path, S.token, 'GET')
        if (!ok(r.status)) rovescio.push(`GET ${path.split('?')[0]} · solo «${p}» → ${r.status} (${perche})`)
      }
    } finally { await a.auth.admin.deleteUser(S.user).catch(() => {}) }
  }

  // ── 2. Cosa scrive chi non ha nessun permesso ────────────────────────────────
  const fotografia = {}
  const senzaDate = r => JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !/updated_at|_aggiornat/.test(k))))
  for (const [tab, id] of R._righe) {
    const { data } = await a.from(tab).select('*').eq('id', id).single()
    fotografia[`${tab}:${id}`] = senzaDate(data)
  }
  const ordine = { PATCH: 1, PUT: 1, POST: 2, DELETE: 3 }
  const daScrivere = prove.filter(x => x.metodo !== 'GET').sort((x, y) => ordine[x.metodo] - ordine[y.metodo])
  for (const pr of daScrivere) {
    if (NON_SI_SCRIVE.some(re => re.test(pr.route))) { saltate.push(`${pr.metodo} ${pr.route} (effetto fuori dal database)`); continue }
    const r = await chiama(pr.path, S0.token, pr.metodo)
    if (ok(r.status)) scritture.push(`${pr.metodo} /api/${pr.route} → ${r.status} ${r.corpo.slice(0, 120)}`)
    else if (verbose) console.log(`  · ${pr.metodo} /api/${pr.route} → ${r.status} ${r.corpo.slice(0, 80)}`)
  }
  for (const [tab, id] of R._righe) {
    const { data } = await a.from(tab).select('*').eq('id', id).maybeSingle()
    if (!data) scritture.push(`una riga di «${tab}» non c'è più dopo le richieste del collaboratore senza permessi`)
    else if (senzaDate(data) !== fotografia[`${tab}:${id}`]) scritture.push(`una riga di «${tab}» è cambiata dopo le richieste del collaboratore senza permessi`)
  }

  const blocco = (titolo, righe) => {
    if (!righe.length) { console.log(`✓ ${titolo}: nessuna`); return }
    rossi += righe.length
    console.log(`✗ ${titolo}: ${righe.length}`)
    for (const x of [...new Set(righe)]) console.log(`    ${x}`)
  }
  blocco('porte che LEGGONO per chi non ha permessi', letture)
  blocco('porte che SCRIVONO per chi non ha permessi', scritture)
  blocco('porte CHIUSE a chi ha tutti i permessi (ma aperte al titolare)', rovescio)
  if (verbose) console.log(`\nnon provate (${saltate.length}):\n  ${saltate.join('\n  ')}`)
} catch (e) {
  rossi++; console.error('ERRORE:', e.message)
} finally {
  for (const x of [S0, ST, A]) if (x) await a.auth.admin.deleteUser(x.user).catch(() => {})
  if (A) await cancellaAziendaDiProva(A.az).catch(e => console.error('pulizia:', e.message))
  console.log('\n[probe] azienda di prova eliminata')
  process.exitCode = rossi ? 1 : 0
}
