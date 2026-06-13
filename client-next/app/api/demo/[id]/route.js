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
    const { data, error } = await supabaseAdmin
      .from('demo_requests').update({ letto: body.letto ?? true })
      .eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    if (!await isSuperAdmin(user.id)) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { error } = await supabaseAdmin.from('demo_requests').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
