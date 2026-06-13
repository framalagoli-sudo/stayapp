import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { syncBookingCreate, syncBookingDelete } from '@/lib/google-calendar-stub'

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const allowed = ['stato', 'note_interne', 'n_persone']
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    payload.updated_at = new Date().toISOString()

    const { data: prev } = await supabaseAdmin.from('prenotazioni').select('*').eq('id', params.id).single()
    const { data, error } = await supabaseAdmin.from('prenotazioni').update(payload).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    if (prev && payload.stato) {
      if (payload.stato === 'cancellata' && prev.google_event_id) {
        syncBookingDelete(prev.azienda_id, prev.google_event_id)
      } else if (payload.stato === 'confermata' && prev.stato === 'in_attesa' && !prev.google_event_id) {
        const { data: risorsa } = await supabaseAdmin.from('risorse').select('nome, durata_minuti').eq('id', prev.risorsa_id).single()
        syncBookingCreate(data, risorsa)
      }
    }

    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { error } = await supabaseAdmin.from('prenotazioni').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
