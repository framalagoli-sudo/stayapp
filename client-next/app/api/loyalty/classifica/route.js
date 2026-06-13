import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    const azienda_id = profile?.azienda_id

    const { data } = await supabaseAdmin.from('loyalty_points')
      .select('contatto_id, punti').eq('azienda_id', azienda_id)

    const saldi = {}
    for (const r of data || []) {
      saldi[r.contatto_id] = (saldi[r.contatto_id] || 0) + r.punti
    }

    const topIds = Object.entries(saldi)
      .filter(([, p]) => p > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50).map(([id]) => id)

    if (!topIds.length) return Response.json([])
    const { data: contatti } = await supabaseAdmin.from('contatti').select('id, nome, email').in('id', topIds)
    const result = topIds.map(id => ({
      contatto: contatti?.find(c => c.id === id) || { id, nome: '—', email: '' },
      saldo: saldi[id],
    }))
    return Response.json(result)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
