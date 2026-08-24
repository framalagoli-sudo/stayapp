import { supabaseAdmin } from '@/lib/supabase-server'
import { localizeEntity } from '@/lib/translate'

// Dati live (privacy_data, minisito, ecc.): mai cachare, altrimenti le modifiche
// fatte nell'admin non si vedono sul sito pubblico finché non si rideploya.
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request, props) {
  const params = await props.params;
  const { data, error } = await supabaseAdmin
    .from('entita')
    .select('id, azienda_id, tipo, slug, name, settore, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, services, minisito, privacy_data, chatbot, moduli')
    .eq('slug', params.slug).eq('tipo', 'attivita').eq('active', true).maybeSingle()
  if (error || !data) return Response.json({ error: 'Attività non trovata' }, { status: 404 })
  // Il client conosce i nomi storici: cambia la sorgente, non il contratto.
  const ent = allaFormaStorica(data)
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
  const out = lang === 'en' ? await localizeEntity(ent, 'attivita', lang) : ent
  return Response.json(out)
}
