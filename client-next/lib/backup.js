import { supabaseAdmin } from '@/lib/supabase-server'
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { gzip } from 'zlib'
import { logError } from '@/lib/observability'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)
const RETENTION_DAYS = 30

// Nel bucket convivono tre cose diverse, e vanno distinte perché la pulizia
// per data non può trattarle allo stesso modo: cancellare le immagini o le
// copie mensili «perché vecchie» significherebbe buttare via proprio ciò che
// serve dopo il primo mese.
const GIORNALIERO = /^backup-\d{4}-\d{2}-\d{2}\.json\.gz$/   // scade a 30 giorni
const PREFISSO_MENSILE = 'mensili/'                          // una copia al mese, tenuta un anno
const PREFISSO_MEDIA = 'media/'                              // le immagini: non scadono mai
const MESI_DI_STORICO = 12

// Il bucket delle immagini dei clienti su Supabase Storage.
const BUCKET_MEDIA = 'property-media'

// Quanto tempo concedersi per copiare le immagini prima di lasciare il resto al
// giro successivo. La copia è incrementale, quindi interromperla non fa danno:
// domani riprende da dove si era fermata. Meglio un backup che finisce sempre
// di uno che ogni tanto va in timeout e non scrive nemmeno le tabelle.
const TEMPO_MASSIMO_MEDIA_MS = 25_000

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

// ── Gli account di accesso ───────────────────────────────────────────────────
// `profiles` dice chi è una persona e cosa può fare; `auth.users` dice che
// esiste un accesso a cui quel profilo è attaccato — e non è una tabella dello
// schema `public`, quindi per mesi è rimasta fuori dall'archivio senza che
// nessuno se ne accorgesse. Da un ripristino saremmo tornati in piedi con tutti
// i profili e nessuno in grado di entrare.
//
// ⚠️ NON si salvano le credenziali. La password non è recuperabile (Supabase
// conserva un hash, e l'hash sta in uno schema che l'API admin non espone), e
// metterla in un file che vive su R2 significherebbe consegnare a chi rubasse
// l'archivio delle password da attaccare con tutta calma. Si salva **chi aveva
// accesso e con quale identità**: da lì un ripristino rimanda un invito a
// ciascuno, che sono dieci minuti di lavoro contro un rischio permanente.
//
// ⚠️ `profiles.id` È l'id di questo utente: ricreando gli account con id nuovi
// ogni profilo resterebbe orfano. L'id va quindi conservato — se poi si possa
// imporre alla ricreazione è la prima cosa da verificare in una prova di
// ripristino.
async function leggiAccount() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return { account: null, error: error.message }
  // Campi elencati uno per uno: con un oggetto intero, un campo aggiunto domani
  // da Supabase finirebbe nell'archivio senza che nessuno l'abbia deciso.
  const account = (data?.users || []).map(u => ({
    id: u.id,
    email: u.email,
    telefono: u.phone || null,
    creato_il: u.created_at,
    confermato_il: u.email_confirmed_at || null,
    ultimo_accesso: u.last_sign_in_at || null,
    bloccato_fino: u.banned_until || null,
    metodi: Array.isArray(u.app_metadata?.providers) ? u.app_metadata.providers : [],
  }))
  return { account, error: null }
}

// ── Le immagini dei clienti ──────────────────────────────────────────────────
// Supabase Storage non ha un elenco ricorsivo: le cartelle sono voci senza
// metadata e si scende una alla volta.
async function elencaMedia(prefisso = '', profondita = 0) {
  if (profondita > 4) return []
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_MEDIA).list(prefisso, { limit: 1000 })
  if (error) throw new Error(`storage ${prefisso || '/'}: ${error.message}`)
  const trovati = []
  for (const voce of data || []) {
    const percorso = prefisso ? `${prefisso}/${voce.name}` : voce.name
    if (!voce.metadata) trovati.push(...await elencaMedia(percorso, profondita + 1))
    else trovati.push({ percorso, dimensione: voce.metadata.size ?? 0 })
  }
  return trovati
}

// Tutto ciò che è già stato copiato nel bucket dei backup, con la sua
// dimensione: è il confronto che rende la copia incrementale.
async function giaCopiate(r2, bucket) {
  const mappa = new Map()
  let token
  do {
    const r = await r2.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFISSO_MEDIA, ContinuationToken: token }))
    for (const o of r.Contents || []) mappa.set(o.Key.slice(PREFISSO_MEDIA.length), o.Size)
    token = r.IsTruncated ? r.NextContinuationToken : undefined
  } while (token)
  return mappa
}

