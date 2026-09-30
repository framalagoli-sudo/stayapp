// Quanti posti restano, e per chi.
//
// ⛔ La formula `seats_total - seats_booked` era scritta a mano in undici punti
// (sito, app del QR, pannello, tre route). Con i posti riservati le risposte
// diventano DUE — quella per il pubblico e quella per il titolare — e undici
// copie da tenere allineate sono undici occasioni di sbagliarne una.
//
//   liberiOnline → quello che il sito può ancora vendere (al netto dei riservati)
//   liberi       → quello che resta davvero in sala (per il pannello)
//
// I posti riservati esistono perché un canale — il telefono — non scrive nel
// sistema: gli si tiene una quota, e il sito non può sovravvendere nemmeno se
// nessuno segna niente. Chi prende una prenotazione a mano può usarli: sono suoi.
//
// ⚠️ Nessuna dipendenza: lo importano sia i componenti del browser sia le route.
export function postiEvento(evento) {
  const capienza = Number(evento?.seats_total) || 0
  const prenotati = Math.max(0, Number(evento?.seats_booked) || 0)
  // Capienza non impostata = posti illimitati: è la convenzione di sempre.
  if (!capienza) {
    return { illimitato: true, capienza: 0, riservati: 0, prenotati, liberi: null, liberiOnline: null, limiteOnline: 0 }
  }
  // Riservare più della capienza vorrebbe dire non vendere niente online: si
  // accetta, ma non si va sotto zero né sopra la capienza.
  const riservati = Math.min(Math.max(Number(evento?.posti_riservati) || 0, 0), capienza)
  const limiteOnline = capienza - riservati
  return {
    illimitato: false,
    capienza,
    riservati,
    prenotati,
    liberi: Math.max(0, capienza - prenotati),
    liberiOnline: Math.max(0, limiteOnline - prenotati),
    limiteOnline,
  }
}

// Quello che il pubblico sa dei posti: quanti se ne possono ancora prenotare
// online (`posti_online`, null = senza limite), e basta. Capienza, prenotati e
// riservati non escono: con due di loro e i posti online il terzo si ricava per
// sottrazione, e i riservati dicono quanti posti il locale tiene per il
// telefono — un dato suo, non dei visitatori (segnalato il 30/09/2026 dalla
// sonda delle colonne pubbliche). Le route pubbliche passano tutte da qui.
export function postiPubblici(evento) {
  const { seats_total, seats_booked, posti_riservati, ...resto } = evento || {}
  const p = postiEvento({ seats_total, seats_booked, posti_riservati })
  return { ...resto, posti_online: p.illimitato ? null : p.liberiOnline }
}

// Sotto questa soglia si avvisa chi organizza: è il momento in cui deve
// smettere di dire sì al telefono. Non è una preferenza da configurare — una
// tendina in più su un pannello che nessuno apre non salva nessun evento.
export const SOGLIA_AVVISO = 5
