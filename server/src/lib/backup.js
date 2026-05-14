import pkg from 'pg'
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { gzip } from 'zlib'
import { promisify } from 'util'

const { Client } = pkg
const gzipAsync  = promisify(gzip)
const RETENTION_DAYS = 30

function getR2Client() {
  const accountId       = process.env.R2_ACCOUNT_ID
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export async function runBackup() {
  const bucket = process.env.R2_BUCKET_NAME || 'stayapp-backups'
  const dbUrl  = process.env.DATABASE_URL

  if (!dbUrl) {
    console.error('[backup] DATABASE_URL mancante — backup saltato')
    return
  }

  const r2 = getR2Client()
  if (!r2) {
    console.error('[backup] Credenziali R2 mancanti — backup saltato')
    return
  }

  // ── 1. Connessione al DB ed export tabelle ────────────────────────────────
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  let backup = { _meta: { exported_at: new Date().toISOString(), version: 1 }, tables: {} }

  try {
    console.log('[backup] Connessione al database...')
    await client.connect()

    // Lista tutte le tabelle pubbliche
    const { rows: tables } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    )
    console.log(`[backup] Tabelle trovate: ${tables.map(t => t.tablename).join(', ')}`)

    // Esporta ogni tabella
    for (const { tablename } of tables) {
      const { rows } = await client.query(`SELECT * FROM "${tablename}"`)
      backup.tables[tablename] = rows
      console.log(`[backup] ${tablename}: ${rows.length} righe`)
    }

    await client.end()
  } catch (err) {
    console.error('[backup] Errore DB:', err.message)
    try { await client.end() } catch {}
    return
  }

  // ── 2. Serializza e comprimi ──────────────────────────────────────────────
  let compressed
  try {
    const json = JSON.stringify(backup)
    compressed = await gzipAsync(Buffer.from(json, 'utf8'))
    console.log(`[backup] Backup compresso: ${(compressed.length / 1024).toFixed(0)} KB`)
  } catch (err) {
    console.error('[backup] Compressione fallita:', err.message)
    return
  }

  // ── 3. Upload su R2 ───────────────────────────────────────────────────────
  const date     = new Date().toISOString().slice(0, 10)
  const filename = `backup-${date}.json.gz`

  try {
    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: compressed,
      ContentType: 'application/gzip',
      ContentLength: compressed.length,
    }))
    console.log(`[backup] Upload completato → ${bucket}/${filename}`)
  } catch (err) {
    console.error('[backup] Upload R2 fallito:', err.message)
    return
  }

  // ── 4. Elimina backup più vecchi di RETENTION_DAYS ───────────────────────
  try {
    const { Contents = [] } = await r2.send(new ListObjectsV2Command({ Bucket: bucket }))
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
    const toDelete = Contents.filter(obj => new Date(obj.LastModified) < cutoff)
    for (const obj of toDelete) {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }))
      console.log(`[backup] Eliminato backup scaduto: ${obj.Key}`)
    }
  } catch (err) {
    console.error('[backup] Pulizia vecchi backup fallita:', err.message)
  }

  console.log('[backup] ✓ Backup completato con successo')
}
