// Da questo archivio si torna in piedi?
//
// `verifica-backup.mjs` dice che il file è leggibile e completo. Questo prova
// l'altra metà, che è quella che conta il giorno brutto: prendere l'archivio e
// **rimettere in piedi il servizio** su un progetto vuoto. Le due domande sono
// diverse, e la seconda non l'ha mai provata nessuno.
//
// COME SI USA
//   1. Crea un progetto Supabase NUOVO (piano gratuito, regione EU) e scrivi le
//      sue credenziali in `tests/.env.ripristino` — mai in git, mai in chat:
//        RIPRISTINO_SUPABASE_URL=https://xxxx.supabase.co
//        RIPRISTINO_SERVICE_ROLE_KEY=...
//        RIPRISTINO_DB_URL=postgresql://postgres:<password>@db.xxxx.supabase.co:5432/postgres
//   2. Scarica l'ultimo backup da R2 (Cloudflare → R2 → bucket → Download)
//   3. node ripristino.mjs C:\percorso\backup-2026-09-12.json.gz          ← simula
//      node ripristino.mjs C:\percorso\backup-2026-09-12.json.gz --esegui ← esegue
//
// ⛔ LA SICURA. Lo script si rifiuta di scrivere se il bersaglio è la
// produzione, e il controllo sta nel codice — non nell'attenzione di chi lo
// lancia alle tre di notte. Il confronto è sul «project ref», la parte che
// identifica il progetto dentro l'indirizzo Supabase.
//
// Cosa NON fa, e va saputo: le immagini dei clienti stanno su R2 accanto
// all'archivio, e ricaricarle nel progetto nuovo richiede le chiavi di R2.
// Questo script rimette in piedi i DATI; le foto sono un secondo giro.

import { readFileSync, existsSync, readdirSync } from 'fs'
import { gunzipSync } from 'zlib'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import pg from 'pg'

const QUI = dirname(fileURLToPath(import.meta.url))
config({ path: join(QUI, '.env.test') })
config({ path: join(QUI, '.env.ripristino') })

const ESEGUI = process.argv.includes('--esegui')
const percorso = process.argv.find(a => a.endsWith('.gz') || a.endsWith('.json'))
const cronometro = {}
const T = nome => { const t0 = Date.now(); return () => { cronometro[nome] = ((Date.now() - t0) / 1000).toFixed(1) + 's' } }

