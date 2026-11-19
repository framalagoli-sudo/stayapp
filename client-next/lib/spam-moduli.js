// Quando una risposta a un modulo ha i segni dello spam. Senza dipendenze.
//
// ⛔ Una risposta sospetta NON si butta: si salva marcata e decide il titolare
// (migration 147). Fino al 19/11/2026 il filtro rispondeva «ok» e scartava, e
// tra i motivi c'erano le lettere cirilliche, cinesi e arabe (un ospite
// straniero spariva) e la parola «casino» (in italiano è una parola normale).
// Quelle due regole sono tolte del tutto: non dicono niente su chi scrive.
//
// I segnali che restano, ognuno sufficiente a marcare (non a scartare):
//   · parole tipiche dello spam commerciale;
//   · due o più link in un campo di testo;
//   · il modulo inviato in meno di 2 secondi da quando è stato aperto (il
//     tempo lo manda la pagina, vedi lib/campo-trappola.js);
//   · la verifica anti-robot di Turnstile RIFIUTATA (un token assente no:
//     succede anche alle persone, ed è il motivo per cui Turnstile resta morbido).

const PAROLE = /\b(viagra|cialis|crypto|bitcoin|nft|forex|backlinks?|seo services?|buy followers|make money fast|casino online|online casino|betting tips|loan offer)\b/i
const LINK = /https?:\/\//gi
export const SECONDI_TROPPO_RAPIDO = 2

export function motiviSpam(dati, campi, { apertoMs, turnstileRifiutato = false } = {}) {
  const motivi = new Set()
  for (const c of campi || []) {
    if (c.tipo !== 'text' && c.tipo !== 'textarea') continue
    const val = String(dati?.[c.id] ?? '')
    if (!val) continue
    if (PAROLE.test(val)) motivi.add('parole tipiche dello spam')
    if ((val.match(LINK) || []).length >= 2) motivi.add('due o più link')
  }
  const ms = Number(apertoMs)
  if (Number.isFinite(ms) && ms >= 0 && ms < SECONDI_TROPPO_RAPIDO * 1000) motivi.add('inviato in meno di 2 secondi')
  if (turnstileRifiutato) motivi.add('verifica anti-robot non superata')
  return [...motivi]
}
