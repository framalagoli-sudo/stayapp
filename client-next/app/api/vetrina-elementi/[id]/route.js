import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'

const ALLOWED = ['titolo', 'slug', 'copertina_url', 'valore_primario', 'stato_pubblico', 'dati', 'dati_privati', 'immagini', 'status', 'ordine', 'seo_title', 'seo_description', 'og_image_url']

// Carica l'elemento e autorizza tramite la sua entità (denormalizzata sulla riga).
async function loadAndAuthorize(request, id) {
  const { data: elemento } = await supabaseAdmin.from('vetrina_elementi')
    .select('id, entity_tipo, entity_id').eq('id', id).single()
  if (!elemento) return { response: Response.json({ error: 'Elemento non trovato' }, { status: 404 }) }
  const { response } = await requireEntityAccess(request, elemento.entity_tipo, elemento.entity_id)
  if (response) return { response }
  return { elemento, response: null }
}

export async function GET(request, { params }) {
  try {
    const { response } = await loadAndAuthorize(request, params.id)
    if (response) return response
    const { data, error } = await supabaseAdmin.from('vetrina_elementi').select('*').eq('id', params.id).single()
    if (error || !data) return Response.json({ error: 'Elemento non trovato' }, { status: 404 })
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
    const { data, error } = await supabaseAdmin.from('vetrina_elementi').update(updates).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { response } = await loadAndAuthorize(request, params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('vetrina_elementi').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
