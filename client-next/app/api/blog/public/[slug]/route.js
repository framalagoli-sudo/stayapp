import { supabaseAdmin } from '@/lib/supabase-server'
import { localizeEntity } from '@/lib/translate'

// Copre la traduzione Haiku dell'articolo al primo caricamento EN (cache miss).
export const maxDuration = 30

export async function GET(request, { params }) {
  try {
    const { data, error } = await supabaseAdmin.from('articoli')
      .select('id, title, slug, excerpt, content, cover_url, author, published_at, category_id, entity_tipo, entity_id, azienda_id')
      .eq('slug', params.slug).eq('published', true).eq('active', true).single()
    if (error || !data) return Response.json({ error: 'Articolo non trovato' }, { status: 404 })
    const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
    const out = lang === 'en' ? await localizeEntity(data, 'articolo', lang) : data
    return Response.json(out)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
