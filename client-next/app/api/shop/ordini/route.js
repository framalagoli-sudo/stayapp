import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('ordini').select('*').eq('azienda_id', azienda_id).order('created_at', { ascending: false })
    if (searchParams.get('stato')) q = q.eq('stato', searchParams.get('stato'))
    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
