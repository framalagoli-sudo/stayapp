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

export function attendePagamento(p) {
  return p?.stato === 'in_attesa' && p?.pagamento_stato === 'non_pagato'
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
