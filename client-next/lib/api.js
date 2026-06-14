// Client-side: "" = URL relative (il browser aggiunge l'hostname corrente).
// Server-side (SSR/Server Components): URL relative non funzionano in Node.js fetch —
// serve un URL assoluto. VERCEL_URL è impostata automaticamente da Vercel con l'URL
// del deployment corrente (es. oltrenova-next-abc.vercel.app), bypassa Cloudflare.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim()
function serverBase() {
  if (process.env.NEXT_INTERNAL_API_URL) return process.env.NEXT_INTERNAL_API_URL.replace(/^﻿/, '').trim()
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// ─── Fetch pubblico (guest, nessuna auth) ────────────────────────────────────
export async function guestFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) throw new Error(`guestFetch ${path}: ${res.status}`)
  return res.json()
}

// ─── Fetch autenticato (admin, client-side) ──────────────────────────────────
// Firma identica all'originale — importa supabase in modo lazy per evitare
// conflitti con i Server Components che importano serverFetch dallo stesso file
export async function apiFetch(path, options = {}) {
  const { supabase } = await import('@/lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
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

// ─── Fetch server-side (SSR, Server Components) ──────────────────────────────
export async function serverFetch(path, options = {}) {
  const base = serverBase()
  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      next: options.next || { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    console.error(`[serverFetch] ${path}:`, e.message)
    return null
  }
}

// ─── Upload media (client-side) ───────────────────────────────────────────────
export async function uploadMedia(endpoint, file) {
  const { supabase } = await import('@/lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
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
