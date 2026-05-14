import { execSync, spawnSync } from 'child_process'
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createGzip } from 'zlib'
import { Readable } from 'stream'

const RETENTION_DAYS = 30

function getR2Client() {
  const accountId      = process.env.R2_ACCOUNT_ID
  const accessKeyId    = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

// Verifica che pg_dump sia disponibile nel container
function isPgDumpAvailable() {
  const result = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' })
  return result.status === 0
}

// Dump SQL compresso in memoria (Buffer) — nessun file temporaneo
function dumpToBuffer(dbUrl) {
  const result = spawnSync('pg_dump', ['--no-password', dbUrl], {
    encoding: 'buffer',
    maxBuffer: 500 * 1024 * 1024, // 500 MB max
  })
  if (result.status !== 0) {
    const errMsg = result.stderr?.toString() || 'Errore sconosciuto'
    throw new Error(`pg_dump fallito (exit ${result.status}): ${errMsg}`)
  }
  return result.stdout
}

// Comprime un Buffer con gzip, restituisce Buffer
function gzipBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const gzip = createGzip()
    const readable = Readable.from(buffer)
    readable.pipe(gzip)
    gzip.on('data', chunk => chunks.push(chunk))
    gzip.on('end', () => resolve(Buffer.concat(chunks)))
    gzip.on('error', reject)
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

  if (!isPgDumpAvailable()) {
    console.error('[backup] pg_dump non trovato nel container — assicurarsi che nixpacks.toml includa postgresql')
    return
  }

  const date     = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const filename = `backup-${date}.sql.gz`

  // ── 1. pg_dump in memoria ────────────────────────────────────────────────
  let compressed
  try {
    console.log(`[backup] Avvio dump → ${filename}`)
    const raw = dumpToBuffer(dbUrl)
    compressed = await gzipBuffer(raw)
    console.log(`[backup] Dump completato — ${(compressed.length / 1024).toFixed(0)} KB compressi`)
  } catch (err) {
    console.error('[backup] Dump fallito:', err.message)
    return
  }

  // ── 2. Upload su R2 ───────────────────────────────────────────────────────
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

  // ── 3. Elimina backup più vecchi di RETENTION_DAYS ───────────────────────
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
