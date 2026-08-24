import { supabaseAdmin } from './supabase-server'
import { requireAuth } from './server-auth'

const MAX_SIZE = 5 * 1024 * 1024

// Allowlist immagini. Estensione e content-type SALVATI derivano da qui, MAI dal
// nome/tipo del client (falsificabili): così il file viene sempre servito come
// immagine e mai eseguito. Niente SVG (può contenere <script>), niente HTML/JS.
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}
const EXT_MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' }

export async function parseUpload(request) {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') return { error: 'Nessun file ricevuto' }
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length === 0) return { error: 'File vuoto' }
  if (buffer.length > MAX_SIZE) return { error: 'File troppo grande (max 5 MB)' }
  const ext = MIME_EXT[(file.type || '').toLowerCase()]
  if (!ext) return { error: 'Formato non valido: solo immagini JPG, PNG, WebP, GIF o AVIF' }
  // Difesa extra anti-spoofing: un'immagine vera non inizia mai con '<' (HTML/SVG/XML),
  // anche se il client mente sul content-type. Salta spazi/BOM iniziali.
  let i = 0
  while (i < buffer.length && [0x20, 0x09, 0x0a, 0x0d, 0xef, 0xbb, 0xbf].includes(buffer[i])) i++
  if (buffer[i] === 0x3c) return { error: 'Contenuto non valido' }

  return await comprimi(buffer, ext, file)
}

// Le foto arrivano dal telefono del cliente così come sono: misurato il
// 24/08/2026, in produzione la media era **1 MB per immagine**, con una
// copertina da 3,9 MB e un logo da 1,5 MB. Il server rispondeva in 640 ms e poi
// il browser scaricava quattro megabyte — su rete mobile, dove guarda davvero
// chi cerca un ristorante, sono dieci secondi di pagina bianca.
//
// Qui l'immagine viene rimpicciolita a una misura sensata per il web e
// riscritta in WebP, che a parità di resa pesa un terzo. Le GIF si lasciano
// stare: ricomprimerle ne ucciderebbe l'animazione.
const LATO_MAX = 1920
const QUALITA = 82

async function comprimi(buffer, ext, file) {
  const originale = { file, buffer, ext, contentType: EXT_MIME[ext] }
  if (ext === 'gif') return originale
  try {
    const sharp = (await import('sharp')).default
    const img = sharp(buffer, { failOn: 'none' })
    const meta = await img.metadata()
    const daRidurre = Math.max(meta.width || 0, meta.height || 0) > LATO_MAX

    const compresso = await img
      .rotate() // rispetta l'orientamento EXIF, altrimenti le foto da telefono restano coricate
      .resize(daRidurre ? { width: LATO_MAX, height: LATO_MAX, fit: 'inside', withoutEnlargement: true } : undefined)
      .webp({ quality: QUALITA })
      .toBuffer()

    // Se la compressione non guadagna nulla (immagine già piccola e ottimizzata),
    // si tiene l'originale: non ha senso riscriverla per peggiorarla.
    if (compresso.length >= buffer.length && !daRidurre) return originale

    return { file, buffer: compresso, ext: 'webp', contentType: 'image/webp' }
  } catch (e) {
    // Meglio pubblicare un'immagine pesante che non pubblicarla: la compressione
    // è un miglioramento, non un requisito.
    console.error('[upload] compressione fallita, uso l’originale:', e.message)
    return originale
  }
}

export async function uploadToStorage(storagePath, buffer, contentType) {
  const { error } = await supabaseAdmin.storage.from('property-media')
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) return { error: error.message }
  const { data } = supabaseAdmin.storage.from('property-media').getPublicUrl(storagePath)
  return { url: `${data.publicUrl}?v=${Date.now()}` }
}

export { requireAuth }
