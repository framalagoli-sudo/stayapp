import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { data, error } = await supabaseAdmin.from('articoli')
      .select('id, title, slug, excerpt, content, cover_url, author, published_at, category_id, entity_tipo, entity_id, azienda_id')
      .eq('slug', params.slug).eq('published', true).eq('active', true).single()
    if (error || !data) return Response.json({ error: 'Articolo non trovato' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
