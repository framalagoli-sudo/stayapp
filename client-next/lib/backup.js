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
  'aziende', 'profiles', 'entita', 'properties', 'ristoranti', 'attivita', 'collegamenti',
  // il sito: è il prodotto più usato, e mancava del tutto
  'pagine', 'site_snapshots', 'landing_seo', 'domini',
  // clienti e richieste
  'contatti', 'requests', 'messages', 'demo_requests',
  // moduli
  'eventi', 'event_bookings', 'risorse', 'risorse_promozioni', 'prenotazioni',
  'articoli', 'blog_categories', 'newsletters',
  'vetrine', 'vetrina_elementi',
  'form_builder', 'form_submissions', 'preventivi', 'recensioni',
  'prodotti', 'ordini', 'gift_cards', 'loyalty_programs', 'loyalty_points',
  'survey_risposte', 'automazioni', 'automazioni_log',
  'piano_editoriale', 'pe_campagne', 'pe_commenti', 'hashtag_sets', 'blog_automazioni',
  'whatsapp_account', 'whatsapp_template', 'whatsapp_campagna', 'whatsapp_messaggio',
  'entity_translations', 'webhooks', 'platform_config',
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

// Supabase restituisce al massimo 1000 righe per interrogazione, e **taglia in
// silenzio**: nessun errore, semplicemente il resto non arriva. Il 24/08/2026 il
// backup salvava 1000 righe di `page_views` su 1390 e 1000 di `audit_log` su
// 1319, e diceva di essere andato a buon fine. Oggi tocca tabelle poco
// importanti; domani, appena i contatti o i lead superano il migliaio, si
// perderebbero i dati veri dei clienti senza il minimo avviso.
// Qui si legge a blocchi finché la tabella non è finita.
const BLOCCO = 1000

async function leggiTutto(tabella) {
  const righe = []
  for (let inizio = 0; ; inizio += BLOCCO) {
    const { data, error } = await supabaseAdmin.from(tabella).select('*').range(inizio, inizio + BLOCCO - 1)
    if (error) return { righe: [], error: error.message }
    righe.push(...(data || []))
    if (!data || data.length < BLOCCO) return { righe, error: null }
    // Guardia contro una tabella smisurata: meglio un backup grande di uno infinito.
    if (righe.length >= 200_000) {
      console.error(`[backup] ${tabella}: fermato a ${righe.length} righe (limite di sicurezza)`)
      return { righe, error: null }
    }
  }
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
      const { righe, error } = await leggiTutto(table)
      if (error) {
        console.error(`[backup] ${table}: ${error}`)
        backup.tables[table] = { error }
        rowCounts[table] = `ERRORE: ${error}`
      } else {
        backup.tables[table] = righe
        rowCounts[table] = righe.length
        console.log(`[backup] ${table}: ${righe.length} righe`)
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

  // Pulizia dei backup scaduti — facoltativa, e deve restarlo.
  //
  // La chiave R2 che sta nelle variabili di Vercel è la stessa che l'applicazione
  // usa per scrivere. Se quella chiave può anche cancellare, chi entrasse
  // nell'account Vercel avrebbe in mano sia la chiave del database sia il modo
  // di distruggere i backup: un solo furto e non resta niente da cui ripartire.
  //
  // Per questo la chiave dovrebbe avere **solo il permesso di scrivere**, e la
  // scadenza dei vecchi file va impostata come regola del bucket su Cloudflare,
  // dove serve un altro accesso per toglierla. Qui la cancellazione si prova e,
  // se il permesso non c'è, non è un errore: è la configurazione giusta.
  let deleted = []
  let pulizia = 'eseguita'
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
  } catch (err) {
    const negato = /AccessDenied|Forbidden|not authorized|403/i.test(err.message || '')
    pulizia = negato ? 'non permessa (chiave in sola scrittura: corretto)' : `fallita: ${err.message}`
    console.log(`[backup] Pulizia vecchi backup ${pulizia}`)
  }

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
    pulizia,
    durationMs: Date.now() - startedAt.getTime(),
  }
}
