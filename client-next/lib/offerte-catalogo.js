// Cosa un cliente può offrire, e cosa succede quando qualcuno clicca.
//
// Due scelte indipendenti, non un elenco di tipi:
//   MODO    → quando si fa      (data fissa, calendario, coperti, su richiesta)
//   IMPEGNO → cosa succede      (chiedi, prenota, acquista)
//
// Dodici combinazioni da due tendine. La cena di Capodanno è «data fissa +
// acquista». Il tavolo del sabato è «coperti + prenota». Il corso di cucina è
// «su richiesta + chiedi». Non esistono più eventi, escursioni, attività e
// risorse come cose diverse: sono la stessa cosa configurata in modo diverso.
//
// I PRESET esistono perché nessuno pensa in termini di «modo» e «impegno»:
// si pensa «voglio fare una serata». Il preset riempie le due tendine e si
// resta liberi di cambiarle — è la stessa regola del tipo di entità, che
// sceglie il punto di partenza e non mette recinti.
//
// ⚠️ Nessun import: questo file lo legge anche il browser.

export const MODI = [
  {
    chiave: 'data_fissa',
    titolo: 'A data fissa',
    spiega: 'Succede in un giorno e a un\'ora precisi. I posti si esauriscono e le prenotazioni si chiudono da sole.',
    esempi: 'una serata, una degustazione, un concerto',
    vuolePosti: true,
    vuoleData: true,
  },
  {
    chiave: 'calendario',
    titolo: 'A calendario',
    spiega: 'Si sceglie giorno e ora fra quelle libere. Puoi averne più copie identiche in parallelo.',
    esempi: 'un tavolo, una sala, un campo, un\'ora di consulenza',
    vuoleOrari: true,
  },
  {
    chiave: 'coperti',
    titolo: 'A coperti',
    spiega: 'Capienza dentro una fascia oraria: quante persone entrano a pranzo, quante a cena.',
    esempi: 'il servizio di sala di un ristorante',
    vuoleOrari: true,
    vuolePosti: true,
  },
  {
    chiave: 'richiesta',
    titolo: 'Su richiesta',
    spiega: 'Nessun calendario e nessun posto da contare: qualcuno chiede, tu rispondi.',
    esempi: 'un corso, un\'escursione, una prestazione',
  },
]

export const IMPEGNI = [
  {
    chiave: 'chiedi',
    titolo: 'Chiedi informazioni',
    spiega: 'Arriva un messaggio. Niente si occupa e non c\'è niente da confermare.',
    occupaPosto: false,
    vuolePagamento: false,
  },
  {
    chiave: 'prenota',
    titolo: 'Prenota',
    spiega: 'Il posto è suo da subito. Si paga dopo, o di persona.',
    occupaPosto: true,
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

// I punti di partenza, nel linguaggio di chi li usa.
export const PRESET = [
  { chiave: 'evento',     titolo: 'Evento',              sotto: 'Una serata, una data sola',        modo: 'data_fissa',  impegno: 'prenota' },
  { chiave: 'tavolo',     titolo: 'Tavolo o sala',       sotto: 'Con orari e coperti',              modo: 'coperti',     impegno: 'prenota' },
  { chiave: 'risorsa',    titolo: 'Spazio o attrezzatura', sotto: 'Si prenota a fasce orarie',      modo: 'calendario',  impegno: 'prenota' },
  { chiave: 'escursione', titolo: 'Escursione o gita',   sotto: 'Con una data, o a richiesta',      modo: 'data_fissa',  impegno: 'chiedi'  },
  { chiave: 'attivita',   titolo: 'Corso o attività',    sotto: 'Chi è interessato ti scrive',      modo: 'richiesta',   impegno: 'chiedi'  },
  { chiave: 'vendita',    titolo: 'Da vendere online',   sotto: 'Si paga subito, come una cena prepagata', modo: 'data_fissa', impegno: 'acquista' },
]

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
  return { chiedi: 'Richiedi informazioni', prenota: 'Prenota', acquista: 'Acquista ora' }[offerta?.impegno] || 'Prenota'
}
