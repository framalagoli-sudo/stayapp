import { supabaseAdmin } from '@/lib/supabase-server'
import { siSovrappongono } from '@/lib/booking-giornaliero'

// La capienza deve reggere anche a richieste simultanee.
//
// Il controllo "leggi i posti → decidi → inserisci" non è atomico: due richieste
// che arrivano insieme leggono lo stesso valore, passano entrambe e la capienza
// salta (misurato il 24/08/2026: 4 prenotazioni su un evento da 1 posto).
//
// Qui si inserisce prima e si verifica dopo, contando **solo le prenotazioni
// arrivate prima della propria**: chi è in eccesso si ritira. È deterministico
// anche quando le richieste sono contemporanee — tutte vedono lo stesso ordine —
// e realizza la regola voluta: l'ultimo posto va a chi è arrivato per primo.
// A parità di istante decide l'id, che è comunque uguale per tutti i lettori.

const primaDi = (a, b) => a.created_at < b.created_at || (a.created_at === b.created_at && a.id < b.id)

// Restituisce true se la prenotazione può restare, false se è stata ritirata.
export async function confermaPostiEvento(eventId, bookingId) {
  try {
    const { data: evento } = await supabaseAdmin.from('eventi').select('seats_total').eq('id', eventId).single()
    if (!evento?.seats_total) return true // capienza non impostata = illimitata

    const { data: mia } = await supabaseAdmin.from('event_bookings')
      .select('id, seats, created_at').eq('id', bookingId).single()
    if (!mia) return false

    const { data: tutte } = await supabaseAdmin.from('event_bookings')
      .select('id, seats, created_at, status').eq('event_id', eventId)

    const occupatiPrima = (tutte || [])
      .filter(b => b.status !== 'cancelled' && primaDi(b, mia))
      .reduce((s, b) => s + (b.seats || 1), 0)

    if (occupatiPrima + (mia.seats || 1) > evento.seats_total) {
      await supabaseAdmin.from('event_bookings').delete().eq('id', bookingId)
      return false
    }
    return true
  } catch (e) {
    console.error('[capienza] evento:', e.message)
    return true // in dubbio non si annulla una prenotazione già accettata
  }
}

// Stessa logica per le risorse prenotabili. La capienza dipende dalla modalità:
// a slot conta quante prenotazioni insistono sulla stessa ora (limite `quantita`),
// a coperti quante persone in quel servizio (limite `max_coperti`).
export async function confermaPostiPrenotazione(risorsa, prenotazioneId) {
  try {
    const { data: mia } = await supabaseAdmin.from('prenotazioni')
      .select('id, data, data_fine, ora_inizio, servizio, n_persone, created_at').eq('id', prenotazioneId).single()
    if (!mia) return false

    // A giornate non si contano le ore ma i periodi che si accavallano. È il
    // punto dove, senza controllo, si affitta due volte la stessa casa per la
    // stessa settimana — e a differenza di uno slot doppio, qui se ne accorgono
    // due clienti davanti alla stessa porta.
    if (risorsa.modalita === 'giornaliero') {
      const limite = risorsa.quantita || 1
      const { data: tutte } = await supabaseAdmin.from('prenotazioni')
        .select('id, data, data_fine, created_at')
        .eq('risorsa_id', risorsa.id).in('stato', ['confermata', 'in_attesa'])
        .gte('data_fine', mia.data)

      const occupatiPrima = (tutte || [])
        .filter(b => b.id !== mia.id && primaDi(b, mia) && siSovrappongono(mia.data, mia.data_fine, b.data, b.data_fine))
        .length

      if (occupatiPrima + 1 > limite) {
        await supabaseAdmin.from('prenotazioni').delete().eq('id', prenotazioneId)
        return false
      }
      return true
    }

    const coperti = risorsa.modalita === 'coperti'
    const limite = coperti ? (risorsa.max_coperti || 0) : (risorsa.quantita || 1)
    if (!limite) return true

    let q = supabaseAdmin.from('prenotazioni')
      .select('id, ora_inizio, servizio, n_persone, created_at')
      .eq('risorsa_id', risorsa.id).eq('data', mia.data).in('stato', ['confermata', 'in_attesa'])
    const { data: tutte } = await q

    const stessoPosto = (b) => coperti
      ? b.servizio === mia.servizio && b.ora_inizio === mia.ora_inizio
      : b.ora_inizio === mia.ora_inizio

    const occupatiPrima = (tutte || [])
      .filter(b => stessoPosto(b) && primaDi(b, mia))
      .reduce((s, b) => s + (coperti ? (b.n_persone || 1) : 1), 0)

    const mioPeso = coperti ? (mia.n_persone || 1) : 1
    if (occupatiPrima + mioPeso > limite) {
      await supabaseAdmin.from('prenotazioni').delete().eq('id', prenotazioneId)
      return false
    }
    return true
  } catch (e) {
    console.error('[capienza] prenotazione:', e.message)
    return true
  }
}
