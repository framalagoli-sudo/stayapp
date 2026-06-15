import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, getEntityAziendaId } from '@/lib/server-auth'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { items } = await request.json()
    if (!Array.isArray(items) || !items.length) return Response.json({ error: 'items array required' }, { status: 400 })

    const ids = items.map(i => i.id).filter(Boolean)
    if (!ids.length) return Response.json({ error: 'items array required' }, { status: 400 })

    // Carica le pagine coinvolte e verifica la proprietà dell'entità.
    const { data: pagine } = await supabaseAdmin.from('pagine')
      .select('id, entity_tipo, entity_id').in('id', ids)
    if (!pagine || pagine.length !== ids.length) return Response.json({ error: 'Pagine non trovate' }, { status: 404 })

    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    if (profile.role !== 'super_admin') {
      // Tutte le pagine devono appartenere all'azienda dell'utente.
      const entityKeys = [...new Set(pagine.map(p => `${p.entity_tipo}:${p.entity_id}`))]
      for (const key of entityKeys) {
        const [tipo, eid] = key.split(':')
        const aziendaId = await getEntityAziendaId(tipo, eid)
        if (!aziendaId || aziendaId !== profile.azienda_id) {
          return Response.json({ error: 'Non trovato' }, { status: 404 })
        }
      }
    }

    await Promise.all(items.map(({ id, ordine, parent_id }) =>
      supabaseAdmin.from('pagine').update({ ordine, parent_id: parent_id || null }).eq('id', id)
    ))
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
