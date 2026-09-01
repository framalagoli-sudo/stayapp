// Che ora è, davvero.
//
// Una prenotazione ha una data e un'ora scritte come le legge il cliente sul
// muro: «4 settembre, 10:00». Da sole non dicono un istante — dipendono da dove
// si trova. `new Date('2026-09-04T10:00')` le legge nel fuso di CHI ESEGUE, e
// Vercel esegue in UTC: per un'attività italiana quelle 10:00 diventavano le
// 12:00, e il promemoria «24 ore prima» partiva due ore prima del dovuto.
//
// ⚠️ Nessun import: questo file lo legge anche il browser.

// Il fuso di ripiego. Non è un'opinione sul mondo: è il fuso delle aziende che
// c'erano quando la colonna è stata aggiunta, tutte italiane. Chi si registra
// da qui in avanti se lo porta dal proprio browser.
export const FUSO_PREDEFINITO = 'Europe/Rome'

// ⚠️ Un nome di fuso finisce dentro `Intl`, che su una stringa inventata lancia:
// una route pubblica che accetta il valore così com'è si spegnerebbe con un 500.
// Il catalogo chiuso qui è quello del runtime — non una lista scritta a mano,
// che invecchia — e in mancanza si torna al predefinito, mai al valore ricevuto.
export function fusoValido(nome) {
  if (!nome || typeof nome !== 'string') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: nome })
    return true
  } catch { return false }
}

export function fusoSicuro(nome) {
  return fusoValido(nome) ? nome : FUSO_PREDEFINITO
}

// Di quanto è avanti quel fuso rispetto a UTC, in quell'istante preciso.
// Si chiede al runtime invece di tenere una tabella: l'ora legale sposta lo
// scarto due volte l'anno, e in date diverse la risposta è diversa.
function scartoMs(istante, fuso) {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: fuso, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(istante).map(p => [p.type, p.value])
  )
  // `hour` può valere «24» a mezzanotte in alcune combinazioni: il resto lo
  // riporta a 0, altrimenti l'istante calcolato salta di un giorno.
  const comeSeFosseUTC = Date.UTC(
    Number(parti.year), Number(parti.month) - 1, Number(parti.day),
    Number(parti.hour) % 24, Number(parti.minute), Number(parti.second)
  )
  return comeSeFosseUTC - istante.getTime()
}

// «4 settembre, 10:00, a Roma» → l'istante vero.
//
// Si parte trattando l'orario come se fosse UTC e poi si toglie lo scarto. Il
// conto si fa DUE volte: il primo scarto è quello dell'istante sbagliato, e nei
// due giorni all'anno in cui l'ora legale cambia il primo tentativo cadrebbe
// dalla parte sbagliata del salto.
export function istanteDi(data, ora, fuso) {
  if (!data) return null
  const orario = /^\d{1,2}:\d{2}/.test(String(ora || '')) ? String(ora).slice(0, 5).padStart(5, '0') : '09:00'
  const comeUTC = Date.parse(`${data}T${orario}:00Z`)
  if (Number.isNaN(comeUTC)) return null
  const f = fusoSicuro(fuso)
  let ts = comeUTC - scartoMs(new Date(comeUTC), f)
  ts = comeUTC - scartoMs(new Date(ts), f)
  return new Date(ts)
}

// Il fuso in cui si trova chi sta guardando la pagina. Serve a proporre il
// valore giusto a chi si registra, invece di fargli cercare il proprio nome in
// una tendina di seicento voci.
export function fusoDelBrowser() {
  try {
    return fusoSicuro(Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch { return FUSO_PREDEFINITO }
}

// I fusi da mostrare nella tendina. Li dà il runtime; se non li dà (browser
// vecchi), restano almeno quelli dei clienti che abbiamo.
export function elencoFusi() {
  try {
    const tutti = Intl.supportedValuesOf('timeZone')
    if (tutti?.length) return tutti
  } catch { /* sotto il ripiego */ }
  return ['Europe/Rome', 'Europe/London', 'Europe/Berlin', 'Europe/Madrid',
          'Europe/Paris', 'Europe/Lisbon', 'America/New_York', 'America/Los_Angeles', 'UTC']
}

// Come si scrive un'ora per chi legge in quel fuso. Senza `timeZone`, un'ora
// formattata sul server esce nell'ora del server: è lo stesso difetto visto da
// dietro.
export function oraLocale(istante, fuso, opzioni = {}) {
  if (!istante) return ''
  return new Date(istante).toLocaleString('it-IT', {
    timeZone: fusoSicuro(fuso),
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    ...opzioni,
  })
}
