import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
console.log('API_BASE:', API_BASE)

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}${path}`, {
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
  const res = await fetch(`${API_BASE}${endpoint}`, {
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
