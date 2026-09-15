// La formula che accetta chi ordina nello shop.
//
// Un posto solo, senza dipendenze: la mostra il modulo nel browser e la salva
// la route insieme all'ordine (migration 118). Se fossero due testi, prima o
// poi il cliente leggerebbe una frase e nel database ne resterebbe un'altra —
// e la prova del consenso non proverebbe più niente.
//
// ⚠️ Cambiarla è lecito, ma solo qui: gli ordini già salvati tengono la
// formula che era in vigore quando sono stati fatti.
export const TESTO_CONSENSO_ORDINE =
  "Ho letto e accetto l'informativa sulla privacy. I miei dati saranno usati per gestire questo ordine."
