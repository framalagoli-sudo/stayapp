import { supabaseAdmin } from '@/lib/supabase-server'
import { getEntityAziendaId } from '@/lib/server-auth'
import { localizeEntity } from '@/lib/translate'

// Dati live: mai cachare (vedi nota in /api/guest/a/[slug]).
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const entity_tipo = searchParams.get('entity_tipo')
  const entity_id = searchParams.get('entity_id')
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'it'

  let query = supabaseAdmin.from('eventi')
    .select('id, slug, title, description, cover_url, date_start, date_end, location, price, seats_total, seats_booked, packages')
    .eq('published', true).eq('active', true)
    .gte('date_start', new Date().toISOString()).order('date_start')

  if (entity_tipo && UUID_RE.test(entity_id || '')) {
    // Mostra gli eventi di questa entità + gli eventi "aziendali" (senza entità)
    // della stessa azienda: un evento aziendale compare sui siti di tutte le sue entità.
    const aziendaId = await getEntityAziendaId(entity_tipo, entity_id)
    if (aziendaId) {
      query = query.or(`and(entity_tipo.eq.${entity_tipo},entity_id.eq.${entity_id}),and(entity_id.is.null,azienda_id.eq.${aziendaId})`)
    } else {
      query = query.eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
    }
  }
  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let out = data || []
  if (lang === 'en') out = await Promise.all(out.map(ev => localizeEntity(ev, 'evento', lang)))
  return Response.json(out)
}
