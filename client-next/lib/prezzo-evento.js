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

// ⛔ 18/09/2026, segnalato da Garage 22: la cena si paga sul posto, il campo
// prezzo era vuoto, e la pagina scriveva **«Gratuito»**. Il difetto era la
// deduzione: «nessuna cifra» veniva letto come «è gratis», mentre vuol dire
// «nessuno l'ha detto». Ora lo dice il cliente, con `prezzo_modo` (migration
// 123) — e se non l'ha detto **non si scrive niente**.
function modoDi(evento) {
  if (evento?.prezzo_modo) return evento.prezzo_modo
  // Eventi salvati prima della migration (o letti da una select che non chiede
  // la colonna): si deduce solo ciò che è certo, mai il «gratis».
  const scritto = typeof evento?.prezzo_testo === 'string' ? evento.prezzo_testo.trim() : ''
  if (scritto) return 'testo'
  if ((Number(evento?.price) || 0) > 0) return 'cifra'
  return null
}

export function prezzoDaMostrare(evento, { gratuito = 'Gratis' } = {}) {
  if (!evento) return null
  if (evento.mostra_prezzo === false) return null

  const modo = modoDi(evento)
  if (modo === 'gratuito') return gratuito
  if (modo === 'testo') return String(evento.prezzo_testo || '').trim().slice(0, 40)
  if (modo === 'cifra') return `€${Number(evento.price) || 0}`
  return null
}

// Per la riga «€25 / persona» della pagina di dettaglio, dove un pacchetto
// scelto ha la precedenza sulla cifra dell'evento.
export function prezzoPersona(evento, prezzoScelto, { gratuito = 'Gratuito', perPersona = '/ persona' } = {}) {
  // Qui vale il flag della PAGINA: mostrare il prezzo nell'elenco e mostrarlo
  // dentro sono due decisioni diverse. C'è chi non lo vuole in vetrina ma lo dà
  // a chi apre, e chi fa il contrario.
  if (evento?.mostra_prezzo_pagina === false) return null

  // Un pacchetto scelto ha un prezzo suo, ed è quello che verrà addebitato:
  // vince su qualsiasi cosa dica l'evento.
  if (prezzoScelto != null && prezzoScelto !== '') {
    const p = Number(prezzoScelto) || 0
    return p > 0 ? `€${p} ${perPersona}` : gratuito
  }

  const modo = modoDi(evento)
  if (modo === 'gratuito') return gratuito
  if (modo === 'testo') return String(evento?.prezzo_testo || '').trim().slice(0, 40)
  if (modo === 'cifra') return `€${Number(evento?.price) || 0} ${perPersona}`
  return null
}
