import { supabaseAdmin } from '@/lib/supabase-server'
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { gzip } from 'zlib'
import { logError } from '@/lib/observability'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)
const RETENTION_DAYS = 30

// ⚠️ QUESTA LISTA VA AGGIORNATA A OGNI MODULO NUOVO.
// Era rimasta ferma a quando il prodotto aveva meno funzioni: il 24/08/2026
// salvava 1504 righe e ne lasciava fuori 1404 — comprese le `pagine`, cioè il
// CONTENUTO DEI SITI dei clienti, e i `domini`. Il backup girava ogni notte e
// nessuno se n'era accorto, perché un backup incompleto ha lo stesso aspetto di
// uno completo finché non serve.
// Regola: se una tabella contiene dati che un cliente si arrabbierebbe a
// perdere, sta qui dentro.
const TABLES = [
  // identità e struttura
  'aziende', 'profiles', 'properties', 'ristoranti', 'attivita', 'collegamenti',
  // il sito: è il prodotto più usato, e mancava del tutto
  'pagine', 'sito_snapshots', 'landing_seo', 'domini',
  // clienti e richieste
  'contatti', 'requests', 'messages', 'demo_requests',
  // moduli
  'eventi', 'event_bookings', 'risorse', 'risorse_promozioni', 'prenotazioni',
  'articoli', 'blog_categories', 'newsletters',
  'vetrine', 'vetrina_elementi',
  'form_builder', 'form_submissions', 'preventivi', 'recensioni',
  'prodotti', 'ordini', 'gift_cards', 'loyalty_programs', 'loyalty_points',
  'survey', 'survey_risposte', 'automazioni', 'automazioni_log',
  'whatsapp_account', 'whatsapp_template', 'whatsapp_campagne', 'whatsapp_optin',
  'translations', 'webhooks', 'platform_config',
  // tracciamento e conformità
  'page_views', 'audit_log',
]

// Vercel può iniettare un BOM o spazi invisibili nelle env var → l'SDK AWS
// li mette negli header della firma e lancia "Invalid character in header content".
// Ripuliamo SEMPRE le credenziali prima dell'uso.
function cleanEnv(v) {
  return v ? v.replace(/^﻿/, '').replace(/[\r\n\t]/g, '').trim() : v
}

function getR2Client() {
  const accountId = cleanEnv(process.env.R2_ACCOUNT_ID)
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID)
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY)
  if (!accountId || !accessKeyId || !secretAccessKey) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export async function runBackup() {
  const startedAt = new Date()
  const bucket = cleanEnv(process.env.R2_BUCKET_NAME) || 'stayapp-backups'
  const r2 = getR2Client()
  if (!r2) {
    // NON fallire in silenzio: un backup non eseguito DEVE essere un errore visibile.
    throw new Error('Credenziali R2 mancanti (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) — backup NON eseguito')
  }

  const backup = { _meta: { exported_at: startedAt.toISOString(), version: 2 }, tables: {} }
  const rowCounts = {}
  console.log('[backup] Avvio esportazione tabelle...')
  for (const table of TABLES) {
    try {
      const { data, error } = await supabaseAdmin.from(table).select('*')
      if (error) {
        console.error(`[backup] ${table}: ${error.message}`)
        backup.tables[table] = { error: error.message }
        rowCounts[table] = `ERRORE: ${error.message}`
      } else {
        backup.tables[table] = data || []
        rowCounts[table] = (data || []).length
        console.log(`[backup] ${table}: ${(data || []).length} righe`)
      }
    } catch (err) {
      console.error(`[backup] ${table}: ${err.message}`)
      backup.tables[table] = { error: err.message }
      rowCounts[table] = `ERRORE: ${err.message}`
    }
  }

  // Un backup a metà ha lo stesso aspetto di uno completo: il file c'è, pesa,
  // sembra a posto. Se una tabella non è stata esportata va detto SUBITO, non
  // il giorno in cui la si cerca dentro l'archivio.
  const falliteEsportazioni = Object.entries(rowCounts)
    .filter(([, v]) => typeof v === 'string' && v.startsWith('ERRORE'))
    .map(([t]) => t)
  if (falliteEsportazioni.length) {
    await logError('backup/tabelle-mancanti',
      `Il backup è stato scritto SENZA queste tabelle: ${falliteEsportazioni.join(', ')}. L'archivio è incompleto.`,
      { alert: true })
  }

  const compressed = await gzipAsync(Buffer.from(JSON.stringify(backup), 'utf8'))
  console.log(`[backup] Compresso: ${(compressed.length / 1024).toFixed(0)} KB`)

  const date = startedAt.toISOString().slice(0, 10)
  const filename = `backup-${date}.json.gz`
  // Se l'upload fallisce, l'eccezione propaga → la route risponde 500. Niente "ok" falsi.
  const putResult = await r2.send(new PutObjectCommand({ Bucket: bucket, Key: filename, Body: compressed, ContentType: 'application/gzip', ContentLength: compressed.length }))
  console.log(`[backup] Upload completato → ${bucket}/${filename}`)

  // Verifica di lettura: ricontrolla che l'oggetto esista DAVVERO nel bucket dopo l'upload.
  let verified = false
  let verifiedSize = null
  let verifiedModified = null
  try {
    const { Contents = [] } = await r2.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: filename }))
    const found = Contents.find(o => o.Key === filename)
    if (found) {
      verified = true
      verifiedSize = found.Size
      verifiedModified = found.LastModified ? new Date(found.LastModified).toISOString() : null
    }
  } catch (err) {
    console.error('[backup] Verifica post-upload fallita:', err.message)
  }

  let deleted = []
  try {
    const { Contents = [] } = await r2.send(new ListObjectsV2Command({ Bucket: bucket }))
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
    const toDelete = Contents.filter(obj => new Date(obj.LastModified) < cutoff)
    for (const obj of toDelete) {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }))
      deleted.push(obj.Key)
      console.log(`[backup] Eliminato backup scaduto: ${obj.Key}`)
    }
  } catch (err) { console.error('[backup] Pulizia vecchi backup fallita:', err.message) }

  console.log('[backup] ✓ Backup completato con successo')
  return {
    bucket,
    filename,
    sizeKB: Math.round(compressed.length / 1024),
    etag: putResult?.ETag || null,
    verified,
    verifiedSize,
    verifiedModified,
    rowCounts,
    deleted,
    durationMs: Date.now() - startedAt.getTime(),
  }
}
