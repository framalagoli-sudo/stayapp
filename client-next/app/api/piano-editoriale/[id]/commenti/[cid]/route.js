import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    const azienda_id = profile?.role === 'super_admin' ? null : profile?.azienda_id
    let q = supabaseAdmin.from('pe_commenti').delete().eq('id', params.cid)
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
