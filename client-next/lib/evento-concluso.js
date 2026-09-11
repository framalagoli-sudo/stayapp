// Quando un evento è finito. Una regola sola, usata dalla lista pubblica, dalla
// pagina dell'evento, dalle route che prenotano e dal pannello.
//
// ⛔ Prima si guardava solo l'inizio: un evento di cinque giorni spariva dal
// sito il primo giorno e il pannello lo chiamava «Concluso» mentre era in
// corso. E per prenotare la data non la guardava nessuno: un evento di mesi
// fa, raggiunto da un vecchio post, accettava ancora prenotazioni.
//
// La fine è la più tarda fra inizio e fine dichiarata. Senza `date_end`
// l'evento finisce quando comincia; una `date_end` scritta per sbaglio prima
// dell'inizio non lo fa sparire in anticipo.
//
// ⚠️ Nessuna dipendenza: questo file lo legge anche il browser.

function data(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function fineEvento(ev) {
  const inizio = data(ev?.date_start)
  const fine = data(ev?.date_end)
  if (!inizio) return fine
  return fine && fine > inizio ? fine : inizio
}

export function eventoConcluso(ev, adesso = new Date()) {
  const fine = fineEvento(ev)
  return fine ? fine < adesso : false
}

// Gli stessi due predicati come filtri di una query su `eventi`.
// «Aperto» = l'inizio oppure la fine sono ancora da venire: è la stessa cosa
// che dire che la più tarda delle due non è passata.
export function soloAperti(query, adesso = new Date()) {
  const t = `"${adesso.toISOString()}"`
  return query.or(`date_start.gte.${t},date_end.gte.${t}`)
}

export function soloConclusi(query, adesso = new Date()) {
  const t = `"${adesso.toISOString()}"`
  return query.lt('date_start', adesso.toISOString()).or(`date_end.is.null,date_end.lt.${t}`)
}
