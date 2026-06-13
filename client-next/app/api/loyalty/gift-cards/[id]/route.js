import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const body = await request.json()
    const allowed = ['attiva', 'intestatario_nome', 'intestatario_email', 'scadenza']
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    payload.updated_at = new Date().toISOString()
    const { data, error } = await supabaseAdmin.from('gift_cards').update(payload)
      .eq('id', params.id).eq('azienda_id', azienda_id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    await supabaseAdmin.from('gift_cards').delete().eq('id', params.id).eq('azienda_id', azienda_id)
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
