import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  const { data, error } = await supabaseAdmin
    .from('attivita')
    .select('id, azienda_id, slug, name, tipo, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, services, minisito, privacy_data, chatbot, pwa')
    .eq('slug', params.slug).eq('active', true).single()
  if (error || !data) return Response.json({ error: 'Attività non trovata' }, { status: 404 })
  return Response.json(data)
}
