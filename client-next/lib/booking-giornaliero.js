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
  return contaGiorni(risorsa) ? Math.max(0, n - 1) : n
}

// Il periodo più corto che si può prenotare, in notti, quando nessuno ha
// scritto un minimo. Una casa si affitta almeno per una notte; un furgone si
// noleggia anche per **un giorno solo** — ritiro la mattina, riconsegna la sera
// — cioè zero notti.
// ⛔ Prima il minimo era 1 notte per tutti: per chi conta il giorno di
// riconsegna voleva dire 2 giorni, e il noleggio di un giorno era impossibile
// anche scrivendo «1 giorno» nel pannello (Automax, 10/11/2026).
export function minimoPredefinito(risorsa) {
  return contaGiorni(risorsa) ? 0 : 1
}

// ─── Il calendario dei prezzi ────────────────────────────────────────────────
//
// Come nei gestionali alberghieri, **la verità è il giorno**: ogni giorno può
// avere il suo prezzo e le sue restrizioni (`risorse_tariffe`, migration 144).
// La tabella è sparsa — contiene solo i giorni diversi dal prezzo base — quindi
// una risorsa senza righe si comporta esattamente come prima.

// Le righe del calendario come mappa giorno → riga. Solo i giorni interi: le
// fasce orarie appartengono agli slot e qui non hanno senso.
export function mappaTariffe(righe) {
  if (!righe) return {}
  if (!Array.isArray(righe)) return righe     // è già una mappa
  const m = {}
  for (const r of righe) if (r?.data && !r.ora_inizio) m[r.data] = r
  return m
}

// I giorni che si pagano, uno per uno. Devono essere **tanti quanti dice
// `unitaDaPagare`**, o il totale giorno per giorno e quello di sempre
// divergerebbero proprio sulle risorse senza calendario.
//   · chi conta il giorno di riconsegna (un furgone): dal primo all'ultimo
//     compreso — sabato e domenica sono due giorni;
//   · chi conta le notti (una casa): dal primo al giorno prima dell'uscita, e
//     almeno uno.
export function giorniPagati(risorsa, dal, al) {
  if (!dal || !al || al < dal) return []
  const ultimo = contaGiorni(risorsa) ? al : (al > dal ? al : giornoDopo(dal))
  const giorni = []
  for (let g = dal; contaGiorni(risorsa) ? g <= ultimo : g < ultimo; g = giornoDopo(g)) {
    giorni.push(g)
    if (giorni.length > 400) break     // un periodo assurdo non blocca il server
  }
  return giorni
}

export function prezzoDelGiorno(risorsa, tariffe, giorno) {
  const riga = mappaTariffe(tariffe)[giorno]
  const p = riga?.prezzo
  return p != null && Number.isFinite(Number(p)) ? Number(p) : (Number(risorsa?.prezzo) || 0)
}

// Il conto giorno per giorno: il totale e la fotografia di come ci si arriva,
// che finisce sulla prenotazione (`dettaglio_prezzo`). Con un prezzo che cambia
// ogni giorno «prezzo × giorni» non spiega più niente.
export function contoGiornoPerGiorno(risorsa, dal, al, tariffe) {
  const m = mappaTariffe(tariffe)
  const giorni = giorniPagati(risorsa, dal, al).map(data => ({ data, prezzo: prezzoDelGiorno(risorsa, m, data) }))
  const totale = Math.round(giorni.reduce((s, g) => s + g.prezzo, 0) * 100) / 100
  return { totale, giorni }
}

export function totaleGiornaliero(risorsa, dal, al, tariffe) {
  return contoGiornoPerGiorno(risorsa, dal, al, tariffe).totale
}

// Il minimo e il massimo valgono per il giorno in cui si **inizia**, come nei
// gestionali alberghieri (decisione di Francesco del 09/11): chi parte il 10
// agosto segue le regole del 10 agosto. Un giorno senza regola eredita quella
// della risorsa.
export function limitiDelPeriodo(risorsa, tariffe, dal) {
  const conf = risorsa?.disponibilita || {}
  const riga = mappaTariffe(tariffe)[dal]
  const base = minimoPredefinito(risorsa)
  const scritto = riga?.minimo_notti != null ? riga.minimo_notti : conf.minimo_notti
  const minimo = scritto != null && Number.isFinite(Number(scritto)) ? Number(scritto) : base
  const massimo = riga?.massimo_notti != null ? Number(riga.massimo_notti) : (Number(conf.massimo_notti) || 0)
  return { minimo: Math.max(minimo, base), massimo }
}

function dataBreve(g) {
  const [, m, d] = g.split('-')
  return `${Number(d)}/${Number(m)}`
}

// Le restrizioni del calendario: in quel giorno non si inizia, non si
// riconsegna, non si vende. Torna il motivo, con la data, o null.
//
// ⚠️ «Non vendibile» si guarda su tutti i giorni in cui la risorsa è fuori,
// non solo su quelli pagati: per un furgone coincidono, per una casa il giorno
// dell'uscita non è occupato e resta vendibile a chi entra.
export function restrizioneCalendario(risorsa, tariffe, dal, al) {
  const m = mappaTariffe(tariffe)
  if (m[dal]?.chiuso_arrivo)
    return `Il ${dataBreve(dal)} non si può ${contaGiorni(risorsa) ? 'ritirare' : 'arrivare'}. Prova con un'altra data di inizio.`
  if (m[al]?.chiuso_partenza)
    return `Il ${dataBreve(al)} non si può ${contaGiorni(risorsa) ? 'riconsegnare' : 'partire'}. Prova con un'altra data di fine.`
  for (const g of giorniPagati(risorsa, dal, al)) {
    if (m[g]?.non_vendibile) return `Il ${dataBreve(g)} non è disponibile.`
  }
  return null
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
  // regola-ok: aritmetica su giorni puri («2026-09-12»), non su istanti. Il
  // mezzogiorno di partenza tiene il conto lontano dai bordi del giorno.
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
// `tariffe` è il calendario dei prezzi (righe o mappa): facoltativo, e senza
// tutto funziona come prima.
export function verificaPeriodo(risorsa, dal, al, prenotazioni = [], tariffe = null) {
  if (!dal || !al) return { ok: false, motivo: 'Scegli la data di inizio e quella di fine.' }
  if (al < dal) return { ok: false, motivo: 'La data di fine viene prima di quella di inizio.' }

  const conf = risorsa?.disponibilita || {}
  const n = notti(dal, al)
  // ⚠️ I conti restano in notti — è l'unità in cui i limiti sono salvati e non
  // si tocca. Cambia solo come si raccontano a chi legge: chi noleggia un
  // furgone ragiona in giorni, e «il periodo minimo è di 2 notti» non gli dice
  // niente.
  const { minimo, massimo } = limitiDelPeriodo(risorsa, tariffe, dal)
  if (n < minimo) {
    const q = limiteInUnita(minimo, risorsa)
    return { ok: false, motivo: `Il periodo minimo è di ${q} ${nomeUnita(risorsa, q)}.` }
  }
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

  const restrizione = restrizioneCalendario(risorsa, tariffe, dal, al)
  if (restrizione) return { ok: false, motivo: restrizione }

  const libere = unitaLibere(risorsa, dal, al, prenotazioni)
  if (libere <= 0) return { ok: false, motivo: 'In quel periodo è già tutto occupato.' }

  const conto = contoGiornoPerGiorno(risorsa, dal, al, tariffe)
  return { ok: true, libere, notti: n, totale: conto.totale, giorni: conto.giorni }
}
