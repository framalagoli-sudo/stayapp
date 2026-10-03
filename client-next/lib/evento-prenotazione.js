import { accontoDovuto } from './checkout'
import { eventoConcluso } from './evento-concluso'
import { postiEvento } from './posti-evento'

// Le domande che si fanno a un evento quando qualcuno chiede dei posti:
// quanti ne vuole, si può, quanto costa. Le fanno in due — il riepilogo che si
// legge prima di confermare e la prenotazione vera — e devono avere la stessa
// risposta: un riepilogo che dice una cifra e una cassa che ne chiede un'altra
// è peggio di nessun riepilogo.
//
// ⚠️ Solo lato server: passa da `lib/checkout.js`, che tocca il database.

// Quanti posti chiede. Assente = 1, com'è sempre stato; tutto il resto dev'essere
// un intero da 1 in su. ⛔ Con `parseInt(seats) || 1` un «-3» passava: una
// prenotazione di posti negativi, che ne libera invece di occuparne.
export function postiRichiesti(seats) {
  if (seats == null || seats === '') return 1
  const n = Number(seats)
  return Number.isInteger(n) && n >= 1 ? n : null
}

// Perché questa richiesta non si può accettare, o `null` se si può.
// Torna il corpo della risposta: la frase per chi legge e i dati per la pagina.
export function rifiutoPrenotazione(evento, richiesti) {
  if (eventoConcluso(evento)) return { error: 'Questo evento si è già concluso.' }
  if (evento.prenotazioni_chiuse) {
    return { error: evento.prenotazioni_chiuse_testo?.trim() || 'Le prenotazioni per questo evento sono chiuse.' }
  }
  // ⚠️ Il limite del pubblico NON è la capienza: è la capienza meno i posti
  // riservati a chi prenota al telefono.
  const posti = postiEvento(evento)
  if (!posti.illimitato && richiesti > posti.liberiOnline) {
    // ⛔ Diceva solo «Posti esauriti», anche a chi ne aveva chiesti 4 quando
    // ne restavano 2: chi legge non sa se riprovare con meno o rinunciare.
    // E chi è arrivato un istante dopo qualcun altro merita di sapere che
    // c'è una lista d'attesa, invece di un errore rosso e basta.
    return {
      error: posti.liberiOnline === 0
        ? (evento.lista_attesa
          ? 'I posti sono appena finiti. Puoi metterti in lista d\'attesa: ti avvisiamo se se ne libera uno.'
          : 'I posti per questo appuntamento sono finiti.')
        : `Restano ${posti.liberiOnline} ${posti.liberiOnline === 1 ? 'posto' : 'posti'} e ne hai chiesti ${richiesti}.`,
      posti_liberi: posti.liberiOnline,
      lista_attesa: !!evento.lista_attesa,
    }
  }
  return null
}

// Quanto costa e quanto si paga adesso. Il prezzo è quello dell'evento riletto
// dal database, o del pacchetto scelto: mai una cifra arrivata nella richiesta.
export function contoEvento(evento, packageId, posti) {
  let prezzo = evento.price || 0
  if (packageId) {
    const pkg = (evento.packages || []).find(p => p.id === packageId)
    if (pkg) prezzo = pkg.price || 0
  }
  const totale = prezzo * posti
  return { totale, conto: accontoDovuto(evento.acconto_percentuale, totale) }
}
