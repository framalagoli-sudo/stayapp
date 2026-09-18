import { supabaseAdmin } from '@/lib/supabase-server'
import { localizeEntity } from '@/lib/translate'
import { ambitoBlog } from '@/lib/blog-ambito'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Copre la traduzione Haiku delle card al primo caricamento EN (cache condivisa col dettaglio).
export const maxDuration = 30

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const azienda_id  = searchParams.get('azienda_id')
    const category_id = searchParams.get('category_id')
    const entity_tipo = searchParams.get('entity_tipo')
    const entity_id   = searchParams.get('entity_id')
    const lang = searchParams.get('lang') === 'en' ? 'en' : 'it'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // In EN includiamo `content` così l'hash sorgente combacia col dettaglio (stessa
    // cache, niente ri-traduzioni doppie); poi lo scartiamo (la lista non lo usa).
    const cols = `id, title, slug, excerpt, cover_url, cover_focal, author, published_at, category_id, entity_tipo, entity_id${lang === 'en' ? ', content' : ''}`
    let q = supabaseAdmin.from('articoli')
      .select(cols)
      .eq('published', true).eq('active', true)
      .order('published_at', { ascending: false }).limit(limit)

    // ⛔ Il recinto lo mette l'INDIRIZZO, non i parametri: erano facoltativi, e
    // le pagine del blog non ne passavano nessuno — così `oltrenova.com/blog`
    // pubblicava l'articolo di un cliente e il sito di un cliente quello di un
    // altro. Sul dominio di un cliente vale la sua entità e basta; sul nostro
    // valgono gli articoli di OltreNova, più quelli di un'entità chiesta
    // esplicitamente (è il blocco blog dentro il sito servito dal nostro path).
    const ambito = await ambitoBlog(request.headers.get('host'))
    if (ambito.tipo === 'entita') {
      q = q.eq('azienda_id', ambito.azienda_id).or(`entity_id.eq.${ambito.entity_id},entity_id.is.null`)
    } else if (entity_id && UUID_RE.test(entity_id) && azienda_id && UUID_RE.test(azienda_id)) {
      q = q.eq('azienda_id', azienda_id).or(`entity_id.eq.${entity_id},entity_id.is.null`)
    } else if (ambito.azienda_id) {
      q = q.eq('azienda_id', ambito.azienda_id)
    } else {
      // Nessuna azienda nostra: meglio un blog vuoto che il blog di un altro.
      return Response.json([])
    }
    if (category_id) q = q.eq('category_id', category_id)
    if (entity_tipo && ambito.tipo !== 'entita') q = q.eq('entity_tipo', entity_tipo)

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })

    let out = data || []
    if (lang === 'en') {
      out = await Promise.all(out.map(async a => {
        const t = await localizeEntity(a, 'articolo', 'en')
        const { content, ...rest } = t  // content non serve nelle card
        return rest
      }))
    }
    return Response.json(out)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
