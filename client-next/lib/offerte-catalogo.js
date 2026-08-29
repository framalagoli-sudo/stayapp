// Cosa un cliente può offrire, e cosa succede quando qualcuno clicca.
//
// ⛔ **Un'offerta non si prenota.** È lo strato che sta sopra il catalogo: si
// prende una cosa che il cliente ha già — un prodotto, un servizio — e la si
// mette in evidenza a certe condizioni. Chi clicca **chiede informazioni** o
// **acquista**. Nient'altro.
//
// Le cose prenotabili nella piattaforma sono due, e restano dove sono:
//   · le **Risorse** (Booking) — la configurazione di ciò che si può prenotare:
//     un furgone, una casa, un campo, un tavolo. Con orari, unità e capienza.
//   · gli **Eventi** — un fatto che accade, con un inizio e una fine.
//
// ⚠️ Il 28/08/2026 le risorse erano state copiate dentro le offerte e il widget
// di prenotazione leggeva queste. Era un errore di modello, non un dettaglio:
// una risorsa **non** è un prodotto, e un prodotto non si prenota — lo si
// acquista o si chiedono informazioni. Rientrato il 29/08. Parole di Francesco:
// «RISORSE non va mai confuso con prodotti, è un'entità separata e deve sempre
// rimanere tale».
//
// ⚠️ Nessun import: questo file lo legge anche il browser.

// Il modo dice solo *quando* si fa, e si deduce dai dati (vedi `modoDedotto`):
// niente tendina da compilare, perché la risposta è già scritta nelle date.
export const MODI = [
  {
    chiave: 'data_fissa',
    titolo: 'A data fissa',
    spiega: 'Vale in un periodo preciso, e quando è passato l\'offerta si spegne da sola.',
    esempi: 'una promozione di Pasqua, un pacchetto weekend',
    vuoleData: true,
  },
  {
    chiave: 'richiesta',
    titolo: 'Su richiesta',
    spiega: 'Nessuna scadenza: resta finché non la togli tu.',
    esempi: 'un corso, una prestazione, un servizio a listino',
  },
]

export const IMPEGNI = [
  {
    chiave: 'chiedi',
    titolo: 'Richiedi informazioni',
    spiega: 'Chi è interessato ti lascia i suoi dati: la richiesta entra nei tuoi contatti e ti arriva un\'email.',
    occupaPosto: false,
    vuolePagamento: false,
  },
  {
    chiave: 'acquista',
    titolo: 'Acquista ora',
    spiega: 'Si paga subito online. Il posto si occupa solo quando il pagamento è arrivato davvero.',
    occupaPosto: true,
    vuolePagamento: true,
  },
]

// ⚠️ Niente elenco di tipi, e niente tendina «modo».
//
// C'era: sei punti di partenza con nomi decisi da noi — «Corso o attività»,
// «Escursione o gita» — e una tendina per dire quando si fa. Erano due errori.
//
// Il primo: **come si chiama quello che offre lo decide il cliente.** Una
// palestra fa corsi, un'agenzia gite, un negozio un'inaugurazione. Il titolo e
// la categoria sono campi liberi, e un elenco chiuso può solo togliere parole a
// chi le conosce meglio di noi.
//
// Il secondo: il «modo» era già scritto nei dati. Se ci sono le date è a data,
// se non ci sono non lo è; se c'è un numero di posti si contano, altrimenti no.
// Chiedere in una tendina una cosa che il dato dice già è chiedere due volte, e
// aprire la strada al caso in cui le due risposte non coincidono.
//
// Resta una sola scelta, perché cambia davvero cosa succede a chi clicca.
export function modoDedotto(offerta) {
  return offerta?.data_inizio ? 'data_fissa' : 'richiesta'
}

const trova = (elenco, chiave, predefinito) =>
  elenco.find(x => x.chiave === chiave) || elenco.find(x => x.chiave === predefinito)

export const modoDi    = c => trova(MODI, c, 'richiesta')
export const impegnoDi = c => trova(IMPEGNI, c, 'chiedi')

// Da usare nelle route prima di scrivere: mai la stringa che arriva dal client.
export const modoValido    = c => MODI.some(m => m.chiave === c) ? c : null
export const impegnoValido = c => IMPEGNI.some(i => i.chiave === c) ? c : null

// Questa offerta occupa un posto quando qualcuno la prende?
export function occupaPosto(offerta) {
  return !!impegnoDi(offerta?.impegno).occupaPosto && offerta?.posti_totali != null
}

// Quanti posti restano. `null` = illimitati, non «zero»: sono due cose diverse
// e confonderle vorrebbe dire mostrare «esaurito» a chi non ha limiti.
export function postiRimasti(offerta) {
  if (!offerta || offerta.posti_totali == null) return null
  return Math.max(0, offerta.posti_totali - (offerta.posti_occupati || 0))
}

export function esaurita(offerta) {
  const r = postiRimasti(offerta)
  return r !== null && r <= 0
}

// Cosa scrivere sul pulsante, se il cliente non l'ha deciso lui.
export function etichettaPredefinita(offerta) {
  if (esaurita(offerta)) return 'Esaurito'
  return { chiedi: 'Richiedi informazioni', acquista: 'Acquista ora' }[offerta?.impegno] || 'Richiedi informazioni'
}
