import { supabaseAdmin } from '@/lib/supabase-server'
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { gzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)
const RETENTION_DAYS = 30

const TABLES = [
  'aziende', 'profiles', 'properties', 'ristoranti', 'attivita',
  'requests', 'contatti', 'newsletters', 'page_views', 'demo_requests',
  'eventi', 'event_bookings', 'articoli', 'blog_categories',
  'risorse', 'risorse_promozioni', 'prenotazioni',
  'collegamenti', 'messages',
]

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
  const r2 = getR2Client()
  if (!r2) {
    console.error('[backup] Credenziali R2 mancanti — backup saltato')
    return
  }

  const backup = { _meta: { exported_at: new Date().toISOString(), version: 2 }, tables: {} }
  console.log('[backup] Avvio esportazione tabelle...')
  for (const table of TABLES) {
    try {
      const { data, error } = await supabaseAdmin.from(table).select('*')
      if (error) {
        console.error(`[backup] ${table}: ${error.message}`)
        backup.tables[table] = { error: error.message }
      } else {
        backup.tables[table] = data || []
        console.log(`[backup] ${table}: ${(data || []).length} righe`)
      }
    } catch (err) {
      console.error(`[backup] ${table}: ${err.message}`)
      backup.tables[table] = { error: err.message }
    }
  }

  let compressed
  try {
    compressed = await gzipAsync(Buffer.from(JSON.stringify(backup), 'utf8'))
    console.log(`[backup] Compresso: ${(compressed.length / 1024).toFixed(0)} KB`)
  } catch (err) {
    console.error('[backup] Compressione fallita:', err.message)
    return
  }

  const date = new Date().toISOString().slice(0, 10)
  const filename = `backup-${date}.json.gz`
  try {
    await r2.send(new PutObjectCommand({ Bucket: bucket, Key: filename, Body: compressed, ContentType: 'application/gzip', ContentLength: compressed.length }))
    console.log(`[backup] Upload completato → ${bucket}/${filename}`)
  } catch (err) {
    console.error('[backup] Upload R2 fallito:', err.message)
    return
  }

  try {
    const { Contents = [] } = await r2.send(new ListObjectsV2Command({ Bucket: bucket }))
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
    const toDelete = Contents.filter(obj => new Date(obj.LastModified) < cutoff)
    for (const obj of toDelete) {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }))
      console.log(`[backup] Eliminato backup scaduto: ${obj.Key}`)
    }
  } catch (err) { console.error('[backup] Pulizia vecchi backup fallita:', err.message) }

  console.log('[backup] ✓ Backup completato con successo')
}
