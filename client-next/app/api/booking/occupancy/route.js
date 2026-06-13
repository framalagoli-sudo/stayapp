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
    const data_da = searchParams.get('data_da')
    const data_a = searchParams.get('data_a')
    if (!data_da || !data_a) return Response.json({ error: 'data_da e data_a obbligatori' }, { status: 400 })

    let query = supabaseAdmin.from('prenotazioni')
      .select('risorsa_id, data, stato, n_persone')
      .gte('data', data_da)
      .lte('data', data_a)
      .in('stato', ['confermata', 'in_attesa'])

    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return Response.json({})
      query = query.eq('azienda_id', profile.azienda_id)
    }

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const result = {}
    for (const b of data || []) {
      if (!result[b.risorsa_id]) result[b.risorsa_id] = {}
      if (!result[b.risorsa_id][b.data]) result[b.risorsa_id][b.data] = { count: 0, persone: 0 }
      result[b.risorsa_id][b.data].count++
      result[b.risorsa_id][b.data].persone += b.n_persone || 1
    }
    return Response.json(result)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
