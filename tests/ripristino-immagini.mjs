// La seconda metà del ripristino: le foto dei clienti.
//
// `ripristino.mjs` rimette in piedi i dati. Ma un sito senza immagini non è un
// sito ripristinato: il 13/09/2026 la prova ha mostrato una cosa che nessuno
// aveva previsto — **le foto sembravano funzionare**. Si vedevano solo perché
// gli indirizzi salvati nel database puntano ancora al progetto vecchio, che
// era ancora vivo. Il giorno vero sarebbero morte tutte.
//
// Quindi i passi sono DUE, e il secondo è quello che si dimentica:
//   1. rimettere i file nello Storage del progetto nuovo;
//   2. riscrivere ogni indirizzo dentro il database — in tutte le tabelle, in
//      tutte le colonne di testo e JSON, perché le foto stanno anche dentro i
//      blocchi delle pagine, nei temi, nelle gallerie.
//
// SORGENTE DELLE FOTO
//   · con le chiavi R2 in `.env.ripristino` → si scaricano dall'archivio, che è
//     quello che succederebbe davvero;
//   · senza → si leggono dallo Storage di produzione. Prova lo stesso i due
//     passi, ma NON prova che l'archivio su R2 sia leggibile: va detto.
//
// USO
//   node ripristino-immagini.mjs            ← simula
//   node ripristino-immagini.mjs --esegui   ← esegue
//
// ⛔ Stessa sicura del ripristino: non scrive mai sulla produzione.

import { createClient } from '@supabase/supabase-js'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const QUI = dirname(fileURLToPath(import.meta.url))
config({ path: join(QUI, '.env.test') })
config({ path: join(QUI, '.env.ripristino') })

