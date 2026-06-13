import { supabaseAdmin } from './supabase-server'
import { requireAuth } from './server-auth'

const MAX_SIZE = 5 * 1024 * 1024

export async function parseUpload(request) {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') return { error: 'Nessun file ricevuto' }
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_SIZE) return { error: 'File troppo grande (max 5 MB)' }
  const ext = file.name.split('.').pop().toLowerCase()
  return { file, buffer, ext, contentType: file.type }
}

export async function uploadToStorage(storagePath, buffer, contentType) {
  const { error } = await supabaseAdmin.storage.from('property-media')
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) return { error: error.message }
  const { data } = supabaseAdmin.storage.from('property-media').getPublicUrl(storagePath)
  return { url: `${data.publicUrl}?v=${Date.now()}` }
}

export { requireAuth }
