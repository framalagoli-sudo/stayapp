import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'

function slugify(str) {
  return (str || '').toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'elemento'
}

// Carica la vetrina padre e autorizza l'accesso alla sua entità.
async function authorizeVetrina(request, vetrina_id) {
  const { data: vetrina } = await supabaseAdmin.from('vetrine')
    .select('id, entity_tipo, entity_id').eq('id', vetrina_id).single()
  if (!vetrina) return { response: Response.json({ error: 'Vetrina non trovata' }, { status: 404 }) }
  const { response } = await requireEntityAccess(request, vetrina.entity_tipo, vetrina.entity_id)
  if (response) return { response }
  return { vetrina, response: null }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const vetrina_id = searchParams.get('vetrina_id')
    if (!vetrina_id) return Response.json({ error: 'vetrina_id obbligatorio' }, { status: 400 })

    const { response } = await authorizeVetrina(request, vetrina_id)
    if (response) return response

    const { data, error } = await supabaseAdmin.from('vetrina_elementi')
      .select('*').eq('vetrina_id', vetrina_id)
      .order('ordine', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { vetrina_id, titolo } = body
    if (!vetrina_id || !titolo?.trim()) return Response.json({ error: 'vetrina_id e titolo obbligatori' }, { status: 400 })

    const { vetrina, response } = await authorizeVetrina(request, vetrina_id)
    if (response) return response

    const { data: last } = await supabaseAdmin.from('vetrina_elementi').select('ordine')
      .eq('vetrina_id', vetrina_id).order('ordine', { ascending: false }).limit(1)
    const nextOrdine = (last?.[0]?.ordine ?? -1) + 1

    const { data, error } = await supabaseAdmin.from('vetrina_elementi').insert({
      vetrina_id,
      entity_tipo: vetrina.entity_tipo,
      entity_id: vetrina.entity_id,
      titolo: titolo.trim(),
      slug: slugify(body.slug || titolo),
      ordine: nextOrdine,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
