import { supabaseAdmin } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const azienda_id  = searchParams.get('azienda_id')
    const category_id = searchParams.get('category_id')
    const entity_tipo = searchParams.get('entity_tipo')
    const entity_id   = searchParams.get('entity_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    let q = supabaseAdmin.from('articoli')
      .select('id, title, slug, excerpt, cover_url, author, published_at, category_id, entity_tipo, entity_id')
      .eq('published', true).eq('active', true)
      .order('published_at', { ascending: false }).limit(limit)

    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    if (category_id) q = q.eq('category_id', category_id)
    if (entity_id && UUID_RE.test(entity_id)) {
      q = q.or(`entity_id.eq.${entity_id},entity_tipo.is.null`)
    } else if (entity_tipo) {
      q = q.eq('entity_tipo', entity_tipo)
    }

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
