import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, resolveAziendaId } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

const ALLOWED = ['nome', 'descrizione', 'modalita', 'entity_tipo', 'entity_id',
  'durata_minuti', 'quantita', 'max_coperti', 'prezzo', 'valuta', 'colore',
  'disponibilita', 'blocchi', 'anticipo_ore', 'cancellazione_ore', 'conferma_auto', 'attiva', 'visibile_minisito']

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

    const { searchParams } = new URL(request.url)
    let query = supabaseAdmin.from('risorse').select('*').order('nome')
    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return Response.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    } else if (isUUID(searchParams.get('azienda_id'))) {
      query = query.eq('azienda_id', searchParams.get('azienda_id'))
    }
    if (searchParams.get('entity_tipo') && searchParams.get('entity_id')) {
      query = query.eq('entity_tipo', searchParams.get('entity_tipo')).eq('entity_id', searchParams.get('entity_id'))
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
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const body = await request.json()
    const azienda_id = resolveAziendaId(profile, isUUID(body.azienda_id) ? body.azienda_id : null)
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda valida' }, { status: 400 })
    if (!body.nome?.trim()) return Response.json({ error: 'Il nome è obbligatorio' }, { status: 400 })

    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
    const { data, error } = await supabaseAdmin.from('risorse').insert({ ...payload, azienda_id }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
