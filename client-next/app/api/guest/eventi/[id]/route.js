import { supabaseAdmin } from '@/lib/supabase-server'
import { localizeEntity } from '@/lib/translate'

// Copre la traduzione Haiku dell'evento al primo caricamento EN (cache miss).
export const maxDuration = 30

export async function GET(request, { params }) {
  const { data, error } = await supabaseAdmin.from('eventi')
    .select('id, slug, title, description, cover_url, date_start, date_end, location, price, seats_total, seats_booked, packages')
    .eq('id', params.id).eq('published', true).eq('active', true).single()
  if (error || !data) return Response.json({ error: 'Evento non trovato' }, { status: 404 })
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
  const out = lang === 'en' ? await localizeEntity(data, 'evento', lang) : data
  return Response.json(out)
}
