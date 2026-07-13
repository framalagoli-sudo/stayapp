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
  return { file, buffer, ext, contentType: EXT_MIME[ext] }
}

export async function uploadToStorage(storagePath, buffer, contentType) {
  const { error } = await supabaseAdmin.storage.from('property-media')
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) return { error: error.message }
  const { data } = supabaseAdmin.storage.from('property-media').getPublicUrl(storagePath)
  return { url: `${data.publicUrl}?v=${Date.now()}` }
}

export { requireAuth }
