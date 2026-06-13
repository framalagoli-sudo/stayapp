import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { getSaldo } from '@/lib/loyalty-helpers'

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    const azienda_id = profile?.azienda_id
    const { data: movimenti, error } = await supabaseAdmin.from('loyalty_points')
      .select('*').eq('azienda_id', azienda_id).eq('contatto_id', params.id)
      .order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    const saldo = (movimenti || []).reduce((sum, r) => sum + r.punti, 0)
    return Response.json({ saldo, movimenti: movimenti || [] })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
