import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const { data, error } = await supabaseAdmin.from('form_builder')
      .select('id, nome, descrizione, attivo, token, created_at, updated_at')
      .eq('azienda_id', profile.azienda_id).order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const body = await request.json()
    const { data, error } = await supabaseAdmin.from('form_builder')
      .insert({ azienda_id: profile.azienda_id, nome: body.nome || 'Nuovo form', campi: [] })
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
