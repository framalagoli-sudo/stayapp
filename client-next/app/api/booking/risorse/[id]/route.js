import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED = ['nome', 'descrizione', 'modalita', 'entity_tipo', 'entity_id',
  'durata_minuti', 'quantita', 'max_coperti', 'prezzo', 'valuta', 'colore',
  'disponibilita', 'blocchi', 'anticipo_ore', 'cancellazione_ore', 'conferma_auto', 'attiva', 'visibile_minisito']

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    let q = supabaseAdmin.from('risorse').select('*').eq('id', params.id)
    if (profile?.role !== 'super_admin') q = q.eq('azienda_id', profile?.azienda_id)
    const { data, error } = await q.single()
    if (error || !data) return Response.json({ error: 'Risorsa non trovata' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
    payload.updated_at = new Date().toISOString()
    const { data, error } = await supabaseAdmin.from('risorse').update(payload).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { error } = await supabaseAdmin.from('risorse').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
