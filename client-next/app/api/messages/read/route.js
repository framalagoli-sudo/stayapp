import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, userCanAccessProperty } from '@/lib/server-auth'

export async function PATCH(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { property_id, session_id } = await request.json()
    if (!property_id || !session_id) return Response.json({ error: 'Campi mancanti' }, { status: 400 })
    const profile = await getProfile(user.id)
    if (!await userCanAccessProperty(profile, property_id))
      return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('messages').update({ read_at: new Date().toISOString() })
      .eq('property_id', property_id).eq('session_id', session_id)
      .eq('sender', 'guest').is('read_at', null)
    if (error) throw error
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
