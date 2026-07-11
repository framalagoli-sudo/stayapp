import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    // Un utente può leggere solo la propria azienda; super_admin tutte.
    if (profile.role !== 'super_admin' && profile.azienda_id !== params.id)
      return Response.json({ error: 'Azienda non trovata' }, { status: 404 })
    const { data, error } = await supabaseAdmin.from('aziende').select('*').eq('id', params.id).single()
    if (error || !data) return Response.json({ error: 'Azienda non trovata' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    const isSuper = profile.role === 'super_admin'
    const isOwner = profile.azienda_id === params.id
    if (!isSuper && !isOwner) return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })
    const body = await request.json()
    // Il titolare può modificare i dati anagrafici + require_2fa; piano/moduli/active
    // (commerciale/entitlement/stato) sono riservati a super_admin (no self-upgrade/billing bypass).
    const OWNER_FIELDS = ['ragione_sociale', 'partita_iva', 'codice_fiscale', 'email', 'pec', 'telefono', 'cellulare', 'indirizzo', 'citta', 'cap', 'provincia', 'rea', 'capitale_sociale', 'require_2fa']
    const SUPER_FIELDS = ['piano', 'moduli', 'active']
    const allowed = isSuper ? [...OWNER_FIELDS, ...SUPER_FIELDS] : OWNER_FIELDS
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    if (!Object.keys(updates).length) return Response.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('aziende').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (profile?.role !== 'super_admin') return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })
    const { error } = await supabaseAdmin.from('aziende').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
