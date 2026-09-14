// Questa pagina va nei motori di ricerca?
//
// Una domanda sola, una risposta sola. Prima era scritta in un punto — la
// pagina delle strutture — e mancava negli altri due: **l'app dell'ospite di
// ristoranti e attività era indicizzabile**, mentre quella delle strutture no.
// Trovato il 14/09/2026 guardando dove mettere l'interruttore nuovo.
//
// Tre motivi per stare fuori, tutti e tre legittimi:
//
//   1. **È l'app del QR**, non un sito: è quello che si apre inquadrando il
//      codice al tavolo o in camera. Contiene orari, regole, e per le
//      strutture la password del WiFi. Non è una pagina da ricerca.
//   2. **Il minisito è spento**: il cliente non ha (ancora) un sito pubblico.
//   3. **Il cliente ha deciso di non farsi trovare** — l'interruttore
//      «Visibile ai motori di ricerca». I siti nuovi nascono così: un sito
//      vuoto indicizzato è peggio di un sito non indicizzato, perché quello
//      che Google fotografa il primo giorno è il testo di esempio.
//
// ⚠️ Nessuna dipendenza: lo legge anche il browser.

export function fuoriDaiMotori(entita, searchParams = {}) {
  if (!entita) return true
  if (entita.indicizzabile === false) return true
  const mini = entita.minisito || {}
  return searchParams?.qr === '1' || !mini.active
}

// Da mettere nei `metadata` di Next quando la risposta è sì.
export const METADATA_NASCOSTA = { robots: { index: false, follow: false } }
