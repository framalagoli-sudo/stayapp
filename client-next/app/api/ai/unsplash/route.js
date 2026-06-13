import { requireAuth } from '@/lib/server-auth'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const key = process.env.UNSPLASH_ACCESS_KEY
    if (!key) return Response.json({ error: 'UNSPLASH_ACCESS_KEY non configurata' }, { status: 503 })
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().slice(0, 100)
    if (!q) return Response.json({ error: 'Parametro q obbligatorio' }, { status: 400 })
    const n = Math.min(parseInt(searchParams.get('n') || '12', 10), 30)
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${n}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    if (!r.ok) return Response.json({ error: 'Unsplash non disponibile' }, { status: 502 })
    const body = await r.json()
    const photos = (body.results || []).map(p => ({
      id: p.id, url: p.urls.regular, thumb: p.urls.small,
      alt: p.alt_description || '', author: p.user.name, link: p.links.html,
    }))
    return Response.json(photos)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
