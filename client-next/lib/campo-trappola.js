// Il campo trappola anti-robot dei moduli, e come non scambiare una persona
// per un robot. Senza dipendenze: lo leggono i moduli nel browser e la route.
//
// ⛔ 18/11/2026: una richiesta vera dal modulo di Panoramic non è mai arrivata
// (né nel database, né nel limitatore, che registra ogni invio). La trappola era
// il PRIMO campo di testo del modulo, subito prima di «Nome e cognome», con
// `autocomplete="off"` — che Chrome e Safari spesso ignorano quando compilano un
// modulo per la persona. Trappola piena → il server rispondeva «ok» e scartava
// tutto, senza traccia: la persona leggeva «inviato», il titolare non riceveva
// niente. Vale per ogni sito.
//
// Ora la trappola da sola non scarta: serve anche che il modulo sia stato inviato
// troppo in fretta (o senza dire quando è stato aperto: il tempo lo scrive il
// JavaScript della pagina, che i robot di solito non eseguono). Una persona,
// anche col completamento automatico, ci mette qualche secondo.

export const SECONDI_MINIMI = 3

// Vero = trattalo come un robot (rispondi «ok» e non salvare).
// `trappola`: il valore del campo nascosto · `apertoMs`: da quanto il modulo era
// aperto quando è partito l'invio (lo manda il browser).
export function sembraUnRobot(trappola, apertoMs) {
  if (!trappola) return false
  const ms = Number(apertoMs)
  return !Number.isFinite(ms) || ms < SECONDI_MINIMI * 1000
}

// L'attributo `autocomplete` di un campo vero: dice al browser dove mettere
// nome, email e telefono, invece di lasciarglielo indovinare.
export function completamentoDi(campo) {
  if (campo?.tipo === 'email') return 'email'
  if (campo?.tipo === 'tel') return 'tel'
  if (campo?.tipo === 'text' && /nome|name/i.test(String(campo.label || ''))) return 'name'
  return undefined
}
