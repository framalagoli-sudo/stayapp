// Lo stato di una prenotazione di una risorsa, con le stesse parole ovunque.
//
// ⚠️ File senza dipendenze: lo leggono sia le route sia il pannello, che è
// codice di browser (regola 5: niente che tocchi `supabaseAdmin`).
//
// «in_attesa» nel database vuol dire due cose diverse, e a schermo vanno dette
// con due nomi:
//   · aspetta il PAGAMENTO  → la persona ha aperto la cassa e ha mezz'ora per
//     pagare; se non paga si annulla da sola. Il titolare non deve fare niente.
//   · aspetta il TITOLARE   → la risorsa si approva a mano: tocca a lui.
// Chiamarle entrambe «Da confermare» farebbe confermare a mano prenotazioni che
// stanno per essere pagate — e a quel punto il pagamento online non viene più
// atteso.

export const STATI_PRENOTAZIONE = ['confermata', 'in_attesa', 'cancellata', 'completata', 'no_show']

// «Sta pagando dal sito»: ha aperto la cassa da solo e ha mezz'ora. Chi ha
// ricevuto un link dal titolare NON è qui: quello lo segue il titolare.
export function attendePagamento(p) {
  return p?.stato === 'in_attesa' && p?.pagamento_stato === 'non_pagato' && !p?.pagamento_richiesto_il
}

// Il titolare ha mandato un link di pagamento e la persona non ha ancora pagato.
// Vale per le due tabelle (eventi e risorse): i campi si chiamano uguale.
export function linkInCorso(r) {
  return r?.pagamento_stato === 'non_pagato' && !!r?.pagamento_richiesto_il
}

// Si può chiedere un pagamento a questa prenotazione? Solo a chi ha (o può
// avere) un posto, non ha già pagato, e non sta pagando dal sito in questo
// momento. La stessa regola la ricontrolla il server (`motivoNonSiPuo`).
export function puoChiederePagamento(tipo, r) {
  if (!r || ['pagato', 'rimborsato'].includes(r.pagamento_stato)) return false
  const allaCassa = r.pagamento_stato === 'non_pagato' && !r.pagamento_richiesto_il
  if (tipo === 'evento') return r.status === 'confirmed' || (r.status === 'pending' && !allaCassa)
  return r.stato === 'confermata' || (r.stato === 'in_attesa' && !allaCassa)
}

const ETICHETTE = {
  confermata:        { label: 'Confermata',            colore: '#137a4a', sfondo: '#e6f7ee' },
  attende_pagamento: { label: 'Attende il pagamento',  colore: '#8a5a00', sfondo: '#fffbeb' },
  in_attesa:         { label: 'Da confermare',         colore: '#a15c00', sfondo: '#fff4e5' },
  cancellata:        { label: 'Annullata',             colore: '#6b6b76', sfondo: '#f0f0f0' },
  completata:        { label: 'Completata',            colore: '#1565c0', sfondo: '#e8f0fe' },
  no_show:           { label: 'Non presentato',        colore: '#b71c1c', sfondo: '#fdeeee' },
}

export function etichettaStato(p) {
  if (attendePagamento(p)) return ETICHETTE.attende_pagamento
  return ETICHETTE[p?.stato] || ETICHETTE.in_attesa
}
