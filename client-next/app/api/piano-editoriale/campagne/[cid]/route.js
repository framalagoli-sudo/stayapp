import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    const isSuperAdmin = profile?.role === 'super_admin'
    const azienda_id = isSuperAdmin ? (body.azienda_id || null) : profile?.azienda_id
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const { nome, colore, data_inizio, data_fine, descrizione } = body
    const patch = { updated_at: new Date().toISOString() }
    if (nome !== undefined)        patch.nome = nome.trim()
    if (colore !== undefined)      patch.colore = colore
    if (data_inizio !== undefined) patch.data_inizio = data_inizio || null
    if (data_fine !== undefined)   patch.data_fine = data_fine || null
    if (descrizione !== undefined) patch.descrizione = descrizione

    let q = supabaseAdmin.from('pe_campagne').update(patch).eq('id', params.cid)
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { data, error } = await q.select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    const isSuperAdmin = profile?.role === 'super_admin'
    const azienda_id = isSuperAdmin ? null : profile?.azienda_id
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    let q = supabaseAdmin.from('pe_campagne').delete().eq('id', params.cid)
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
