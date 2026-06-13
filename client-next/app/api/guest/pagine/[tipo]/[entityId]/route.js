import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { data, error } = await supabaseAdmin.from('pagine')
      .select('id, parent_id, slug, titolo, nel_menu, ordine')
      .eq('entity_tipo', params.tipo).eq('entity_id', params.entityId)
      .eq('status', 'pubblicata').eq('nel_menu', true)
      .order('ordine', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
