import { supabaseAdmin } from '@/lib/supabase-server'
import { getCollegamenti } from '@/lib/guest-utils'

export async function GET(request, { params }) {
  const { data, error } = await supabaseAdmin
    .from('ristoranti')
    .select('id, azienda_id, slug, name, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, menu, modules, minisito, privacy_data, chatbot')
    .eq('slug', params.slug).eq('active', true).single()
  if (error || !data) return Response.json({ error: 'Ristorante non trovato' }, { status: 404 })
  const collegamenti = await getCollegamenti('ristorante', data.id)
  return Response.json({ ...data, collegamenti })
}
