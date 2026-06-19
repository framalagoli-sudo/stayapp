import { requireEntityAccess } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// DELETE /api/sito-snapshots/[id] → elimina una versione.
export async function DELETE(request, { params }) {
  const { id } = await params
  const { data: snap } = await supabaseAdmin
    .from('site_snapshots').select('entity_tipo, entity_id').eq('id', id).single()
  if (!snap) return Response.json({ error: 'Versione non trovata' }, { status: 404 })

  const { response } = await requireEntityAccess(request, snap.entity_tipo, snap.entity_id)
  if (response) return response

  const { error } = await supabaseAdmin.from('site_snapshots').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
