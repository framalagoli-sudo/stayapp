import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function isSuperAdmin(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'super_admin'
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    if (!await isSuperAdmin(user.id)) return Response.json({ error: 'Accesso negato' }, { status: 403 })
    const body = await request.json()
    const updates = {}
    if (body.password) updates.password = body.password
    if (typeof body.banned === 'boolean') updates.ban_duration = body.banned ? '87600h' : 'none'
    const { error } = await supabaseAdmin.auth.admin.updateUserById(params.uid, updates)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    if (!await isSuperAdmin(user.id)) return Response.json({ error: 'Accesso negato' }, { status: 403 })
    const { error } = await supabaseAdmin.auth.admin.deleteUser(params.uid)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
