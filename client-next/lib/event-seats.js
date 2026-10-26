import { supabaseAdmin } from './supabase-server'
import { occupaPosto } from './gruppi-prenotazioni-evento'

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
// Tranne chi è in lista con un posto offerto e ancora valido: quello è tenuto
// per lui. La regola sta in `occupaPosto`, una sola per chi conta i posti.
export async function recomputeEventSeats(eventId) {
  if (!eventId) return 0
  const { data } = await supabaseAdmin
    .from('event_bookings').select('seats, status, offerta_scade_il').eq('event_id', eventId)
  const total = (data || [])
    .filter(b => occupaPosto(b))
    .reduce((s, b) => s + (b.seats || 1), 0)
  await supabaseAdmin.from('eventi')
    .update({ seats_booked: total, updated_at: new Date().toISOString() })
    .eq('id', eventId)
  return total
}
