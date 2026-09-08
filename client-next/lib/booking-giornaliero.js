// Prenotare a giornate: case, auto, camere, attrezzature.
//
// Le altre due modalità occupano un punto nel tempo — un'ora, un servizio di un
// giorno. Questa occupa un **intervallo**, e da lì viene tutto il resto: due
// prenotazioni non possono accavallarsi, e il prezzo si moltiplica per le notti.
//
// ⚠️ Nessun import: questo file lo legge anche il browser.

// L'ultimo giorno è quello della riconsegna, e la riconsegna non è una notte.
// Da martedì a sabato sono **quattro** notti, non cinque: sbagliare qui vuol
// dire addebitare al cliente una notte che non ha dormito.
export function notti(dal, al) {
  if (!dal || !al) return 0
  const a = new Date(`${dal}T12:00:00`), b = new Date(`${al}T12:00:00`)
  return Math.max(0, Math.round((b - a) / 86400000))
}

// Chi affitta a giornate ragiona a notti; chi noleggia un'auto ragiona a giorni
// (dal 3 al 5 sono tre giorni di noleggio, non due). La differenza la decide il
// cliente, e non è un dettaglio: cambia il totale che paga chi prenota.
export function unitaDaPagare(dal, al, contaIlGiornoDiUscita = false) {
  const n = notti(dal, al)
  return contaIlGiornoDiUscita ? n + 1 : Math.max(1, n)
}

// Come si chiama quello che il cliente conta e paga.
//
// ⛔ Il pannello e i messaggi dicevano «notti» a chiunque, anche a chi noleggia
// un furgone: «il periodo minimo è di 2 notti» a un'autonoleggio non vuol dire
// niente. La parola giusta la decide la stessa impostazione che decide il
// prezzo, `conta_giorno_uscita`, perché è la stessa domanda: l'ultimo giorno
// si paga o no.
export function contaGiorni(risorsa) {
  return !!risorsa?.disponibilita?.conta_giorno_uscita
}

export function nomeUnita(risorsa, quante = 2) {
  if (contaGiorni(risorsa)) return quante === 1 ? 'giorno' : 'giorni'
  return quante === 1 ? 'notte' : 'notti'
}

// I limiti sono salvati **in notti** (`minimo_notti`, `massimo_notti`): mostrare
// quel numero accanto alla parola «giorni» direbbe una cifra falsa. Si converte
// con la stessa regola del prezzo — dal 3 al 5 sono 2 notti e 3 giorni.
export function limiteInUnita(quanteNotti, risorsa) {
  const n = Number(quanteNotti) || 0
  return contaGiorni(risorsa) ? n + 1 : n
}

// E il ritorno, per quando è il pannello a scrivere: quello che si vede è in
// giorni, quello che si salva resta in notti. Senza questa, mettere «3 giorni»
// nel pannello salverebbe tre notti — cioè quattro giorni.
export function limiteInNotti(quanteUnita, risorsa) {
  const n = Number(quanteUnita) || 0
  return contaGiorni(risorsa) ? Math.max(1, n - 1) : n
}

export function totaleGiornaliero(risorsa, dal, al) {
  const conf = risorsa?.disponibilita || {}
  return unitaDaPagare(dal, al, !!conf.conta_giorno_uscita) * (Number(risorsa?.prezzo) || 0)
}

// Due periodi si toccano?
//
// Gli intervalli sono **semi-aperti**: `[dal, fine)`. Con l'ultimo giorno che è
// quello dell'uscita, chi esce il 10 e chi entra il 10 **non** si sovrappongono:
// la casa si libera quel mattino. È il motivo per cui il confronto è stretto da
// un lato e largo dall'altro — invertirlo significa perdere una notte
// affittabile su ogni cambio, oppure affittarla due volte.
//
// ⚠️ Semi-aperto vuol dire che `(giorno, giorno)` è l'intervallo **vuoto**, e un
// intervallo vuoto non tocca mai niente. Per chiedere di un giorno solo si
// passa `(giorno, giornoDopo(giorno))` — o meglio si usa `unitaLibereNelGiorno`,
// che lo fa da sé. Sbagliarlo non dà errore: dà «libero» sempre.
export function siSovrappongono(dalA, alA, dalB, alB) {
  if (!dalA || !dalB) return false
  const fineA = alA || dalA, fineB = alB || dalB
  return dalA < fineB && dalB < fineA
}

