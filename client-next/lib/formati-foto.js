// I formati in cui si può mostrare la foto di un evento.
//
// Sono quelli in cui la gente pensa già le proprie immagini, perché li usa sui
// social: il quadrato, il verticale del feed, l'orizzontale, la storia. Chi
// carica una locandina verticale vuole vederla verticale, non decapitata.
//
// **Il formato vale nel dettaglio, non nella lista.** Nella griglia degli
// eventi tutte le schede tengono lo stesso rapporto, altrimenti basta un
// evento in verticale per sfondare la riga e la pagina diventa un mosaico
// storto. Nella lista la foto si adatta, e a decidere *quale parte* si vede è
// il punto focale.
//
// ⚠️ Sicurezza: questi valori finiscono in una proprietà CSS. Non si prende mai
// la stringa che arriva dal client — si usa la chiave per **cercare** qui
// dentro, e se non c'è si torna al formato predefinito. Vale sia nel browser
// sia nelle route, dove `formatoValido` fa da filtro prima di scrivere.

export const FORMATI = [
  { chiave: 'quadrato',   etichetta: 'Quadrato',    misura: '1080 × 1080', rapporto: '1 / 1' },
  { chiave: 'verticale',  etichetta: 'Verticale',   misura: '1080 × 1350', rapporto: '4 / 5' },
  { chiave: 'orizzontale',etichetta: 'Orizzontale', misura: '1920 × 1080', rapporto: '16 / 9' },
  { chiave: 'storia',     etichetta: 'Storia',      misura: '1080 × 1920', rapporto: '9 / 16' },
]

export const FORMATO_PREDEFINITO = 'orizzontale'

// Il rapporto da dare al CSS. Mai la stringa dell'utente: sempre una di queste.
export function rapportoDi(chiave) {
  return (FORMATI.find(f => f.chiave === chiave) || FORMATI.find(f => f.chiave === FORMATO_PREDEFINITO)).rapporto
}

// Da usare nelle route prima di salvare.
export function formatoValido(chiave) {
  return FORMATI.some(f => f.chiave === chiave) ? chiave : null
}

// Il punto focale è una coppia di percentuali («50% 30%»): dice quale parte
// della foto resta visibile quando la scheda la ritaglia. Anche qui non si
// accetta testo libero — due numeri fra 0 e 100, o niente.
export function focalValido(valore) {
  if (typeof valore !== 'string') return null
  const m = valore.trim().match(/^(\d{1,3})%\s+(\d{1,3})%$/)
  if (!m) return null
  const [x, y] = [Number(m[1]), Number(m[2])]
  if (x > 100 || y > 100) return null
  return `${x}% ${y}%`
}
