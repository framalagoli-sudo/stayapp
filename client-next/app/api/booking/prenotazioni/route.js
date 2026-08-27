import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let query = supabaseAdmin.from('prenotazioni')
      .select('*, risorse(nome, modalita, colore, entity_tipo, entity_id)')
      .order('data', { ascending: false })
      .order('ora_inizio', { ascending: true })

    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return Response.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    } else if (isUUID(searchParams.get('azienda_id'))) {
      query = query.eq('azienda_id', searchParams.get('azienda_id'))
    }
    if (isUUID(searchParams.get('risorsa_id'))) query = query.eq('risorsa_id', searchParams.get('risorsa_id'))
    // ⚠️ Una prenotazione a giornate copre un intervallo: chiedere il giorno 12
    // di un affitto dal 10 al 14 con `data = 12` non trova niente. Il calendario
    // colorerebbe il giorno come occupato e poi mostrerebbe un pannello vuoto.
    // L'ultimo giorno è quello dell'uscita e non conta come occupato.
    const giorno = searchParams.get('data')
    if (giorno) query = query.or(`data.eq.${giorno},and(data.lte.${giorno},data_fine.gt.${giorno})`)
    if (searchParams.get('stato'))   query = query.eq('stato', searchParams.get('stato'))
    if (searchParams.get('data_da')) query = query.gte('data', searchParams.get('data_da'))
    if (searchParams.get('data_a'))  query = query.lte('data', searchParams.get('data_a'))

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
