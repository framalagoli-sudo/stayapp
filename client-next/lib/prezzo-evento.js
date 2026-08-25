// Cosa si legge dove sta il prezzo di un evento.
//
// Tre casi, e vanno tenuti distinti perché dicono cose diverse a chi guarda:
//   · il cliente ha scelto di non mostrarlo   → non si scrive niente
//   · il cliente ha scritto qualcosa al posto → «Alla carta», «Su richiesta»
//   · c'è una cifra                            → €25, oppure «Gratis» se è zero
//
// Prima esisteva solo il terzo, e una cena alla carta diventava «Gratis»: non
// un dettaglio estetico, un'informazione falsa data a chi prenota.
//
// ⚠️ Questa funzione riguarda **solo quello che si vede**. Il totale di una
// prenotazione si calcola sempre da `price`, che resta la cifra vera: se le due
// cose divergessero, si addebiterebbe qualcosa di diverso da quanto letto.
//
// Nessun import: la usano i componenti che girano nel browser.

export function prezzoDaMostrare(evento, { gratuito = 'Gratis' } = {}) {
  if (!evento) return null
  if (evento.mostra_prezzo === false) return null

  const scritto = typeof evento.prezzo_testo === 'string' ? evento.prezzo_testo.trim() : ''
  if (scritto) return scritto.slice(0, 40)

  const cifra = Number(evento.price) || 0
  return cifra > 0 ? `€${cifra}` : gratuito
}

// Per la riga «€25 / persona» della pagina di dettaglio, dove un pacchetto
// scelto ha la precedenza sulla cifra dell'evento.
export function prezzoPersona(evento, prezzoScelto, { gratuito = 'Gratuito', perPersona = '/ persona' } = {}) {
  // Qui vale il flag della PAGINA: mostrare il prezzo nell'elenco e mostrarlo
  // dentro sono due decisioni diverse. C'è chi non lo vuole in vetrina ma lo dà
  // a chi apre, e chi fa il contrario.
  if (evento?.mostra_prezzo_pagina === false) return null

  // Il testo libero vale finché non si sceglie un pacchetto: quello ha un
  // prezzo suo, ed è quello che verrà addebitato.
  const scritto = typeof evento?.prezzo_testo === 'string' ? evento.prezzo_testo.trim() : ''
  if (scritto && !prezzoScelto) return scritto.slice(0, 40)

  const cifra = Number(prezzoScelto ?? evento?.price) || 0
  return cifra > 0 ? `€${cifra} ${perPersona}` : gratuito
}
