import { supabaseAdmin } from '@/lib/supabase-server'
import { localizeEntity } from '@/lib/translate'
import { ambitoBlog, articoloNellAmbito } from '@/lib/blog-ambito'

// Copre la traduzione Haiku dell'articolo al primo caricamento EN (cache miss).
export const maxDuration = 30

export async function GET(request, props) {
  const params = await props.params;
  try {
    const { data, error } = await supabaseAdmin.from('articoli')
      .select('id, title, slug, excerpt, content, cover_url, formato_cover, cover_focal, author, published_at, category_id, entity_tipo, entity_id, azienda_id')
      .eq('slug', params.slug).eq('published', true).eq('active', true).single()
    if (error || !data) return Response.json({ error: 'Articolo non trovato' }, { status: 404 })
    // A questo indirizzo si leggono solo gli articoli di chi ci abita: senza,
    // il sito di un cliente apriva l'articolo di un altro cliente.
    const ambito = await ambitoBlog(request.headers.get('host'))
    if (!articoloNellAmbito(data, ambito)) return Response.json({ error: 'Articolo non trovato' }, { status: 404 })
    const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
    const out = lang === 'en' ? await localizeEntity(data, 'articolo', lang) : data
    return Response.json(out)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
