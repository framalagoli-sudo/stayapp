import { supabaseAdmin } from '@/lib/supabase-server'
import { localizeEntity } from '@/lib/translate'

// Dati live (privacy_data, minisito, ecc.): mai cachare, altrimenti le modifiche
// fatte nell'admin non si vedono sul sito pubblico finché non si rideploya.
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request, { params }) {
  const { data, error } = await supabaseAdmin
    .from('attivita')
    .select('id, azienda_id, slug, name, tipo, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, services, minisito, privacy_data, chatbot, pwa')
    .eq('slug', params.slug).eq('active', true).single()
  if (error || !data) return Response.json({ error: 'Attività non trovata' }, { status: 404 })
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
  const out = lang === 'en' ? await localizeEntity(data, 'attivita', lang) : data
  return Response.json(out)
}
