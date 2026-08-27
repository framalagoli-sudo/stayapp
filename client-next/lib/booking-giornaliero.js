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

export function totaleGiornaliero(risorsa, dal, al) {
  const conf = risorsa?.disponibilita || {}
  return unitaDaPagare(dal, al, !!conf.conta_giorno_uscita) * (Number(risorsa?.prezzo) || 0)
}

// Due periodi si toccano?
//
// Con l'ultimo giorno che è quello dell'uscita, chi esce il 10 e chi entra il 10
// **non** si sovrappongono: la casa si libera quel mattino. È il motivo per cui
// il confronto è stretto da un lato e largo dall'altro — invertirlo significa
// perdere una notte affittabile su ogni cambio, oppure affittarla due volte.
export function siSovrappongono(dalA, alA, dalB, alB) {
  if (!dalA || !dalB) return false
  const fineA = alA || dalA, fineB = alB || dalB
  return dalA < fineB && dalB < fineA
}

// Quante unità restano libere in un periodo. `quantita` sono le copie identiche
// della risorsa: tre appartamenti uguali, cinque auto dello stesso modello.
export function unitaLibere(risorsa, dal, al, prenotazioni = []) {
  const occupate = prenotazioni.filter(p => siSovrappongono(dal, al, p.data, p.data_fine)).length
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
  const minimo = Number(conf.minimo_notti) || 1
  if (n < minimo)
    return { ok: false, motivo: `Il periodo minimo è di ${minimo} ${minimo === 1 ? 'notte' : 'notti'}.` }
  const massimo = Number(conf.massimo_notti) || 0
  if (massimo && n > massimo)
    return { ok: false, motivo: `Il periodo massimo è di ${massimo} notti.` }

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
