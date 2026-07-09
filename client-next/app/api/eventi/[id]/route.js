import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUUID(v) { return UUID_RE.test(v) }

const ALLOWED = ['title', 'description', 'cover_url', 'date_start', 'date_end',
  'location', 'price', 'seats_total', 'active', 'published', 'packages', 'entity_tipo', 'entity_id',
  'notify_owner_on_booking', 'send_guest_confirmation']

export async function GET(request, { params }) {
  try {
    const { response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response
    const { data, error } = await supabaseAdmin.from('eventi').select('*').eq('id', params.id).single()
    if (error || !data) return Response.json({ error: 'Evento non trovato' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response
    const body = await request.json()
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
    if (payload.entity_id && !isUUID(payload.entity_id)) { payload.entity_id = null; payload.entity_tipo = null }
    payload.updated_at = new Date().toISOString()
    const { data, error } = await supabaseAdmin.from('eventi').update(payload).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('eventi').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
