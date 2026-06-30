import { requireAuth } from '@/lib/server-auth'
import { searchUnsplash, unsplashConfigured } from '@/lib/unsplash'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    if (!unsplashConfigured()) return Response.json({ error: 'UNSPLASH_ACCESS_KEY non configurata' }, { status: 503 })
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().slice(0, 100)
    if (!q) return Response.json({ error: 'Parametro q obbligatorio' }, { status: 400 })
    const n = Math.min(parseInt(searchParams.get('n') || '12', 10), 30)
    return Response.json(await searchUnsplash(q, n))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
