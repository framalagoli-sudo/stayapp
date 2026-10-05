// La frase con cui una persona dice «sì, scrivetemi anche per le novità».
//
// Garage 22, 04/10/2026: 67 persone avevano prenotato una serata o erano
// rimaste in lista d'attesa, e a NESSUNA si poteva scrivere per invitarla alla
// successiva — nessuno glielo aveva mai chiesto. Avere un contatto non è poterlo
// invitare: serve un sì, dato in quel momento, a quella frase.
//
// Le frasi le ha approvate Francesco (05/10/2026). Stanno qui, in un posto
// solo, perché le leggono in due: il modulo, che le mostra, e la route, che le
// salva come prova. Se le due copie divergessero resterebbe scritta una frase
// che nessuno ha mai letto.
//
// La casella è facoltativa e non è MAI già spuntata: un consenso preimpostato
// non è un consenso. È separata da quella della privacy, che serve a prenotare.
//
// ⚠️ Nessuna dipendenza: lo legge anche il browser.
const TESTI = {
  // Chi prenota una serata o si mette in lista d'attesa.
  evento: { it: 'Avvisatemi delle prossime serate', en: 'Let me know about upcoming events' },
  // Chi prenota una risorsa o un'offerta.
  altro:  { it: 'Avvisatemi di novità e offerte', en: 'Keep me posted on news and offers' },
}

// Il tipo e la lingua arrivano dal client: si cercano in un catalogo chiuso, e
// in mancanza si torna al predefinito. Mai una frase scritta da fuori.
export function testoConsensoPromozioni(tipo, lingua = 'it') {
  const t = TESTI[tipo === 'evento' ? 'evento' : 'altro']
  return t[lingua === 'en' ? 'en' : 'it']
}
