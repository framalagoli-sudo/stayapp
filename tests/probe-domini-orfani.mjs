// Hostname agganciati a Vercel che nessuno rivendica.
//
// La tabella `domini` è l'unica memoria che un indirizzo è nostro. Se la riga
// sparisce mentre l'hostname resta collegato al progetto, quell'indirizzo
// diventa **invisibile**: nessuna query può più trovarlo, perché la cosa da
// interrogare non c'è più. L'unico modo di scoprirlo è chiedere a Vercel cosa
// ha, e confrontare.
//
// Non è un problema teorico: `futura-club-spiagge-bianche.oltrenova.com` è
// rimasto agganciato dopo la cancellazione dell'entità e — verificato il
// 09/09/2026 — risponde **200 servendo la landing marketing di OltreNova**.
// Non un 404: un indirizzo col nome di un ex cliente che pubblicizza noi.
// La causa a monte è chiusa (`lib/domini-manutenzione.js` ora libera Vercel
// prima di cancellare la riga); questa sonda serve per quelli già rimasti.
//
// ⚠️ Di default SIMULA. Togliere un hostname è irreversibile per chi lo stava
// usando, e questa sonda non ha modo di sapere se qualcuno ha stampato un QR
// che ci punta: `--esegui` lo si scrive a mano, dopo aver letto l'elenco.
//
// Servono due righe in tests/.env.test (si copiano da Vercel → Settings):
//   VERCEL_TOKEN=...
//   VERCEL_PROJECT_ID=...
//
// Uso: node probe-domini-orfani.mjs            → elenca e basta
//      node probe-domini-orfani.mjs --esegui   → li stacca davvero
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { pathToFileURL } from 'url'

config({ path: '.env.test' })

const TOKEN = process.env.VERCEL_TOKEN?.trim()
const PROGETTO = process.env.VERCEL_PROJECT_ID?.trim()
// Il progetto sta su un team: senza teamId l'API risponde che non esiste.
const TEAM = process.env.VERCEL_TEAM_ID?.trim()
const conTeam = p => p + (TEAM ? (p.includes('?') ? '&' : '?') + 'teamId=' + TEAM : '')
const ESEGUI = process.argv.includes('--esegui')

// ⛔ Non si toccano mai, nemmeno con --esegui: sono la piattaforma, non un
// cliente. Staccarne uno manda giù tutto, e un elenco di eccezioni scritto a
// mano è più affidabile di qualunque euristica sul nome.
const DI_SISTEMA = [
  'oltrenova.com',
  'www.oltrenova.com',
  '*.oltrenova.com',
]
const diSistema = h => DI_SISTEMA.includes(h) || h.endsWith('.vercel.app')

// Funzione pura, così si può provare senza chiamare nessuno.
export function trovaOrfani(hostnameVercel, righeDb) {
  const nostri = new Set()
  for (const r of righeDb) {
    if (r.dominio) nostri.add(r.dominio.toLowerCase())
    if (r.variante_dominio) nostri.add(r.variante_dominio.toLowerCase())
  }
  return hostnameVercel
    .map(h => String(h).toLowerCase())
    .filter(h => !diSistema(h) && !nostri.has(h))
}

async function chiediAVercel(path, method = 'GET') {
  // Dieci righe invece di importare `lib/vercel-domains.js`: quel file è ESM
  // dentro un pacchetto CommonJS e da qui non si carica.
  const res = await fetch(`https://api.vercel.com${conTeam(path)}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}` },
    signal: AbortSignal.timeout(20000),
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok && !data?.error, status: res.status, data, error: data?.error?.message || null }
}

// Eseguita solo quando la sonda è lanciata direttamente: importandola per
// provare `trovaOrfani` non deve partire niente.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!TOKEN || !PROGETTO) {
    console.log('\nVERCEL_TOKEN / VERCEL_PROJECT_ID non presenti in tests/.env.test.')
    console.log('Non posso chiedere a Vercel cosa ha: questa sonda non può dire niente.')
    console.log('(Non è un guasto del sistema — è una credenziale che manca qui.)\n')
    process.exit(0)
  }

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } })

  let hostname = []
  let since = null
  for (let giro = 0; giro < 20; giro++) {
    const r = await chiediAVercel(`/v10/projects/${PROGETTO}/domains?limit=100${since ? `&until=${since}` : ''}`)
    if (!r.ok) { console.error('ERRORE Vercel:', r.error || r.status); process.exit(1) }
    const pagina = r.data?.domains || []
    hostname.push(...pagina.map(d => d.name))
    since = r.data?.pagination?.next
    if (!since || pagina.length === 0) break
  }

  const { data: righe, error } = await admin.from('domini').select('dominio, variante_dominio')
  if (error) { console.error('ERRORE database:', error.message); process.exit(1) }

  const orfani = trovaOrfani(hostname, righe || [])
  console.log(`\nSu Vercel: ${hostname.length} hostname · nel database: ${(righe || []).length} righe\n`)

  if (!orfani.length) {
    console.log('Nessun hostname senza padrone: Vercel e database dicono la stessa cosa.\n')
    process.exit(0)
  }

  console.log(`${orfani.length} hostname che nessuno rivendica:\n`)
  for (const h of orfani) {
    let cosaRisponde = ''
    try {
      const r = await fetch(`https://${h}/`, { redirect: 'manual', signal: AbortSignal.timeout(12000) })
      cosaRisponde = `risponde HTTP ${r.status}`
    } catch { cosaRisponde = 'non risponde' }
    console.log(`  · ${h}  — ${cosaRisponde}`)
  }

  if (!ESEGUI) {
    console.log('\nSimulazione: non è stato staccato niente.')
    console.log('Per staccarli davvero: node probe-domini-orfani.mjs --esegui\n')
    process.exit(0)
  }

  console.log('\nStacco dal progetto:\n')
  let falliti = 0
  for (const h of orfani) {
    const r = await chiediAVercel(`/v9/projects/${PROGETTO}/domains/${encodeURIComponent(h)}`, 'DELETE')
    console.log(`  ${r.ok ? '✓' : '✗'} ${h}${r.ok ? '' : ' — ' + (r.error || r.status)}`)
    if (!r.ok) falliti++
  }
  console.log()
  process.exit(falliti ? 1 : 0)
}
