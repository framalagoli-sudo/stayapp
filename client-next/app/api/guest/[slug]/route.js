import { supabaseAdmin } from '@/lib/supabase-server'
import { getCollegamenti } from '@/lib/guest-utils'
import { localizeEntity } from '@/lib/translate'

// Dati live: mai cachare (vedi nota in /api/guest/a/[slug]).
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request, { params }) {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('id, azienda_id, slug, name, description, address, phone, whatsapp, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, modules, theme, services, gallery, restaurant, activities, excursions, minisito, privacy_data, chatbot')
    .eq('slug', params.slug).eq('active', true).single()
  if (error || !data) return Response.json({ error: 'Struttura non trovata' }, { status: 404 })
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
  const localized = lang === 'en' ? await localizeEntity(data, 'struttura', lang) : data
  const collegamenti = await getCollegamenti('struttura', data.id)
  return Response.json({ ...localized, collegamenti })
}
