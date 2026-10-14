import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { contenutoPulito } from '@/lib/club-regole'

// Cambiare o togliere un contenuto del Club: solo il super_admin.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request, { params }) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const { id } = await params
    if (!UUID.test(id || '')) return Response.json({ error: 'Contenuto non valido' }, { status: 400 })
    const { contenuto, errore } = contenutoPulito(await request.json().catch(() => ({})))
    if (errore) return Response.json({ error: errore }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('club_contenuti')
      .update({ ...contenuto, updated_at: new Date().toISOString() }).eq('id', id).select('id')
    if (error) throw new Error(error.message)
    if (!data?.length) return Response.json({ error: 'Non trovato' }, { status: 404 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const { id } = await params
    if (!UUID.test(id || '')) return Response.json({ error: 'Contenuto non valido' }, { status: 400 })
    const { error } = await supabaseAdmin.from('club_contenuti').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
