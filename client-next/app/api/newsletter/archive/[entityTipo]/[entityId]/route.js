import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { data, error } = await supabaseAdmin.from('newsletters')
      .select('id, subject, sent_at, template_id, content, preheader, entity_tipo, entity_id')
      .eq('entity_tipo', params.entityTipo).eq('entity_id', params.entityId)
      .eq('status', 'sent').order('sent_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
