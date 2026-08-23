import { supabaseAdmin } from '@/lib/supabase-server'
import { verificaTokenAnteprima } from '@/lib/preview-token'

export async function GET(request, props) {
  const params = await props.params;
  try {
    const { searchParams } = new URL(request.url)
    // Le bozze si vedono solo con un token firmato per questa entità.
    const anteprima = verificaTokenAnteprima(searchParams.get('preview'), params.tipo, params.entityId)
    let q = supabaseAdmin.from('pagine').select('*')
      .eq('entity_tipo', params.tipo).eq('entity_id', params.entityId).eq('slug', params.slug)
    if (!anteprima) q = q.eq('status', 'pubblicata')
    const { data, error } = await q.single()
    if (error || !data) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
