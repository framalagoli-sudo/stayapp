import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function isSuperAdmin(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'super_admin'
}

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    if (!await isSuperAdmin(user.id)) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name').eq('azienda_id', params.id).eq('role', 'admin_azienda').limit(1)
    if (!profiles?.length) return Response.json(null)
    const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(profiles[0].id)
    if (error) return Response.json(null)
    return Response.json({ id: profiles[0].id, email: authUser.user?.email, full_name: profiles[0].full_name, last_sign_in: authUser.user?.last_sign_in_at, banned: !!authUser.user?.banned_until })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    if (!await isSuperAdmin(user.id)) return Response.json({ error: 'Accesso negato' }, { status: 403 })
    const { email, password, full_name } = await request.json()
    if (!email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })
    if (!password || password.length < 6) return Response.json({ error: 'Password minimo 6 caratteri' }, { status: 400 })
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: email.trim(), password, email_confirm: true, user_metadata: { full_name } })
    if (error) return Response.json({ error: error.message }, { status: 400 })
    await new Promise(r => setTimeout(r, 600))
    await supabaseAdmin.from('profiles').update({ role: 'admin_azienda', azienda_id: params.id, full_name: full_name || null }).eq('id', data.user.id)
    return Response.json({ id: data.user.id, email: data.user.email, full_name, banned: false }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
