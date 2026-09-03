import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { recomputeEventSeats } from '@/lib/event-seats'

export async function PATCH(request, props) {
  const params = await props.params;
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

    // ⚠️ Lo stato arriva dal client e finiva nella colonna così com'era: una
    // stringa inventata creava una prenotazione fantasma — nessun riquadro la
    // contava (né fra le confermate né fra quelle in attesa) mentre continuava
    // a occupare i posti. Catalogo chiuso, come per ogni valore che arriva da
    // fuori.
    const STATI = ['pending', 'confirmed', 'cancelled']
    if (status !== undefined && !STATI.includes(status)) {
      return Response.json({ error: 'Stato non valido' }, { status: 400 })
    }

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
