import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
}

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    const { data, error } = await supabaseAdmin.from('ordini').select('*')
      .eq('id', params.id).eq('azienda_id', azienda_id).single()
    if (error) return Response.json({ error: 'Non trovato' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    const body = await request.json()
    const allowed = ['stato', 'note_admin', 'tracking_url']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in body) patch[k] = body[k]
    const { data, error } = await supabaseAdmin.from('ordini')
      .update(patch).eq('id', params.id).eq('azienda_id', azienda_id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
