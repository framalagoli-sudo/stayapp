import { supabaseAdmin } from '@/lib/supabase-server'
import { localizeEntity } from '@/lib/translate'

// Dati live: mai cachare (vedi nota in /api/guest/a/[slug]).
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const entity_tipo = searchParams.get('entity_tipo')
  const entity_id = searchParams.get('entity_id')
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'it'

  let query = supabaseAdmin.from('eventi')
    .select('id, slug, title, description, cover_url, date_start, date_end, location, price, seats_total, seats_booked, packages')
    .eq('published', true).eq('active', true)
    .gte('date_start', new Date().toISOString()).order('date_start')

  if (entity_tipo && entity_id) query = query.eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let out = data || []
  if (lang === 'en') out = await Promise.all(out.map(ev => localizeEntity(ev, 'evento', lang)))
  return Response.json(out)
}
