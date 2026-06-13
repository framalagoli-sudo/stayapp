import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const { data } = await supabaseAdmin.from('loyalty_programs').select('*').eq('azienda_id', azienda_id).single()
    return Response.json(data || null)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PUT(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const { nome, attivo, punti_per_euro, valore_punto, soglia_riscatto } = await request.json()

    const { data: existing } = await supabaseAdmin.from('loyalty_programs').select('id').eq('azienda_id', azienda_id).single()
    const payload = {
      azienda_id, nome: nome || 'Programma fedeltà',
      attivo: attivo ?? true,
      punti_per_euro: punti_per_euro ?? 10,
      valore_punto: valore_punto ?? 0.01,
      soglia_riscatto: soglia_riscatto ?? 100,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existing?.id) {
      result = await supabaseAdmin.from('loyalty_programs').update(payload).eq('id', existing.id).select().single()
    } else {
      result = await supabaseAdmin.from('loyalty_programs').insert(payload).select().single()
    }
    if (result.error) return Response.json({ error: result.error.message }, { status: 500 })
    return Response.json(result.data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
