import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    // Carica la richiesta e la property a cui appartiene (per risalire all'azienda).
    const { data: req } = await supabaseAdmin.from('requests')
      .select('id, property_id, properties(azienda_id)').eq('id', params.id).single()
    if (!req) return Response.json({ error: 'Non trovata' }, { status: 404 })

    if (profile.role !== 'super_admin') {
      const reqAzienda = req.properties?.azienda_id
      if (['admin_struttura', 'staff'].includes(profile.role)) {
        if (req.property_id !== profile.property_id) return Response.json({ error: 'Non trovata' }, { status: 404 })
      } else if (!reqAzienda || reqAzienda !== profile.azienda_id) {
        return Response.json({ error: 'Non trovata' }, { status: 404 })
      }
    }

    const { status, note } = await request.json()
    const { data, error } = await supabaseAdmin.from('requests')
      .update({ status, note, updated_at: new Date().toISOString() })
      .eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
