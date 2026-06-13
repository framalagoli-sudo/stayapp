import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const { data, error } = await supabaseAdmin.from('preventivi')
      .select('*, contatti(id, nome, email)').eq('id', params.id).eq('azienda_id', profile.azienda_id).single()
    if (error) return Response.json({ error: 'Non trovato' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const body = await request.json()
    const allowed = ['titolo', 'contatto_id', 'stato', 'valuta', 'iva_pct', 'voci', 'note', 'scadenza']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in body) patch[k] = body[k]

    const { data, error } = await supabaseAdmin.from('preventivi')
      .update(patch).eq('id', params.id).eq('azienda_id', profile.azienda_id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const { error } = await supabaseAdmin.from('preventivi').delete().eq('id', params.id).eq('azienda_id', profile.azienda_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