const ESEGUI = process.argv.includes('--esegui')
const BUCKET = 'property-media'
const esci = m => { console.error(`\n⛔ ${m}\n`); process.exit(1) }
const refDi = u => (String(u || '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] || '').toLowerCase()

const PROD = process.env.SUPABASE_URL
const BERSAGLIO = process.env.RIPRISTINO_SUPABASE_URL
const refProd = refDi(PROD), refBers = refDi(BERSAGLIO)
if (!BERSAGLIO || !process.env.RIPRISTINO_SERVICE_ROLE_KEY) esci('Manca tests/.env.ripristino')
if (!refBers) esci('Non riconosco il progetto bersaglio')
if (refProd === refBers) esci('IL BERSAGLIO È LA PRODUZIONE. Qui non si scrive, mai.')

const sorgente = createClient(PROD, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const bersaglio = createClient(BERSAGLIO, process.env.RIPRISTINO_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// ── La sorgente: l'archivio su R2, se ci sono le chiavi ──────────────────────
// È quella vera: il giorno brutto lo Storage di produzione non c'è più, e le
// foto esistono solo nell'archivio. Sotto `media/`, con lo stesso percorso che
// avevano nello Storage — lo scrive `lib/backup.js` ogni notte.
const PREFISSO_MEDIA = 'media/'
// L'account si può incollare come sigla o come indirizzo intero
// (`https://abc123.r2.cloudflarestorage.com`): Cloudflare mostra il secondo, e
// pretendere il primo è un modo di far sbagliare chi ha fretta.
const soloSigla = v => String(v || '').trim()
  .replace(/^https?:\/\//, '').replace(/\..*$/, '').replace(/\/.*$/, '')

const r2conf = {
  account: soloSigla(process.env.RIPRISTINO_R2_ACCOUNT_ID),
  chiave: (process.env.RIPRISTINO_R2_ACCESS_KEY_ID ?? '').trim(),
  segreto: (process.env.RIPRISTINO_R2_SECRET_ACCESS_KEY ?? '').trim(),
  bucket: (process.env.RIPRISTINO_R2_BUCKET ?? '').trim(),
}
const DA_R2 = !!(r2conf.account && r2conf.chiave && r2conf.segreto && r2conf.bucket)
const r2 = DA_R2 ? new S3Client({
  region: 'auto',
  endpoint: `https://${r2conf.account}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: r2conf.chiave, secretAccessKey: r2conf.segreto },
}) : null

async function elencaDaR2() {
  const out = []
  let token
  do {
    const r = await r2.send(new ListObjectsV2Command({
      Bucket: r2conf.bucket, Prefix: PREFISSO_MEDIA, ContinuationToken: token,
    }))
    for (const o of r.Contents || []) {
      if (o.Key === PREFISSO_MEDIA) continue
      out.push({ path: o.Key.slice(PREFISSO_MEDIA.length), size: o.Size || 0, tipo: null })
    }
    token = r.IsTruncated ? r.NextContinuationToken : null
  } while (token)
  return out
}

async function scaricaDaR2(percorso) {
  const r = await r2.send(new GetObjectCommand({ Bucket: r2conf.bucket, Key: PREFISSO_MEDIA + percorso }))
  const pezzi = []
  for await (const p of r.Body) pezzi.push(p)
  return { buf: Buffer.concat(pezzi), tipo: r.ContentType || 'application/octet-stream' }
}

async function scaricaDaProduzione(percorso) {
  const { data, error } = await sorgente.storage.from(BUCKET).download(percorso)
  if (error) throw new Error(error.message)
  return { buf: Buffer.from(await data.arrayBuffer()), tipo: data.type || 'application/octet-stream' }
}

// Lo Storage non ha un elenco ricorsivo: le cartelle sono voci senza metadata
// e si scende una alla volta. Stessa logica di `lib/backup.js`.
async function elenca(prefisso = '', profondita = 0) {
  if (profondita > 4) return []
  const { data, error } = await sorgente.storage.from(BUCKET).list(prefisso, { limit: 1000 })
  if (error) throw new Error(`elenco ${prefisso || '/'}: ${error.message}`)
  const out = []
  for (const v of data || []) {
    const p = prefisso ? `${prefisso}/${v.name}` : v.name
    if (v.id) out.push({ path: p, size: v.metadata?.size ?? 0, tipo: v.metadata?.mimetype || 'application/octet-stream' })
    else out.push(...await elenca(p, profondita + 1))
  }
  return out
}

console.log('\n' + '='.repeat(64))
console.log(`  LE FOTO ${ESEGUI ? '— ESECUZIONE' : '— SIMULAZIONE (non scrive niente)'}`)
console.log('='.repeat(64))
console.log(`\n  sorgente : ${DA_R2 ? `l’ARCHIVIO su R2 (bucket ${r2conf.bucket}, cartella ${PREFISSO_MEDIA})` : `storage di produzione (${refProd})`}`)
console.log(`  bersaglio: ${refBers}`)
if (!DA_R2) console.log('  ⚠ Con questa sorgente NON si prova che l’archivio su R2 sia leggibile.')
console.log()

const file = DA_R2 ? await elencaDaR2() : await elenca()
const mb = (file.reduce((n, f) => n + f.size, 0) / 1024 / 1024).toFixed(1)
console.log(`  ${file.length} file, ${mb} MB\n`)

if (!ESEGUI) {
  console.log('  COSA FAREBBE:')
  console.log(`   1. crea il bucket «${BUCKET}» sul progetto nuovo, pubblico come l’originale`)
  console.log(`   2. copia i ${file.length} file`)
  console.log(`   3. riscrive gli indirizzi nel database: ${refProd} → ${refBers},`)
  console.log('      in ogni colonna di testo e JSON di ogni tabella')
  console.log('   4. verifica che nel database non resti nessun indirizzo vecchio\n')
  console.log('  Per eseguire davvero: aggiungi --esegui\n')
  process.exit(0)
}

// ── 1. Il bucket ─────────────────────────────────────────────────────────────
{
  const { data: esistenti } = await bersaglio.storage.listBuckets()
  if (!(esistenti || []).some(b => b.name === BUCKET)) {
    const { error } = await bersaglio.storage.createBucket(BUCKET, { public: true })
    console.log(`  1. BUCKET creato: ${error ? '✗ ' + error.message : '✓ ' + BUCKET + ' (pubblico)'}`)
  } else console.log(`  1. BUCKET già presente: ${BUCKET}`)
}

// ── 2. I file ────────────────────────────────────────────────────────────────
const t0 = Date.now()
let copiati = 0, falliti = []
for (let i = 0; i < file.length; i += 5) {
  await Promise.all(file.slice(i, i + 5).map(async f => {
    try {
      const { buf, tipo } = DA_R2 ? await scaricaDaR2(f.path) : await scaricaDaProduzione(f.path)
      const { error: e2 } = await bersaglio.storage.from(BUCKET)
        .upload(f.path, buf, { contentType: f.tipo || tipo, upsert: true })
      if (e2) throw new Error('carico: ' + e2.message)
      copiati++
    } catch (e) { falliti.push(`${f.path}: ${e.message.slice(0, 70)}`) }
  }))
}
console.log(`  2. FILE: ${copiati}/${file.length} copiati in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
for (const f of falliti.slice(0, 5)) console.log(`     ✗ ${f}`)

// ── 3. Gli indirizzi dentro il database ──────────────────────────────────────
// È il passo che si dimentica. Le foto non stanno solo in una colonna
// `cover_url`: sono dentro i blocchi delle pagine, nelle gallerie, nei temi —
// tutta roba in JSON. Si riscrive colonna per colonna, testo e JSON.
if (!process.env.RIPRISTINO_DB_URL) {
  console.log('  3. INDIRIZZI: saltati, manca RIPRISTINO_DB_URL')
} else {
  const c = new pg.Client({ connectionString: process.env.RIPRISTINO_DB_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const vecchio = `https://${refProd}.supabase.co`, nuovo = `https://${refBers}.supabase.co`
  const { rows } = await c.query(`
    DO $$
    DECLARE r record; n bigint; tot bigint := 0;
    BEGIN
      FOR r IN
        SELECT c.table_name, c.column_name, c.data_type
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND c.data_type IN ('text', 'character varying', 'jsonb', 'json')
          AND c.is_generated = 'NEVER'
      LOOP
        BEGIN
          EXECUTE format(
            'UPDATE public.%I SET %I = replace(%I::text, %L, %L)::%s WHERE %I::text LIKE %L',
            r.table_name, r.column_name, r.column_name, $1, $2, r.data_type,
            r.column_name, '%' || $1 || '%');
          GET DIAGNOSTICS n = ROW_COUNT;
          tot := tot + n;
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'saltata %.%: %', r.table_name, r.column_name, SQLERRM;
        END;
      END LOOP;
      RAISE NOTICE 'righe riscritte: %', tot;
    END $$;
    SELECT 1;
  `.replace(/\$1/g, `'${vecchio}'`).replace(/\$2/g, `'${nuovo}'`))
  // Quante ne restano con l'indirizzo vecchio? Zero è l'unica risposta buona.
  const { rows: resto } = await c.query(`
    SELECT count(*)::int AS n FROM public.entita WHERE (cover_url || logo_url || coalesce(theme::text,'') || coalesce(minisito::text,'')) LIKE $1
  `, [`%${refProd}.supabase.co%`])
  await c.end()
  console.log(`  3. INDIRIZZI riscritti: ${vecchio} → ${nuovo}`)
  console.log(`     entità che nominano ancora il progetto vecchio: ${resto[0].n} ${resto[0].n === 0 ? '✓' : '✗'}`)
}

console.log('\n  Ora il sito ripristinato va aperto con un browser: le foto devono')
console.log('  caricarsi dal progetto NUOVO, non da quello vecchio.\n')
