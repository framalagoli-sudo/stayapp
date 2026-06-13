import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { getSaldo } from '@/lib/loyalty-helpers'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    const azienda_id = profile?.azienda_id
    const { contatto_id, punti, note } = await request.json()
    if (!contatto_id || punti == null) return Response.json({ error: 'contatto_id e punti obbligatori' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('loyalty_points').insert({
      azienda_id, contatto_id, punti: parseInt(punti), tipo: 'manuale', note: note || '',
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    const saldo = await getSaldo(azienda_id, contatto_id)
    return Response.json({ movimento: data, saldo })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
