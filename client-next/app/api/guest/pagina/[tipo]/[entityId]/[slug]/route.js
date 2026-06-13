import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url)
    const preview = searchParams.get('preview') === '1'
    let q = supabaseAdmin.from('pagine').select('*')
      .eq('entity_tipo', params.tipo).eq('entity_id', params.entityId).eq('slug', params.slug)
    if (!preview) q = q.eq('status', 'pubblicata')
    const { data, error } = await q.single()
    if (error || !data) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
