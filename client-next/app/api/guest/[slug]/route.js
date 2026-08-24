import { supabaseAdmin } from '@/lib/supabase-server'
import { allaFormaStorica } from '@/lib/entita'
import { getCollegamenti } from '@/lib/guest-utils'
import { localizeEntity } from '@/lib/translate'

// Dati live: mai cachare (vedi nota in /api/guest/a/[slug]).
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request, props) {
  const params = await props.params;
  const { data, error } = await supabaseAdmin
    .from('entita')
    .select('id, azienda_id, tipo, slug, name, description, address, phone, email, whatsapp, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, moduli, theme, services, gallery, restaurant, activities, excursions, minisito, privacy_data, chatbot')
    .eq('slug', params.slug).eq('tipo', 'struttura').eq('active', true).maybeSingle()
  if (error || !data) return Response.json({ error: 'Struttura non trovata' }, { status: 404 })
  // Il client conosce i nomi storici: cambia la sorgente, non il contratto.
  const ent = allaFormaStorica(data)
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
  const localized = lang === 'en' ? await localizeEntity(ent, 'struttura', lang) : ent
  const collegamenti = await getCollegamenti('struttura', data.id)
  return Response.json({ ...localized, collegamenti })
}
