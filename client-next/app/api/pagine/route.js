import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

function slugify(str) {
  return (str || '').toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pagina'
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const entity_tipo = searchParams.get('entity_tipo')
    const entity_id = searchParams.get('entity_id')
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('pagine')
      .select('id, parent_id, slug, titolo, status, nel_menu, ordine, seo_title, seo_description, og_image_url, created_at, updated_at')
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).order('ordine', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const { entity_tipo, entity_id, titolo, slug, parent_id, status, nel_menu } = body
    if (!entity_tipo || !entity_id || !titolo?.trim()) return Response.json({ error: 'entity_tipo, entity_id e titolo obbligatori' }, { status: 400 })

    const { data: existing } = await supabaseAdmin.from('pagine').select('ordine')
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).order('ordine', { ascending: false }).limit(1)
    const nextOrdine = (existing?.[0]?.ordine ?? -1) + 1

    const { data, error } = await supabaseAdmin.from('pagine').insert({
      entity_tipo, entity_id, titolo: titolo.trim(),
      slug: slug?.trim() || slugify(titolo),
      parent_id: parent_id || null,
      status: status || 'bozza',
      nel_menu: nel_menu !== false,
      ordine: nextOrdine,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
