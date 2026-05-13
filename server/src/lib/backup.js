import { execSync } from 'child_process'
import { createReadStream, unlinkSync, existsSync } from 'fs'
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'

const RETENTION_DAYS = 30

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
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

  const date     = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const filename = `backup-${date}.sql.gz`
  const tmpPath  = `/tmp/${filename}`

  // ── 1. pg_dump + gzip ────────────────────────────────────────────────────
  try {
    console.log(`[backup] Avvio dump → ${filename}`)
    execSync(`pg_dump "${dbUrl}" | gzip > ${tmpPath}`, { stdio: 'pipe' })
    console.log('[backup] Dump completato')
  } catch (err) {
    console.error('[backup] pg_dump fallito:', err.message)
    return
  }

  // ── 2. Upload su R2 ───────────────────────────────────────────────────────
  try {
    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: createReadStream(tmpPath),
      ContentType: 'application/gzip',
    }))
    console.log(`[backup] Upload completato → ${bucket}/${filename}`)
  } catch (err) {
    console.error('[backup] Upload R2 fallito:', err.message)
    return
  } finally {
    if (existsSync(tmpPath)) unlinkSync(tmpPath)
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
