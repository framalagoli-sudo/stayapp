import { supabaseAdmin } from './supabase-server'
import { opzioniPulite, derivatiDaOpzioni, occupatiPerOpzione } from './opzioni-evento'

// Quando il titolare salva le opzioni di un evento (migration 148).
//
// Tre cose, in quest'ordine:
//   1. le opzioni passano da `opzioniPulite` (prima `packages` si salvava
//      com'era arrivato dal browser, e finiva sulla pagina pubblica);
//   2. posti, posti per il telefono e prezzo dell'evento si CALCOLANO dalle
//      opzioni (somma, somma, il più basso);
//   3. un'opzione che ha prenotazioni non si toglie: quei posti sparirebbero
//      dal conto e il sito li rivenderebbe.
//
// E un evento che passa da prezzo unico a opzioni con prenotazioni già fatte:
// quelle vanno nella PRIMA opzione (l'editor la crea dal prezzo di prima).
// Senza, la prima opzione risulterebbe vuota e i suoi posti si venderebbero
// una seconda volta.
//
// `payload` è quello della PATCH: viene corretto qui. Restituisce
// { errore } oppure { dopo } — `dopo()` va chiamata a salvataggio riuscito.
export async function preparaOpzioni(eventId, payload) {
  if (!('packages' in payload)) return { dopo: async () => {} }
  const nuove = opzioniPulite(payload.packages)
  payload.packages = nuove
  const derivati = derivatiDaOpzioni(nuove)
  if (derivati) Object.assign(payload, derivati)

  if (!eventId) return { dopo: async () => {} }
  const [{ data: prima }, { data: prenotazioni }] = await Promise.all([
    supabaseAdmin.from('eventi').select('packages, acconto_percentuale').eq('id', eventId).maybeSingle(),
    supabaseAdmin.from('event_bookings').select('id, seats, status, offerta_scade_il, scelte, package_id').eq('event_id', eventId),
  ])
  const occupati = occupatiPerOpzione(prenotazioni)
  for (const o of prima?.packages || []) {
    if (occupati[o.id] > 0 && !nuove.some(n => n.id === o.id)) {
      return { errore: `«${o.name}» ha ${occupati[o.id]} posti prenotati: non si può togliere. Annulla o sposta prima quelle prenotazioni.` }
    }
  }

  const senzaScelte = (prenotazioni || []).filter(b => !b.scelte?.length && !b.package_id)
  const daAssegnare = !(prima?.packages || []).length && nuove.length && senzaScelte.length
  return {
    dopo: async () => {
      if (daAssegnare) {
        const o = nuove[0]
        for (const b of senzaScelte) {
          await supabaseAdmin.from('event_bookings').update({
            package_id: o.id,
            scelte: [{ id: o.id, nome: o.name, prezzo: o.price, quantita: b.seats || 1, acconto: o.acconto_percentuale ?? (parseInt(payload.acconto_percentuale ?? prima?.acconto_percentuale) || 0) }],
          }).eq('id', b.id)
        }
      }
    },
  }
}
