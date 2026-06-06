const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
// Il token viene passato esplicitamente dal contesto auth
export async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    next: options.next || { revalidate: 3600 }, // cache 1 ora default
  })
  if (!res.ok) return null
  return res.json()
}

// Upload media — solo client
export async function uploadMedia(endpoint, file, token) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new Error(`upload ${endpoint}: ${res.status}`)
  return res.json()
}
