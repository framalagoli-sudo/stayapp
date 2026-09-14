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

// Quanto può pesare una foto che si carica dal pannello.
//
// ⚠️ Non è una nostra prudenza: è il tetto della piattaforma, **misurato** in
// produzione il 14/09/2026. A 4096 KB la richiesta arriva alla nostra route
// (risponde 401 senza credenziali); a 4400 KB risponde **413 la piattaforma**,
// prima che il nostro codice parta — e lì non c'è messaggio che tenga, perché
// non ci arriviamo nemmeno.
//
// Prima il numero era scritto in sette punti e sbagliato in entrambe le
// direzioni: cinque fermavano a 2 MB (scritti quando le foto si salvavano
// grezze; dal 24/08 il server le comprime da solo, quindi rifiutavano foto che
// il sistema gestirebbe benissimo — da telefono la media è 1 MB con punte di
// 3,9) e due promettevano 5 MB, cioè più di quanto passi davvero.
export const LIMITE_FOTO = 4 * 1024 * 1024

// Il messaggio dice anche COME uscirne: «troppo grande» da solo lascia il
// cliente fermo davanti alla sua unica foto.
export function fotoTroppoPesante(file) {
  if (!file || file.size <= LIMITE_FOTO) return null
  return `La foto pesa ${(file.size / 1024 / 1024).toFixed(1)} MB: il massimo è 4 MB. `
    + 'Sul telefono si risolve condividendola in dimensione "media" invece che "originale".'
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
