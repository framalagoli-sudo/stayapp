import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'

function slugify(str) {
  return (str || '').toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vetrina'
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const entity_tipo = searchParams.get('entity_tipo')
    const entity_id = searchParams.get('entity_id')
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })

    const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
    if (response) return response

    const { data, error } = await supabaseAdmin.from('vetrine')
      .select('*')
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
      .order('ordine', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { entity_tipo, entity_id, titolo, preset } = body
    if (!entity_tipo || !entity_id || !titolo?.trim()) return Response.json({ error: 'entity_tipo, entity_id e titolo obbligatori' }, { status: 400 })

    const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
    if (response) return response

    const { data: last } = await supabaseAdmin.from('vetrine').select('ordine')
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
      .order('ordine', { ascending: false }).limit(1)
    const nextOrdine = (last?.[0]?.ordine ?? -1) + 1

    const { data, error } = await supabaseAdmin.from('vetrine').insert({
      entity_tipo, entity_id,
      titolo: titolo.trim(),
      slug: slugify(body.slug || titolo),
      preset: preset || 'progetti_immobiliari',
      ordine: nextOrdine,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
