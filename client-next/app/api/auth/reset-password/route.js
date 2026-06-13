import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { password, access_token } = await request.json()
    if (!password || !access_token) return Response.json({ error: 'Dati mancanti' }, { status: 400 })
    if (password.length < 8) return Response.json({ error: 'Password minimo 8 caratteri' }, { status: 400 })

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(access_token)
    if (userErr || !user) return Response.json({ error: 'Token non valido o scaduto' }, { status: 401 })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password, email_confirm: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
