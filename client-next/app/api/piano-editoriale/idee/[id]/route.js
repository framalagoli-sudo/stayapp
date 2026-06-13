import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfileData(userId, body) {
  const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  if (!profile) return {}
  const isSuperAdmin = profile.role === 'super_admin'
  const azienda_id = isSuperAdmin ? (body?.azienda_id || null) : profile.azienda_id
  return { ...profile, azienda_id, isSuperAdmin }
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const { azienda_id, isSuperAdmin } = await getProfileData(user.id, body)
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    const allowed = ['titolo', 'note', 'pillar', 'canali']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in body) patch[k] = body[k]
    let q = supabaseAdmin.from('idee_editoriali').update(patch).eq('id', params.id)
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
    const { azienda_id, isSuperAdmin } = await getProfileData(user.id, null)
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    let q = supabaseAdmin.from('idee_editoriali').delete().eq('id', params.id)
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
