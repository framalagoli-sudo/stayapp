import { supabaseAdmin } from './supabase-server'

// Quanti posti sono presi davvero.
//
// Fonte di verità unica = `event_bookings`, ricontata ogni volta: sommare e
// sottrarre a ogni movimento fa scivolare il numero, e a quel punto nessuno sa
// più quale sia quello giusto.
//
// ⛔ Due stati NON occupano un posto, per due ragioni diverse:
//   · `cancelled` — la persona non viene;
//   · `waitlist`  — la persona **vorrebbe** venire ma non è entrata. Contarla
//     sarebbe il difetto che svuota la funzione: la lista d'attesa riempirebbe
//     l'evento da sola, e quando un posto si libera non risulterebbe libero —
//     né per chi prenota né per chi è in lista.
const NON_OCCUPANO = ['cancelled', 'waitlist']

export async function recomputeEventSeats(eventId) {
  if (!eventId) return 0
  const { data } = await supabaseAdmin
    .from('event_bookings').select('seats, status').eq('event_id', eventId)
  const total = (data || [])
    .filter(b => !NON_OCCUPANO.includes(b.status))
    .reduce((s, b) => s + (b.seats || 1), 0)
  await supabaseAdmin.from('eventi')
    .update({ seats_booked: total, updated_at: new Date().toISOString() })
    .eq('id', eventId)
  return total
}
