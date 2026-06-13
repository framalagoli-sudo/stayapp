import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let query = supabaseAdmin.from('aziende').select('*').order('ragione_sociale')
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      query = query.eq('id', profile.azienda_id)
    }
    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (profile?.role !== 'super_admin') return Response.json({ error: 'Solo super_admin può creare aziende' }, { status: 403 })
    const body = await request.json()
    if (!body.ragione_sociale?.trim()) return Response.json({ error: 'ragione_sociale è obbligatoria' }, { status: 400 })
    const allowed = ['ragione_sociale', 'partita_iva', 'codice_fiscale', 'email', 'pec', 'telefono', 'cellulare', 'indirizzo', 'citta', 'cap', 'provincia', 'piano', 'moduli']
    const insert = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    const { data, error } = await supabaseAdmin.from('aziende').insert(insert).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
