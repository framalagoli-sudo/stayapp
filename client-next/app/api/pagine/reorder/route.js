import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { items } = await request.json()
    if (!Array.isArray(items)) return Response.json({ error: 'items array required' }, { status: 400 })
    await Promise.all(items.map(({ id, ordine, parent_id }) =>
      supabaseAdmin.from('pagine').update({ ordine, parent_id: parent_id || null }).eq('id', id)
    ))
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
