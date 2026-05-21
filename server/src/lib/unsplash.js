// Cerca una foto rilevante su Unsplash per il titolo/tema dato.
// Restituisce l'URL della foto o null se non configurato / non trovato.
export async function fetchUnsplashCover(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key || !query?.trim()) return null
  try {
    const q = encodeURIComponent(query.trim().slice(0, 80))
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=3&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const photos = data.results || []
    if (!photos.length) return null
    const pick = photos[Math.floor(Math.random() * photos.length)]
    return pick.urls?.regular || null
  } catch {
    return null
  }
}