export function giornoDopo(g) {
  const d = new Date(`${g}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Fin dove la risorsa è davvero impegnata, in forma semi-aperta.
//
// ⛔ Per una casa la data di fine è l'uscita del mattino: quel giorno si affitta
// di nuovo. Per un furgone **no**: il mezzo torna quel giorno, e quel giorno il
// cliente lo paga (`conta_giorno_uscita`). Trattarli allo stesso modo è il
// difetto misurato sul Furgone di Automax l'08/09: Tommaso pagava il 24 e il 25
// e il sito lasciava prenotare 23→24 a un altro e 25→26 a un terzo. Lo stesso
// giorno venduto due volte, e due persone davanti allo stesso furgone.
//
// Va applicata **a tutti e due i lati** del confronto: al periodo che si chiede
// e a quelli già presi. Su un solo lato la sovrapposizione si vede da una
// direzione e non dall'altra.
export function fineOccupazione(risorsa, dal, al) {
  const fine = al || dal
  return risorsa?.disponibilita?.conta_giorno_uscita ? giornoDopo(fine) : fine
}

// Quante unità restano libere in un periodo. `quantita` sono le copie identiche
// della risorsa: tre appartamenti uguali, cinque auto dello stesso modello.
export function unitaLibere(risorsa, dal, al, prenotazioni = []) {
  const mia = fineOccupazione(risorsa, dal, al)
  const occupate = prenotazioni.filter(p =>
    siSovrappongono(dal, mia, p.data, fineOccupazione(risorsa, p.data, p.data_fine))).length
  return Math.max(0, (Number(risorsa?.quantita) || 1) - occupate)
}

// Quante unità restano libere in **un giorno solo**: è la domanda del
// calendario, che colora i giorni prima che il visitatore scelga l'uscita.
//
// ⛔ Esiste perché chiederlo con `unitaLibere(risorsa, giorno, giorno, …)` è
// l'intervallo vuoto: rispondeva «libero» sempre, e il calendario di Automax
// mostrava liberi il primo e l'ultimo giorno di ogni noleggio. Una prenotazione
// corta — dal 24 al 25 — sta tutta negli estremi e spariva del tutto.
export function unitaLibereNelGiorno(risorsa, giorno, prenotazioni = []) {
  const occupate = (prenotazioni || []).filter(p =>
    siSovrappongono(giorno, giornoDopo(giorno), p.data, fineOccupazione(risorsa, p.data, p.data_fine))).length
  return Math.max(0, (Number(risorsa?.quantita) || 1) - occupate)
}

// Le chiusure che il cliente ha segnato sul calendario. Le altre due modalità
// le rispettano già: qui vanno controllate su **tutto** il periodo, non solo sul
// primo giorno — una casa chiusa a Ferragosto non si affitta dal 12 al 20.
export function periodoBloccato(blocchi, dal, al) {
  return (blocchi || []).some(b => {
    if (b.data) return b.data >= dal && b.data < (al || dal)
    if (b.data_inizio && b.data_fine) return siSovrappongono(dal, al, b.data_inizio, b.data_fine)
    return false
  })
}

// Il periodo si può prenotare? Torna il motivo quando non si può, perché
// «non disponibile» non dice a nessuno cosa cambiare.
export function verificaPeriodo(risorsa, dal, al, prenotazioni = []) {
  if (!dal || !al) return { ok: false, motivo: 'Scegli la data di inizio e quella di fine.' }
  if (al < dal) return { ok: false, motivo: 'La data di fine viene prima di quella di inizio.' }

  const conf = risorsa?.disponibilita || {}
  const n = notti(dal, al)
  // ⚠️ I conti restano in notti — è l'unità in cui i limiti sono salvati e non
  // si tocca. Cambia solo come si raccontano a chi legge: chi noleggia un
  // furgone ragiona in giorni, e «il periodo minimo è di 2 notti» non gli dice
  // niente.
  const minimo = Number(conf.minimo_notti) || 1
  if (n < minimo) {
    const q = limiteInUnita(minimo, risorsa)
    return { ok: false, motivo: `Il periodo minimo è di ${q} ${nomeUnita(risorsa, q)}.` }
  }
  const massimo = Number(conf.massimo_notti) || 0
  if (massimo && n > massimo) {
    const q = limiteInUnita(massimo, risorsa)
    return { ok: false, motivo: `Il periodo massimo è di ${q} ${nomeUnita(risorsa, q)}.` }
  }

  // I giorni in cui non si accetta l'arrivo: chi affitta case spesso vuole solo
  // il sabato, chi noleggia chiude la domenica.
  const arrivi = conf.giorni_arrivo
  if (Array.isArray(arrivi) && arrivi.length && !arrivi.includes(new Date(`${dal}T12:00:00`).getDay()))
    return { ok: false, motivo: 'In quel giorno non si può iniziare. Prova con un\'altra data di inizio.' }

  if (periodoBloccato(risorsa?.blocchi, dal, al))
    return { ok: false, motivo: 'In quel periodo siamo chiusi.' }

  const libere = unitaLibere(risorsa, dal, al, prenotazioni)
  if (libere <= 0) return { ok: false, motivo: 'In quel periodo è già tutto occupato.' }

  return { ok: true, libere, notti: n, totale: totaleGiornaliero(risorsa, dal, al) }
}
