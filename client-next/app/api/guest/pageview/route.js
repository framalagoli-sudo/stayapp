import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { entity_tipo, entity_id } = await request.json()
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })
    await supabaseAdmin.from('page_views').insert({ entity_tipo, entity_id })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
