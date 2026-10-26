// Fino a quando si può annullare un evento, e quanto tempo ha chi è in lista
// d'attesa per prendere un posto che si è liberato.
//
// Decisioni di Francesco (26/10/2026): come la cancellazione gratuita di
// Booking — un termine scelto dal titolare evento per evento, 24 ore prima se
// non dice altro; oltre il termine il link non annulla più e si contatta il
// locale. Chi è in lista ha un'ora, mezz'ora se l'evento è il giorno stesso.
//
// ⚠️ Nessuna dipendenza oltre `fuso.js`: lo leggono le route, le email e la
// pagina dell'evento, che sta nel browser.
import { giornoLocale } from './fuso'

export const ORE_PREDEFINITE = 24
export const ORE_MASSIME = 720 // trenta giorni: il CHECK della migration 141

// Quello che arriva dal pannello diventa un sì/no vero e un intero nei limiti.
// Una cifra sbagliata torna al predefinito invece di finire in un 500.
export function annullamentoPulito(payload) {
  if ('annullabile' in payload) payload.annullabile = payload.annullabile !== false
  if ('lista_automatica' in payload) payload.lista_automatica = payload.lista_automatica === true
  if ('annullabile_ore' in payload) {
    const n = Number(payload.annullabile_ore)
    payload.annullabile_ore = Number.isInteger(n) && n >= 0 && n <= ORE_MASSIME ? n : ORE_PREDEFINITE
  }
  return payload
}

// L'istante oltre il quale non si annulla più da soli. `null` = per questo
// evento l'ospite non annulla mai da solo (spento, o senza data).
export function termineAnnullamento(evento) {
  if (evento?.annullabile === false || !evento?.date_start) return null
  const ore = Number.isInteger(evento.annullabile_ore) ? evento.annullabile_ore : ORE_PREDEFINITE
  const inizio = new Date(evento.date_start).getTime()
  if (Number.isNaN(inizio)) return null
  return new Date(inizio - ore * 3600_000)
}

export function entroIlTermine(evento, ora = Date.now()) {
  const t = termineAnnullamento(evento)
  return !!t && ora < t.getTime()
}

// Quanti minuti ha chi è in lista per prendere il posto: mezz'ora se l'evento è
// oggi (nel fuso del locale, non del server), un'ora altrimenti. Mai oltre
// l'inizio dell'evento: un posto offerto per dopo che è cominciato non serve.
export function minutiOfferta(evento, fuso, ora = Date.now()) {
  const stessoGiorno = giornoLocale(evento?.date_start, fuso) === giornoLocale(new Date(ora), fuso)
  const minuti = stessoGiorno ? 30 : 60
  const inizio = evento?.date_start ? new Date(evento.date_start).getTime() : NaN
  if (Number.isNaN(inizio)) return minuti
  return Math.max(0, Math.min(minuti, Math.floor((inizio - ora) / 60_000)))
}

// La frase che si legge sulla pagina dell'evento e nella conferma, da un
// posto solo. `quando` è il termine già scritto nell'ora del locale, nella
// forma «12 novembre 2026, 20:30» (senza il giorno della settimana: «fino al»).
export function fraseAnnullamento(evento, quando, lingua = 'it') {
  if (!termineAnnullamento(evento)) return null
  const ore = Number.isInteger(evento.annullabile_ore) ? evento.annullabile_ore : ORE_PREDEFINITE
  if (lingua === 'en') {
    if (ore === 0) return 'Free cancellation until the event starts.'
    return quando ? `Free cancellation until ${quando}.` : `Free cancellation up to ${ore} ${ore === 1 ? 'hour' : 'hours'} before the event.`
  }
  if (ore === 0) return 'Puoi annullare gratuitamente fino all’inizio dell’evento.'
  return quando
    ? `Puoi annullare gratuitamente fino al ${quando}.`
    : `Puoi annullare gratuitamente fino a ${ore} ${ore === 1 ? 'ora' : 'ore'} prima dell’evento.`
}
