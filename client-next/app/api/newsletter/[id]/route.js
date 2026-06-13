import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let q = supabaseAdmin.from('newsletters').select('*').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data, error } = await q.single()
    if (error || !data) return Response.json({ error: 'Newsletter non trovata' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const body = await request.json()
    const allowed = ['subject', 'preheader', 'template_id', 'content', 'entity_tipo', 'entity_id', 'scheduled_at']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    updates.updated_at = new Date().toISOString()

    let q = supabaseAdmin.from('newsletters').update(updates).eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data, error } = await q.select().single()
    if (error) return Response.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let qCheck = supabaseAdmin.from('newsletters').select('status').eq('id', params.id)
    if (profile.role !== 'super_admin') qCheck = qCheck.eq('azienda_id', profile.azienda_id)
    const { data: nl } = await qCheck.single()
    if (!nl) return Response.json({ error: 'Newsletter non trovata' }, { status: 404 })
    if (nl.status === 'sent') return Response.json({ error: 'Non puoi eliminare una newsletter già inviata' }, { status: 400 })

    const { error } = await supabaseAdmin.from('newsletters').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
