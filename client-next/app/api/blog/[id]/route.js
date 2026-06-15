import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toUuid(v) { return (v && UUID_RE.test(v)) ? v : null }

export async function GET(request, { params }) {
  try {
    if (!UUID_RE.test(params.id)) return Response.json({ error: 'ID non valido' }, { status: 400 })
    const { response } = await requireRecordAccess(request, 'articoli', params.id)
    if (response) return response
    const { data, error } = await supabaseAdmin.from('articoli').select('*').eq('id', params.id).single()
    if (error || !data) return Response.json({ error: 'Non trovato' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    if (!UUID_RE.test(params.id)) return Response.json({ error: 'ID articolo non valido' }, { status: 400 })
    const { response } = await requireRecordAccess(request, 'articoli', params.id)
    if (response) return response

    const body = await request.json()
    const allowed = ['title', 'excerpt', 'content', 'cover_url', 'author', 'category_id', 'entity_tipo', 'entity_id', 'published', 'active']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    if ('category_id' in updates) updates.category_id = toUuid(updates.category_id)
    if ('entity_id'   in updates) updates.entity_id   = toUuid(updates.entity_id)

    if (updates.published === true) {
      const { data: cur } = await supabaseAdmin.from('articoli').select('published_at').eq('id', params.id).single()
      if (!cur?.published_at) updates.published_at = new Date().toISOString()
    }
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin.from('articoli').update(updates).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    if (!UUID_RE.test(params.id)) return Response.json({ error: 'ID articolo non valido' }, { status: 400 })
    const { response } = await requireRecordAccess(request, 'articoli', params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('articoli').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
