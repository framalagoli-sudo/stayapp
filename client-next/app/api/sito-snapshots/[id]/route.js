import { requireEntityRecordAccess } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// DELETE /api/sito-snapshots/[id] → elimina una versione.
export async function DELETE(request, { params }) {
  const { id } = await params
  const { response } = await requireEntityRecordAccess(request, 'site_snapshots', id)
  if (response) return response

  const { error } = await supabaseAdmin.from('site_snapshots').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
