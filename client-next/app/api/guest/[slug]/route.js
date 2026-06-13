import { supabaseAdmin } from '@/lib/supabase-server'
import { getCollegamenti } from '@/lib/guest-utils'

export async function GET(request, { params }) {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('id, azienda_id, slug, name, description, address, phone, whatsapp, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, modules, theme, services, gallery, restaurant, activities, excursions, minisito, privacy_data, chatbot')
    .eq('slug', params.slug).eq('active', true).single()
  if (error || !data) return Response.json({ error: 'Struttura non trovata' }, { status: 404 })
  const collegamenti = await getCollegamenti('struttura', data.id)
  return Response.json({ ...data, collegamenti })
}
