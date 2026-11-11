// La guida del pannello: una scheda per ogni voce del menu.
//
// ⛔ Perché esiste così: la pagina «Aiuto» scritta a maggio–giugno 2026 non è
// mai stata aggiornata e a novembre diceva cose false (risorse solo «slot o
// coperti», menu che non esistono più). Una guida che mente è peggio di nessuna.
// Quindi:
//   · ogni scheda sta in un file suo e dichiara le PAGINE che spiega e i
//     PULSANTI che nomina;
//   · `tests/verifica-guida.mjs` (in deploy.ps1, blocca) controlla che una
//     voce nuova del menu abbia la sua scheda, che i pulsanti nominati esistano
//     ancora nelle pagine, e che nessuna pagina sia cambiata DOPO la sua scheda
//     (date dei commit). Chi cambia una pagina rilegge la scheda, la corregge
//     se serve e aggiorna `rivista`, nello stesso commit.
//
// ⚠️ File senza dipendenze: lo legge il browser (regola 5).

import booking from './booking'
import prenotazioni from './prenotazioni'
import eventi from './eventi'
import contatti from './contatti'
import newsletter from './newsletter'

export const SCHEDE = { booking, prenotazioni, eventi, contatti, newsletter }

// Quale scheda spiega la pagina aperta. Vince il percorso più lungo:
// `/admin/booking/risorse` è di «booking» anche se un giorno ci fosse una
// scheda per `/admin/booking`.
export function schedaDelPercorso(pathname) {
  if (!pathname) return null
  let migliore = null, lunghezza = -1
  for (const s of Object.values(SCHEDE)) {
    for (const p of s.percorsi) {
      const tocca = pathname === p || pathname.startsWith(p + '/')
      if (tocca && p.length > lunghezza) { migliore = s; lunghezza = p.length }
    }
  }
  return migliore
}
