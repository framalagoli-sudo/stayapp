// In produzione (Vercel) usa Railway direttamente. In dev usa localhost.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').trim()

// Fetch pubblico — nessuna auth, usato nelle pagine guest
export async function guestFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) throw new Error(`guestFetch ${path}: ${res.status}`)
  return res.json()
}

// Fetch con Bearer token — usato lato client (admin)
// Firma identica all'originale: auto-fetch sessione da Supabase
export async function apiFetch(path, options = {}) {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `apiFetch ${path}: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Fetch server-side — usato nelle Server Components e Server Actions
// Nessun token (dati pubblici), con cache Next.js
export async function serverFetch(path, options = {}) {
  try {
    const url = `${API_BASE}${path}`
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      next: options.next || { revalidate: 3600 },
    })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    console.error(`[serverFetch] ${path}:`, e.message)
    return null
  }
}

// Upload media — solo client
export async function uploadMedia(endpoint, file) {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new Error(`upload ${endpoint}: ${res.status}`)
  return res.json()
}
