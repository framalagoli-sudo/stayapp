import { supabase } from './supabase'

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...options.headers,
    },
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = {} }
  if (!res.ok) throw new Error(body?.error || `Errore ${res.status}`)
  return body
}

// Multipart upload — do NOT set Content-Type (browser adds boundary automatically)
export async function uploadMedia(endpoint, file) {
  const { data: { session } } = await supabase.auth.getSession()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}` },
    body: formData,
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = {} }
  if (!res.ok) throw new Error(body?.error || `Errore ${res.status}`)
  return body
}
