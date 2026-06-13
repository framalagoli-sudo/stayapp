import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { ragione_sociale, email, password } = await request.json()
    if (!ragione_sociale?.trim()) return Response.json({ error: 'Ragione sociale obbligatoria' }, { status: 400 })
    if (!email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })
    if (!password || password.length < 8) return Response.json({ error: 'Password minimo 8 caratteri' }, { status: 400 })

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({ email: email.trim(), password, email_confirm: true })
    if (authErr) return Response.json({ error: authErr.message }, { status: 400 })

    const { data: az, error: azErr } = await supabaseAdmin.from('aziende').insert({
      ragione_sociale: ragione_sociale.trim(), email: email.trim(),
      moduli: { struttura: false, ristorante: false }, piano: 'base', active: false,
    }).select().single()
    if (azErr) { await supabaseAdmin.auth.admin.deleteUser(authData.user.id); return Response.json({ error: azErr.message }, { status: 500 }) }

    await new Promise(r => setTimeout(r, 600))
    await supabaseAdmin.from('profiles').update({ role: 'admin_azienda', azienda_id: az.id, full_name: ragione_sociale.trim() }).eq('id', authData.user.id)
    return Response.json({ message: 'Registrazione completata. Il tuo account è in attesa di attivazione.', azienda_id: az.id }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