// Copia solo ciò che manca o è cambiato di dimensione (una foto sostituita ha
// lo stesso percorso di prima: senza guardare il peso resterebbe la vecchia).
async function copiaMedia(r2, bucket, scadenza) {
  const esito = { totali: 0, copiate: 0, gia_presenti: 0, saltate_per_tempo: 0, byte: 0, errori: [] }
  const presenti = await giaCopiate(r2, bucket)
  const files = await elencaMedia()
  esito.totali = files.length

  for (const f of files) {
    if (presenti.get(f.percorso) === f.dimensione) { esito.gia_presenti++; continue }
    if (Date.now() > scadenza) { esito.saltate_per_tempo++; continue }
    try {
      const { data, error } = await supabaseAdmin.storage.from(BUCKET_MEDIA).download(f.percorso)
      if (error) throw new Error(error.message)
      const corpo = Buffer.from(await data.arrayBuffer())
      await r2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: PREFISSO_MEDIA + f.percorso,
        Body: corpo,
        ContentLength: corpo.length,
        ContentType: data.type || 'application/octet-stream',
      }))
      esito.copiate++
      esito.byte += corpo.length
    } catch (err) {
      esito.errori.push(`${f.percorso}: ${err.message}`)
    }
  }
  return esito
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

  // Gli account: senza, un ripristino riporta i profili e nessuno che entri.
  const { account, error: erroreAccount } = await leggiAccount()
  if (erroreAccount) {
    backup.accounts = { error: erroreAccount }
    await logError('backup/account',
      `Il backup è stato scritto SENZA gli account di accesso: ${erroreAccount}. Da questo archivio non si rientrerebbe.`,
      { alert: true })
  } else {
    backup.accounts = account
    console.log(`[backup] account di accesso: ${account.length}`)
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

  // Le immagini dei clienti. Non sono in nessuna tabella: se il problema è
  // Supabase, senza queste i siti tornerebbero su con tutti i testi e tutte le
  // foto rotte. Si copiano solo quelle nuove o cambiate, e **prima** di
  // scrivere il file, perché l'esito va dentro il file: un archivio deve poter
  // dire da solo cosa contiene, senza che qualcuno vada a contare gli oggetti
  // nel bucket.
  //
  // Il tetto di tempo e il try/catch servono a garantire che, qualunque cosa
  // succeda qui, il backup delle tabelle venga scritto lo stesso: le foto sono
  // importanti, i dati di più.
  let media = { errore: null }
  try {
    media = await copiaMedia(r2, bucket, startedAt.getTime() + TEMPO_MASSIMO_MEDIA_MS)
    console.log(`[backup] immagini: ${media.copiate} copiate, ${media.gia_presenti} già presenti, ${media.saltate_per_tempo} rimandate al prossimo giro`)
    if (media.errori.length) {
      await logError('backup/immagini',
        `Immagini non copiate nell'archivio: ${media.errori.slice(0, 5).join(' · ')}`, { alert: true })
    }
  } catch (err) {
    media = { errore: err.message }
    await logError('backup/immagini', `Copia delle immagini fallita: ${err.message}`, { alert: true })
  }
  backup._meta.media = media

  const compressed = await gzipAsync(Buffer.from(JSON.stringify(backup), 'utf8'))
  console.log(`[backup] Compresso: ${(compressed.length / 1024).toFixed(0)} KB`)

  const date = startedAt.toISOString().slice(0, 10)
  const filename = `backup-${date}.json.gz`
  // Se l'upload fallisce, l'eccezione propaga → la route risponde 500. Niente "ok" falsi.
  const putResult = await r2.send(new PutObjectCommand({ Bucket: bucket, Key: filename, Body: compressed, ContentType: 'application/gzip', ContentLength: compressed.length }))
  console.log(`[backup] Upload completato → ${bucket}/${filename}`)

  // Una copia al mese, tenuta un anno. I giornalieri scadono a 30 giorni: un
  // problema scoperto al giorno 31 non avrebbe nessuna rete sotto. Costa
  // mezzo megabyte al mese.
  let mensile = null
  if (startedAt.getUTCDate() === 1) {
    mensile = `${PREFISSO_MENSILE}backup-${date.slice(0, 7)}.json.gz`
    try {
      await r2.send(new PutObjectCommand({ Bucket: bucket, Key: mensile, Body: compressed, ContentType: 'application/gzip', ContentLength: compressed.length }))
      console.log(`[backup] copia mensile → ${mensile}`)
    } catch (err) {
      console.error('[backup] copia mensile fallita:', err.message)
      mensile = null
    }
  }

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
  //
  // ⚠️ E si cancella SOLO ciò che è davvero un backup giornaliero scaduto. Nel
  // bucket ora vivono anche le immagini dei clienti e le copie mensili: una
  // pulizia «tutto ciò che è vecchio più di 30 giorni» butterebbe via proprio
  // quello che serve dopo il primo mese. Le immagini non scadono mai — non
  // sono istantanee, sono il contenuto dei siti.
  let deleted = []
  let pulizia = 'eseguita'
  try {
    const tutti = []
    let token
    do {
      const r = await r2.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }))
      tutti.push(...(r.Contents || []))
      token = r.IsTruncated ? r.NextContinuationToken : undefined
    } while (token)

    const scadenzaGiornalieri = new Date()
    scadenzaGiornalieri.setDate(scadenzaGiornalieri.getDate() - RETENTION_DAYS)
    const scadenzaMensili = new Date()
    scadenzaMensili.setMonth(scadenzaMensili.getMonth() - MESI_DI_STORICO)

    const toDelete = tutti.filter(obj => {
      if (obj.Key.startsWith(PREFISSO_MEDIA)) return false
      const quando = new Date(obj.LastModified)
      if (obj.Key.startsWith(PREFISSO_MENSILE)) return quando < scadenzaMensili
      if (GIORNALIERO.test(obj.Key)) return quando < scadenzaGiornalieri
      return false // qualsiasi altra cosa: non la conosciamo, non la tocchiamo
    })
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
    mensile,
    sizeKB: Math.round(compressed.length / 1024),
    etag: putResult?.ETag || null,
    verified,
    verifiedSize,
    verifiedModified,
    rowCounts,
    account: Array.isArray(backup.accounts) ? backup.accounts.length : `ERRORE: ${erroreAccount}`,
    media,
    deleted,
    pulizia,
    durationMs: Date.now() - startedAt.getTime(),
  }
}
