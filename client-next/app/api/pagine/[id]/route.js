import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'

const ALLOWED = ['titolo','slug','status','nel_menu','ordine','parent_id','seo_title','seo_description','og_image_url','blocks']

// Carica la pagina e autorizza l'accesso all'entità che la possiede.
// Ritorna { pagina, response }. Se response != null, ritornalo subito.
async function loadAndAuthorize(request, id) {
  const { data: pagina } = await supabaseAdmin.from('pagine')
    .select('id, entity_tipo, entity_id').eq('id', id).single()
  if (!pagina) return { response: Response.json({ error: 'Pagina non trovata' }, { status: 404 }) }
  const { response } = await requireEntityAccess(request, pagina.entity_tipo, pagina.entity_id)
  if (response) return { response }
  return { pagina, response: null }
}

export async function GET(request, { params }) {
  try {
    const { response } = await loadAndAuthorize(request, params.id)
    if (response) return response
    const { data, error } = await supabaseAdmin.from('pagine').select('*').eq('id', params.id).single()
    if (error || !data) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { response } = await loadAndAuthorize(request, params.id)
    if (response) return response
    const body = await request.json()
    const updates = {}
    ALLOWED.forEach(k => { if (body[k] !== undefined) updates[k] = body[k] })
    if (!Object.keys(updates).length) return Response.json({ error: 'Nessun campo' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('pagine').update(updates).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { response } = await loadAndAuthorize(request, params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('pagine').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
