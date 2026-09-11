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

// Un istante → il valore di un `<input type="datetime-local">`, nell'ora di chi
// guarda. È il verso opposto di `new Date(valore)`, con cui i moduli salvano:
// quel valore lo legge proprio nell'ora di chi guarda.
//
// ⛔ Si usava `toISOString().slice(0, 16)`, cioè l'ora UTC: il campo mostrava
// le 18:30 di un evento delle 20:30, e salvando — anche solo per correggere la
// descrizione — diventava delle 18:30 davvero. Due ore indietro a ogni
// salvataggio: la cena di Garage22 del 10/09, alle 20:30, risultava alle 14:30.
// Senza `fuso` vale quello del browser di chi compila; con `fuso` (quello
// dell'azienda) l'ora è la stessa per tutti, anche per un titolare in viaggio.
export function perCampoDataOra(istante, fuso) {
  if (!istante) return ''
  const d = new Date(istante)
  if (Number.isNaN(d.getTime())) return ''
  const due = n => String(n).padStart(2, '0')
  if (!fuso) {
    return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}T${due(d.getHours())}:${due(d.getMinutes())}`
  }
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: fusoSicuro(fuso), hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(d).map(x => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${due(Number(p.hour) % 24)}:${p.minute}`
}

// Il verso opposto: «2026-09-19T20:30» scritto nel campo → l'istante vero,
// letto nel fuso dell'azienda. Senza `fuso` resta quello del browser, che è
// come si comportava prima.
export function daCampoDataOra(valore, fuso) {
  if (!valore) return null
  if (!fuso) {
    const d = new Date(valore)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const [data, ora] = String(valore).split('T')
  return istanteDi(data, ora, fuso)
}

// Che giorno è, lì: «2026-09-12». `toISOString().slice(0, 10)` dà il giorno
// UTC, e in Italia fra mezzanotte e le due è già domani mentre UTC dice ancora
// ieri — una prenotazione registrata così finisce nel giorno sbagliato.
export function giornoLocale(istante, fuso) {
  const d = istante ? new Date(istante) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: fusoSicuro(fuso), year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d).map(x => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}

// La data breve come la scrive un italiano — «12/9/2026» — nel fuso giusto.
export function dataLocale(istante, fuso) {
  if (!istante) return ''
  return new Date(istante).toLocaleDateString('it-IT', { timeZone: fusoSicuro(fuso) })
}

// Come si scrive un'ora per chi legge in quel fuso. Senza `timeZone`, un'ora
// formattata sul server esce nell'ora del server: è lo stesso difetto visto da
// dietro.
export function oraLocale(istante, fuso, opzioni = {}) {
  if (!istante) return ''
  // `locale` decide la lingua in cui si legge («17 settembre» / «17 September»),
  // `fuso` decide *quale* istante si sta leggendo: sono due cose diverse.
  const { locale = 'it-IT', ...resto } = opzioni
  return new Date(istante).toLocaleString(locale, {
    timeZone: fusoSicuro(fuso),
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    ...resto,
  })
}
