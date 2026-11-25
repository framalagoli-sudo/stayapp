// Quando il pubblico vede quanti posti restano (migration 149).
//
// «60 posti disponibili» su una serata appena aperta dice «non è venuto
// nessuno»; «Restano 6 posti» spinge a prenotare. Lo decide il locale, evento
// per evento: sempre (com'era) · mai · da una percentuale di posti occupati.
//
// Occupato = non più prenotabile dal sito: prenotati più i posti tenuti per il
// telefono. È quello che conta per chi guarda la pagina.
// «Esaurito» si vede sempre: è un'informazione, non una vetrina.
//
// La decisione la prende il server (conosce la capienza, il pubblico no) e al
// browser arriva solo il risultato, `posti_visibili`.
//
// ⚠️ Senza dipendenze: lo importano le route e i componenti del pannello.

export const MODI_POSTI = ['sempre', 'mai', 'soglia']
export const SOGLIA_PREDEFINITA = 80

export function modoPosti(v) {
  return MODI_POSTI.includes(v) ? v : 'sempre'
}

export function sogliaPosti(v) {
  const n = parseInt(v)
  return Number.isInteger(n) ? Math.min(99, Math.max(1, n)) : SOGLIA_PREDEFINITA
}

// `posti` = il risultato di postiEvento / postiOpzione.
export function postiVisibili(posti, { mostra_posti, mostra_posti_soglia } = {}) {
  if (!posti || posti.illimitato) return false
  if (posti.liberiOnline <= 0) return true
  const modo = modoPosti(mostra_posti)
  if (modo === 'sempre') return true
  if (modo === 'mai') return false
  const occupati = posti.capienza - posti.liberiOnline
  return occupati * 100 >= sogliaPosti(mostra_posti_soglia) * posti.capienza
}
