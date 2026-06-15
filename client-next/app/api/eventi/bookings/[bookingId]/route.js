import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { recomputeEventSeats } from '@/lib/event-seats'

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response

    // Verifica proprietà: la prenotazione → evento → azienda dell'utente.
    const { data: booking } = await supabaseAdmin
      .from('event_bookings').select('event_id').eq('id', params.bookingId).single()
    if (!booking) return Response.json({ error: 'Prenotazione non trovata' }, { status: 404 })
    const profile = await getProfile(user.id)
    if (profile?.role !== 'super_admin') {
      const { data: ev } = await supabaseAdmin.from('eventi').select('azienda_id').eq('id', booking.event_id).single()
      if (!ev || ev.azienda_id !== profile?.azienda_id)
        return Response.json({ error: 'Prenotazione non trovata' }, { status: 404 })
    }

    const { status, notes } = await request.json()
    const payload = { updated_at: new Date().toISOString() }
    if (status !== undefined) payload.status = status
    if (notes  !== undefined) payload.notes  = notes

    const { data, error } = await supabaseAdmin
      .from('event_bookings').update(payload).eq('id', params.bookingId).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Ricalcola i posti occupati (pending + confirmed) se è cambiato lo stato.
    if (status) await recomputeEventSeats(data.event_id)

    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
