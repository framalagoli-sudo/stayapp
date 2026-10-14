// Il Club: le regole che servono sia al pannello (browser) sia alle route.
// Nessuna dipendenza.
//
// Il Club è la consulenza di OltreNova scritta una volta e letta da tutti i
// clienti (STRATEGIA.md §6.4): occasioni con una data, strategie di marketing,
// il focus del periodo. I clienti leggono e basta: niente post, niente commenti.

export const TIPI = {
  occasione: { nome: 'Occasione', descrizione: 'Una data da sfruttare: una festa, una ricorrenza, una stagione.' },
  strategia: { nome: 'Strategia', descrizione: 'Una tecnica di marketing da mettere in pratica, che resta in archivio.' },
  focus:     { nome: 'Focus', descrizione: 'Il tema del periodo: su cosa concentrarsi adesso.' },
}

// Dove porta il pulsante di un contenuto. Catalogo chiuso: nel database c'è
// solo la chiave, mai un indirizzo — un valore inventato non porta da nessuna parte.
export const AZIONI = {
  newsletter:   { testo: 'Scrivi una newsletter',     link: '/admin/newsletter' },
  eventi:       { testo: 'Crea un evento',            link: '/admin/eventi' },
  offerte:      { testo: 'Prepara un\'offerta',       link: '/admin/offerte' },
  contatti:     { testo: 'Guarda i tuoi contatti',    link: '/admin/contatti' },
  recensioni:   { testo: 'Chiedi una recensione',     link: '/admin/recensioni' },
  blog:         { testo: 'Scrivi un articolo',        link: '/admin/blog' },
  social:       { testo: 'Prepara un post',           link: '/admin/content-studio' },
  piano:        { testo: 'Apri il piano editoriale',  link: '/admin/piano-editoriale' },
}

export const azioneDi = chiave => (chiave && AZIONI[chiave]) ? { chiave, ...AZIONI[chiave] } : null

const DATA = /^\d{4}-\d{2}-\d{2}$/
const dataOk = v => typeof v === 'string' && DATA.test(v) && !Number.isNaN(new Date(v + 'T00:00:00Z').getTime())
const MESTIERE = /^[a-z0-9_]{2,40}$/

// Quello che la regia manda, ricostruito campo per campo: ciò che non è
// previsto non passa. Restituisce { contenuto } oppure { errore }.
export function contenutoPulito(body = {}) {
  const tipo = String(body.tipo || '')
  if (!TIPI[tipo]) return { errore: 'Tipo non valido' }
  const titolo = String(body.titolo || '').trim().slice(0, 160)
  if (!titolo) return { errore: 'Il titolo è obbligatorio' }
  const testo = String(body.testo || '').slice(0, 12000)

  let mestieri = null
  if (Array.isArray(body.mestieri) && body.mestieri.length) {
    mestieri = [...new Set(body.mestieri.map(String))].filter(m => MESTIERE.test(m)).slice(0, 20)
    if (!mestieri.length) mestieri = null
  }

  const data_occasione = dataOk(body.data_occasione) ? body.data_occasione : null
  if (tipo === 'occasione' && !data_occasione) return { errore: 'Un\'occasione ha bisogno del suo giorno' }
  const visibile_dal = dataOk(body.visibile_dal) ? body.visibile_dal : oggiIso()
  const visibile_al = dataOk(body.visibile_al) ? body.visibile_al : null
  if (visibile_al && visibile_al < visibile_dal) return { errore: 'La fine viene prima dell\'inizio' }

  const azione = body.azione && AZIONI[body.azione] ? body.azione : null
  const stato = body.stato === 'pubblicato' ? 'pubblicato' : 'bozza'
  return { contenuto: { tipo, titolo, testo, mestieri, data_occasione, visibile_dal, visibile_al, azione, stato } }
}

// Il giorno nel fuso del cliente, non in quello del server: dopo le 22 italiane
// sono due date diverse, e «fra 10 giorni» diventerebbe «fra 11».
export function oggiIso(d = new Date(), fuso = 'Europe/Rome') {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d) }
  catch { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d) }
}

// Vale per questa azienda? Senza mestieri = per tutti.
export const perMestieri = (c, mestieriAzienda) =>
  !c.mestieri?.length || c.mestieri.some(m => mestieriAzienda.includes(m))

// È nella finestra di «Oggi per te»?
export const inVetrina = (c, oggi = oggiIso()) =>
  c.visibile_dal <= oggi && (!c.visibile_al || c.visibile_al >= oggi)

// «fra 10 giorni», «domani», «oggi»: si calcola, non si scrive.
export function quandoManca(dataOccasione, oggi = oggiIso()) {
  if (!dataOccasione) return null
  const giorni = Math.round((new Date(dataOccasione + 'T00:00:00Z') - new Date(oggi + 'T00:00:00Z')) / 864e5)
  if (giorni < 0) return null
  if (giorni === 0) return 'oggi'
  if (giorni === 1) return 'domani'
  return `fra ${giorni} giorni`
}

// Le occasioni dell'anno da cui la regia parte. Sono solo un promemoria: una
// bozza nasce quando Francesco preme «Prepara». Date fisse; Pasqua e le feste
// mobili si aggiungono a mano dalla regia.
export const CALENDARIO = [
  { giorno: '01-06', nome: 'Epifania' },
  { giorno: '02-14', nome: 'San Valentino' },
  { giorno: '03-08', nome: 'Festa della donna' },
  { giorno: '03-19', nome: 'Festa del papà' },
  { giorno: '04-25', nome: 'Festa della Liberazione (ponte di primavera)' },
  { giorno: '05-01', nome: 'Primo maggio' },
  { giorno: '06-02', nome: 'Festa della Repubblica' },
  { giorno: '06-21', nome: 'Inizio dell\'estate' },
  { giorno: '08-15', nome: 'Ferragosto' },
  { giorno: '09-15', nome: 'Rientro dalle vacanze' },
  { giorno: '10-31', nome: 'Halloween' },
  { giorno: '11-27', nome: 'Black Friday' }, // è l’ultimo venerdì di novembre: va spostato ogni anno
  { giorno: '12-08', nome: 'Immacolata e inizio del periodo natalizio' },
  { giorno: '12-25', nome: 'Natale' },
  { giorno: '12-31', nome: 'Capodanno' },
]

// Le prossime occasioni del calendario, con la data dell'anno giusto.
export function prossimeOccasioni(oggi = oggiIso(), quante = 6) {
  const anno = Number(oggi.slice(0, 4))
  return [anno, anno + 1]
    .flatMap(a => CALENDARIO.map(o => ({ ...o, data: `${a}-${o.giorno}` })))
    .filter(o => o.data >= oggi)
    .slice(0, quante)
}
