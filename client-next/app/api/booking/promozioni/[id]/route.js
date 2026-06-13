import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

const PROMO_ALLOWED = ['nome', 'descrizione', 'data_inizio', 'data_fine',
  'ora_inizio', 'ora_fine', 'giorni_settimana', 'prezzo_speciale', 'badge_label', 'colore', 'attiva']

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => PROMO_ALLOWED.includes(k)))
    const { data, error } = await supabaseAdmin.from('risorse_promozioni').update(payload).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { error } = await supabaseAdmin.from('risorse_promozioni').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
