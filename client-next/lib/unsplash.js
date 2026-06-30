// Helper Unsplash (server-only). Legge UNSPLASH_ACCESS_KEY e cerca foto.
// Usato da: /api/ai/unsplash (picker admin), apply/ai-fill template e dalla
// preview template. Tutto fail-safe: senza chiave o con errore torna [] e chi
// chiama lascia l'immagine vuota (l'hero mostra il gradiente, niente rotture).

const KEY = (process.env.UNSPLASH_ACCESS_KEY || '').replace(/^﻿/, '').trim()

// Cache per-processo: stessa query non viene rifetchata (preview/apply ripetuti).
const cache = new Map()

export function unsplashConfigured() { return !!KEY }

export async function searchUnsplash(query, n = 10) {
  const q = (query || '').trim()
  if (!KEY || !q) return []
  const ck = `${q}::${n}`
  if (cache.has(ck)) return cache.get(ck)
  try {
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${Math.min(n, 30)}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${KEY}` } }
    )
    if (!r.ok) return []
    const body = await r.json()
    const photos = (body.results || []).map(p => ({
      id: p.id, url: p.urls.regular, thumb: p.urls.small,
      alt: p.alt_description || '', author: p.user?.name || '', link: p.links?.html || '',
    }))
    cache.set(ck, photos)
    return photos
  } catch { return [] }
}

// Riempie le immagini dei blocchi a partire dai loro `image_query` cercando su
// Unsplash. `extraTerms` (es. settore/brief del business) viene accodato alle
// query per rendere le foto pertinenti. Ritorna NUOVI blocchi (non muta l'input).
// Slot gestiti: hero.bg_image_url, foto_testo/immagine.image_url, hero_slider slides[].image_url.
export async function resolveBlockImages(blocks, extraTerms = []) {
  if (!KEY || !Array.isArray(blocks)) return blocks
  const extra = (extraTerms || []).filter(Boolean).join(' ').trim()
  const q = base => (extra ? `${base} ${extra}` : base).trim()

  // 1. raccogli le query necessarie e quante immagini servono per ciascuna
  const need = new Map()
  const addNeed = query => { if (query) need.set(query, (need.get(query) || 0) + 1) }
  for (const b of blocks) {
    const d = b.data || {}
    if ((b.type === 'hero' || b.type === 'foto_testo' || b.type === 'immagine') && d.image_query) addNeed(q(d.image_query))
    if (b.type === 'hero_slider' && Array.isArray(d.slides)) {
      for (const s of d.slides) if (s.image_query) addNeed(q(s.image_query))
    }
  }
  if (need.size === 0) return blocks

  // 2. una sola ricerca per query (con margine), poi distribuzione senza ripetizioni
  const pool = new Map()
  await Promise.all([...need].map(async ([query, count]) => {
    pool.set(query, { photos: await searchUnsplash(query, Math.max(count + 2, 5)), idx: 0 })
  }))
  const take = query => {
    const p = pool.get(query)
    if (!p || !p.photos.length) return ''
    const photo = p.photos[p.idx % p.photos.length]; p.idx++
    return photo.url
  }

  // 3. assegna su una copia
  return blocks.map(b => {
    const d = { ...(b.data || {}) }
    if (b.type === 'hero' && d.image_query) { const u = take(q(d.image_query)); if (u) d.bg_image_url = u }
    if ((b.type === 'foto_testo' || b.type === 'immagine') && d.image_query) { const u = take(q(d.image_query)); if (u) d.image_url = u }
    if (b.type === 'hero_slider' && Array.isArray(d.slides)) {
      d.slides = d.slides.map(s => {
        if (!s.image_query) return s
        const u = take(q(s.image_query))
        return u ? { ...s, image_url: u } : s
      })
    }
    return { ...b, data: d }
  })
}
