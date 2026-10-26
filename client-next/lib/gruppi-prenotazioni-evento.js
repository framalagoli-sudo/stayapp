// In che gruppo sta una prenotazione di un evento, e quanto ha già pagato.
//
// La stessa domanda la fanno due schermate: l'elenco dentro l'evento e la
// pagina «Prenotazioni», che ne mostra i totali. Con due copie della regola
// basterebbe ritoccarne una perché i numeri della pagina non tornassero più con
// le righe che si contano aprendo l'evento.
//
// ⚠️ Nessuna dipendenza: lo leggono sia il pannello (browser) sia la route.

// Nell'ordine in cui servono a chi gestisce la serata.
export const GRUPPI_EVENTO = ['confermate', 'pagamento', 'daConfermare', 'attesa', 'perse']

export function gruppoPrenotazione(b) {
  if (b.status === 'confirmed') return 'confermate'
  // «In attesa» ha due significati: è alla cassa online (si risolve da sola in
  // mezz'ora), oppure aspetta che il titolare la confermi.
  // Una a cui il titolare ha mandato un link resta fra quelle «da confermare»:
  // è lui che la sta seguendo, non si risolve da sola.
  if (b.status === 'pending') return b.pagamento_stato === 'non_pagato' && !b.pagamento_richiesto_il ? 'pagamento' : 'daConfermare'
  if (b.status === 'waitlist') return 'attesa'
  return 'perse'
}

// Occupa un posto? Tutto tranne chi ha rinunciato e chi è in lista d'attesa —
// ma chi è in lista e ha un posto offerto, ancora valido, lo occupa: è tenuto
// per lui, e se non contasse il sito lo venderebbe a un altro mentre lui legge
// l'email. È LA regola: la usano `recomputeEventSeats`, `confermaPostiEvento` e
// la route del pannello. Chi la chiama deve aver letto `offerta_scade_il`.
export function occupaPosto(b, ora = Date.now()) {
  if (b.status === 'cancelled') return false
  if (b.status === 'waitlist') return !!b.offerta_scade_il && new Date(b.offerta_scade_il).getTime() > ora
  return true
}

// Chi è in lista e ha un posto offerto, ancora valido.
export function postoOfferto(b, ora = Date.now()) {
  return b.status === 'waitlist' && occupaPosto(b, ora)
}

// Quanto di questa prenotazione è già arrivato online.
// ⚠️ Con un acconto è arrivata solo la quota: contare il totale farebbe credere
// al titolare di avere già in tasca anche il saldo.
export function incassatoOnline(evento, b) {
  if (b.pagamento_stato !== 'pagato') return 0
  // Con un link di pagamento la cifra la decide il titolare ed è scritta sulla
  // riga: vale quella. Le prenotazioni di prima non ce l'hanno, e si ricava
  // dalla percentuale dell'evento com'è sempre stato.
  if (b.importo_online != null) return Number(b.importo_online) || 0
  const totale = Number(b.total_amount) || 0
  const perc = Math.min(100, Math.max(0, parseInt(evento?.acconto_percentuale) || 0))
  return perc > 0 ? Math.round(totale * perc) / 100 : totale
}
