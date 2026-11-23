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

export function prezzoDaMostrare(evento, { gratuito = 'Gratis', da = 'da' } = {}) {
  if (!evento) return null
  if (evento.mostra_prezzo === false) return null

  const modo = modoDi(evento)
  if (modo === 'gratuito') return gratuito
  if (modo === 'testo') return String(evento.prezzo_testo || '').trim().slice(0, 40)
  if (modo === 'cifra') {
    // Con opzioni a prezzi diversi (migration 148) «€15» direbbe che tutto
    // costa 15: si scrive «da €15». `price` è già il più basso.
    return `${prezziDiversi(evento) ? da + ' ' : ''}€${Number(evento.price) || 0}`
  }
  return null
}

function prezziDiversi(evento) {
  const prezzi = (evento?.packages || []).map(p => Number(p.price) || 0)
  return new Set(prezzi).size > 1
}

// Per la riga «€25 / persona» della pagina di dettaglio, dove un pacchetto
// scelto ha la precedenza sulla cifra dell'evento.
export function prezzoPersona(evento, prezzoScelto, { gratuito = 'Gratuito', perPersona = '/ persona', da = 'da' } = {}) {
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
  if (modo === 'cifra') return `${prezziDiversi(evento) ? da + ' ' : ''}€${Number(evento?.price) || 0} ${perPersona}`
  return null
}

// Cosa si compra prenotando: il pacchetto scelto (nome e descrizione) e la riga
// «Cosa comprende il prezzo» scritta dal locale (migration 146). Mai dedotto
// dalla descrizione dell'evento. La usano pagina, app del QR, riepilogo, cassa
// di Stripe ed email di conferma: la stessa frase ovunque. Vuoto = '' (non si
// scrive niente).
//
// ⛔ Con le opzioni (migration 148) «cosa comprende» sta SOLO dentro ogni opzione:
// la riga generale dell'evento non si usa più. Prima finiva sotto ogni opzione —
// «cena + spettacolo» stampato anche sulla ricevuta di chi aveva preso l'ingresso
// al bancone (Francesco, 23/11/2026).
export function cosaComprende(evento, pacchetto = null) {
  const pulito = s => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '')
  const pkg = pacchetto ? [pulito(pacchetto.name), pulito(pacchetto.description)].filter(Boolean).join(' — ') : ''
  const generale = evento?.packages?.length ? '' : pulito(evento?.comprende)
  return [pkg, generale].filter(Boolean).join(' · ').slice(0, 400)
}
