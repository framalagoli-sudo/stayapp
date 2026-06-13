import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  const { data, error } = await supabaseAdmin.from('eventi')
    .select('id, slug, title, description, cover_url, date_start, date_end, location, price, seats_total, seats_booked, packages')
    .eq('id', params.id).eq('published', true).eq('active', true).single()
  if (error || !data) return Response.json({ error: 'Evento non trovato' }, { status: 404 })
  return Response.json(data)
}
