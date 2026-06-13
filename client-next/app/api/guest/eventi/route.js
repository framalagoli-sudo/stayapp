import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const entity_tipo = searchParams.get('entity_tipo')
  const entity_id = searchParams.get('entity_id')

  let query = supabaseAdmin.from('eventi')
    .select('id, slug, title, description, cover_url, date_start, date_end, location, price, seats_total, seats_booked, packages')
    .eq('published', true).eq('active', true)
    .gte('date_start', new Date().toISOString()).order('date_start')

  if (entity_tipo && entity_id) query = query.eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}
