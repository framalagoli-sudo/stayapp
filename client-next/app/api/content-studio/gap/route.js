import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const today = new Date().toISOString().split('T')[0]
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    const ago30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const meseStart = today.slice(0, 7) + '-01'
    const meseEnd = today.slice(0, 7) + '-31'

    const [evRes, prRes, arRes, piRes] = await Promise.all([
      supabaseAdmin.from('eventi').select('id, title, date_start, cover_url, price')
        .eq('azienda_id', azienda_id).gte('date_start', today).lte('date_start', in30)
        .order('date_start').limit(6),
      supabaseAdmin.from('prodotti').select('id, nome, prezzo, immagini')
        .eq('azienda_id', azienda_id).eq('attivo', true)
        .order('created_at', { ascending: false }).limit(6),
      supabaseAdmin.from('articoli').select('id, title, excerpt, cover_url, created_at')
        .eq('azienda_id', azienda_id).eq('published', true)
        .gte('created_at', ago30).order('created_at', { ascending: false }).limit(6),
      supabaseAdmin.from('piano_editoriale').select('id')
        .eq('azienda_id', azienda_id)
        .gte('data_pianificata', meseStart).lte('data_pianificata', meseEnd),
    ])

    return Response.json({
      eventi: evRes.data || [],
      prodotti: prRes.data || [],
      articoli: arRes.data || [],
      piano_questo_mese: piRes.data?.length || 0,
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
