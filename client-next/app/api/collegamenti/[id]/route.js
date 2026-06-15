import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'

export async function DELETE(request, { params }) {
  try {
    const { response } = await requireRecordAccess(request, 'collegamenti', params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('collegamenti').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
