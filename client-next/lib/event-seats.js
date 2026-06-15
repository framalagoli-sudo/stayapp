import { supabaseAdmin } from './supabase-server'

// Ricalcola eventi.seats_booked come somma dei posti delle prenotazioni ATTIVE
// (pending + confirmed). Le 'cancelled' non occupano posti.
// Fonte di verità unica = event_bookings → evita drift da increment/decrement.
// Va chiamata dopo ogni create/update/delete di una prenotazione evento.
export async function recomputeEventSeats(eventId) {
  if (!eventId) return 0
  const { data } = await supabaseAdmin
    .from('event_bookings').select('seats, status').eq('event_id', eventId)
  const total = (data || [])
    .filter(b => b.status !== 'cancelled')
    .reduce((s, b) => s + (b.seats || 1), 0)
  await supabaseAdmin.from('eventi')
    .update({ seats_booked: total, updated_at: new Date().toISOString() })
    .eq('id', eventId)
  return total
}
