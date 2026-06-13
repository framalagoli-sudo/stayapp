import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { data, error } = await supabaseAdmin.from('recensioni')
      .select('id, autore, stelle, testo, fonte, verificata, created_at')
      .eq('entity_tipo', params.tipo).eq('entity_id', params.entityId)
      .eq('pubblica', true).order('created_at', { ascending: false }).limit(50)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
