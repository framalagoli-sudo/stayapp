import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

async function getEntityAziendaId(entity_tipo, entity_id) {
  const table = entity_tipo === 'struttura' ? 'properties' : entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
  const { data } = await supabaseAdmin.from(table).select('azienda_id').eq('id', entity_id).single()
  return data?.azienda_id
}

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data, error } = await supabaseAdmin.from('pagine').select('*').eq('id', params.id).single()
    if (error || !data) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    const profile = await getProfile(user.id)
    if (profile?.role !== 'super_admin') {
      const entityAziendaId = await getEntityAziendaId(data.entity_tipo, data.entity_id)
      if (entityAziendaId !== profile?.azienda_id) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    }
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: existing } = await supabaseAdmin.from('pagine').select('entity_tipo, entity_id').eq('id', params.id).single()
    if (!existing) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    const profile = await getProfile(user.id)
    if (profile?.role !== 'super_admin') {
      const entityAziendaId = await getEntityAziendaId(existing.entity_tipo, existing.entity_id)
      if (entityAziendaId !== profile?.azienda_id) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    }
    const body = await request.json()
    const ALLOWED = ['titolo','slug','status','nel_menu','ordine','parent_id','seo_title','seo_description','og_image_url','blocks']
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
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: existing } = await supabaseAdmin.from('pagine').select('entity_tipo, entity_id').eq('id', params.id).single()
    if (!existing) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    const profile = await getProfile(user.id)
    if (profile?.role !== 'super_admin') {
      const entityAziendaId = await getEntityAziendaId(existing.entity_tipo, existing.entity_id)
      if (entityAziendaId !== profile?.azienda_id) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    }
    const { error } = await supabaseAdmin.from('pagine').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