function esci(messaggio) { console.error(`\n⛔ ${messaggio}\n`); process.exit(1) }
const refDi = url => (String(url || '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] || '').toLowerCase()

// ── La sicura ────────────────────────────────────────────────────────────────
const PROD = process.env.SUPABASE_URL
const BERSAGLIO = process.env.RIPRISTINO_SUPABASE_URL
const CHIAVE = process.env.RIPRISTINO_SERVICE_ROLE_KEY
const DB = process.env.RIPRISTINO_DB_URL

if (!percorso || !existsSync(percorso)) esci('Manca il file dell’archivio. Uso: node ripristino.mjs <backup.json.gz> [--esegui]')
if (!BERSAGLIO || !CHIAVE) esci('Manca tests/.env.ripristino (RIPRISTINO_SUPABASE_URL, RIPRISTINO_SERVICE_ROLE_KEY, RIPRISTINO_DB_URL)')
const refProd = refDi(PROD), refBersaglio = refDi(BERSAGLIO)
if (!refBersaglio) esci(`Non riconosco il progetto bersaglio da RIPRISTINO_SUPABASE_URL (${BERSAGLIO})`)
if (refProd && refProd === refBersaglio) esci('IL BERSAGLIO È LA PRODUZIONE. Questo script non scrive lì, mai.')
if (DB && refProd && DB.includes(refProd)) esci('RIPRISTINO_DB_URL punta al database di PRODUZIONE. Fermo qui.')

// ── L'archivio ───────────────────────────────────────────────────────────────
const fine0 = T('lettura archivio')
const grezzo = percorso.endsWith('.gz') ? gunzipSync(readFileSync(percorso)) : readFileSync(percorso)
const archivio = JSON.parse(grezzo.toString('utf8'))
fine0()
const tabelle = archivio.tables || {}
const account = Array.isArray(archivio.accounts) ? archivio.accounts : []
const conDati = Object.entries(tabelle).filter(([, v]) => Array.isArray(v) && v.length)
const righeTotali = conDati.reduce((n, [, v]) => n + v.length, 0)

console.log('\n' + '='.repeat(64))
console.log(`  RIPRISTINO ${ESEGUI ? '— ESECUZIONE' : '— SIMULAZIONE (non scrive niente)'}`)
console.log('='.repeat(64))
console.log(`\n  archivio  : ${percorso}`)
console.log(`  esportato : ${archivio._meta?.exported_at || '?'}`)
console.log(`  contenuto : ${conDati.length} tabelle con dati, ${righeTotali} righe, ${account.length} account`)
console.log(`  bersaglio : ${BERSAGLIO}  (produzione: ${refProd || '?'} — diversa ✓)`)
console.log(`  immagini  : ${archivio._meta?.media?.totali ?? '?'} su R2, NON toccate da questo script\n`)

// ── L'ordine di caricamento ──────────────────────────────────────────────────
// Dichiarato in INCIDENTE.md e non inventato qui: chi arriva dopo deve trovare
// la stessa sequenza nei due posti. Gli account vengono PRIMA dei profili:
// `profiles.id` è l'id dell'utente, e senza utente il profilo non entra.
const ORDINE = ['aziende', 'entita', 'properties', 'ristoranti', 'attivita', 'profiles',
  'collegamenti', 'pagine', 'domini', 'contatti']
const restanti = Object.keys(tabelle).filter(t => !ORDINE.includes(t))

if (!ESEGUI) {
  console.log('  COSA FAREBBE, in quest’ordine:\n')
  console.log('   1. schema      — ' + readdirSync(join(QUI, '..', 'supabase', 'migrations')).filter(f => f.endsWith('.sql')).length + ' migration, una per una')
  console.log('   2. account     — ' + account.length + ' utenti, conservando il loro id')
  console.log('   3. dati        — ' + ORDINE.filter(t => tabelle[t]?.length).join(', '))
  console.log('                    poi: ' + restanti.filter(t => tabelle[t]?.length).join(', '))
  console.log('   4. verifica    — conteggi a confronto e contenuti guardati dentro\n')
  console.log('  Per eseguire davvero: aggiungi --esegui\n')
  process.exit(0)
}

const sb = createClient(BERSAGLIO, CHIAVE, { auth: { autoRefreshToken: false, persistSession: false } })
const esiti = { schema: { ok: 0, ko: [] }, account: { ok: 0, ko: [] }, dati: {}, }

// ── 1. Lo schema ─────────────────────────────────────────────────────────────
if (!DB) {
  console.log('  ⚠ RIPRISTINO_DB_URL non c’è: salto lo schema (serve per eseguire le migration).\n')
} else {
  const fine = T('schema')
  const client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const file = readdirSync(join(QUI, '..', 'supabase', 'migrations')).filter(f => f.endsWith('.sql')).sort()
  console.log(`  1. SCHEMA — ${file.length} migration\n`)
  for (const f of file) {
    const sql = readFileSync(join(QUI, '..', 'supabase', 'migrations', f), 'utf8')
    try {
      await client.query(sql)
      esiti.schema.ok++
    } catch (e) {
      // Non ci si ferma alla prima: quello che serve sapere è **quante** e
      // **quali** non passano su un progetto nuovo, non solo la prima.
      esiti.schema.ko.push(`${f}: ${e.message.split('\n')[0].slice(0, 110)}`)
    }
  }
  await client.end()
  fine()
  console.log(`     ${esiti.schema.ok} eseguite, ${esiti.schema.ko.length} fallite`)
  for (const k of esiti.schema.ko.slice(0, 12)) console.log(`     ✗ ${k}`)
  if (esiti.schema.ko.length > 12) console.log(`     … e altre ${esiti.schema.ko.length - 12}`)
  console.log()
}

// ── 2. Gli account ───────────────────────────────────────────────────────────
// La domanda aperta da luglio: **si può imporre l'id a un account ricreato?**
// Se sì, i profili e tutto ciò che li riferisce restano attaccati. Se no, il
// ripristino deve riscrivere gli id ovunque — ed è bene saperlo adesso.
{
  const fine = T('account')
  console.log(`  2. ACCOUNT — ${account.length}\n`)
  let idConservati = 0
  for (const a of account) {
    if (!a.email) continue
    try {
      const { data, error } = await sb.auth.admin.createUser({
        id: a.id, email: a.email, email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),   // si entra col reset password
      })
      if (error) throw new Error(error.message)
      esiti.account.ok++
      if (data?.user?.id === a.id) idConservati++
    } catch (e) {
      esiti.account.ko.push(`${a.email}: ${e.message.slice(0, 90)}`)
    }
  }
  fine()
  console.log(`     ${esiti.account.ok} creati, ${esiti.account.ko.length} falliti`)
  console.log(`     id conservato: ${idConservati}/${esiti.account.ok} ${idConservati === esiti.account.ok && esiti.account.ok > 0 ? '✓ (i profili restano attaccati)' : '⚠ (gli id vanno riscritti ovunque)'}`)
  for (const k of esiti.account.ko.slice(0, 6)) console.log(`     ✗ ${k}`)
  console.log()
}

// ── 3. I dati ────────────────────────────────────────────────────────────────
{
  const fine = T('dati')
  console.log('  3. DATI\n')
  for (const tabella of [...ORDINE, ...restanti]) {
    const righe = tabelle[tabella]
    if (!Array.isArray(righe) || !righe.length) continue
    let entrate = 0
    const errori = []
    for (let i = 0; i < righe.length; i += 500) {
      const blocco = righe.slice(i, i + 500)
      const { error } = await sb.from(tabella).upsert(blocco, { onConflict: 'id' })
      if (error) errori.push(error.message.split('\n')[0].slice(0, 100))
      else entrate += blocco.length
    }
    esiti.dati[tabella] = { attese: righe.length, entrate, errori }
    const segno = entrate === righe.length ? '✓' : '✗'
    console.log(`     ${segno} ${tabella.padEnd(22)} ${entrate}/${righe.length}${errori.length ? '  — ' + errori[0] : ''}`)
  }
  fine()
  console.log()
}

// ── 4. La verifica ───────────────────────────────────────────────────────────
{
  console.log('  4. VERIFICA — quello che c’è davvero nel progetto nuovo\n')
  let problemi = 0
  for (const [tabella, atteso] of Object.entries(esiti.dati)) {
    const { count, error } = await sb.from(tabella).select('id', { count: 'exact', head: true })
    const ok = !error && count === atteso.attese
    if (!ok) problemi++
    console.log(`     ${ok ? '✓' : '✗'} ${tabella.padEnd(22)} ${error ? error.message.slice(0, 60) : `${count}/${atteso.attese}`}`)
  }
  // Non basta contare: un archivio con le righe giuste e i contenuti vuoti
  // passerebbe qualsiasi conteggio.
  const { data: ent } = await sb.from('entita').select('slug, name').limit(5)
  const { data: pag } = await sb.from('pagine').select('slug, blocchi').limit(5)
  console.log(`\n     entità con slug e nome : ${(ent || []).filter(e => e.slug && e.name).length}/${(ent || []).length}`)
  console.log(`     pagine con blocchi     : ${(pag || []).filter(p => Array.isArray(p.blocchi) ? p.blocchi.length : p.blocchi).length}/${(pag || []).length}`)

  console.log('\n  TEMPI:', Object.entries(cronometro).map(([k, v]) => `${k} ${v}`).join(' · '))
  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `  ${problemi} TABELLE NON TORNANO` : '  I DATI SONO TUTTI NEL PROGETTO NUOVO')
  console.log('─'.repeat(64))
  console.log('\n  Manca la prova vera: puntare l’app al progetto nuovo, aprire il')
  console.log('  sito di un cliente ed entrare nel pannello. Le righe entrate non')
  console.log('  sono ancora un servizio in piedi.\n')
}
