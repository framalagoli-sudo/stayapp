// Un indirizzo di ritorno (`?back=…`) arriva dall'URL, quindi da chiunque.
// Vale solo se è un percorso di questo stesso sito: `/r/slug`, `/p/chi-siamo`.
// Un indirizzo assoluto — anche `//altro-sito.it`, che il browser legge come
// assoluto — si scarta, così «Indietro» non può portare su un altro sito.
//
// Non guarda `window`: la stessa risposta sul server e nel browser, altrimenti
// l'HTML servito e quello disegnato divergono (errore di hydration).
//
// ⚠️ File senza dipendenze: lo importano componenti di browser.
const BASE = 'https://interno.invalid'

export function percorsoInterno(valore) {
  if (typeof valore !== 'string' || !valore.startsWith('/') || valore.startsWith('//') || valore.startsWith('/\\')) return null
  try {
    const u = new URL(valore, BASE)
    return u.origin === BASE ? u.pathname + u.search + u.hash : null
  } catch { return null }
}
