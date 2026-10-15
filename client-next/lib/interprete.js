// «Dimmi cosa cambiare»: l'interprete dell'editor delle pagine.
//
// Il titolare scrive (o dice al microfono) una frase — «sposta le recensioni
// sopra il listino», «il titolo della copertina è Benvenuti da Mario», «togli
// le domande frequenti» — e l'AI la traduce in MOSSE di un catalogo chiuso.
// Sono le mosse che l'editor sa già fare a mano: spostare, togliere e copiare
// una sezione, scrivere un testo che c'è già, cambiare lo sfondo, copiare o
// togliere un elemento di un elenco, riscrivere i testi di una sezione,
// chiedere all'AI una sezione nuova, aprire la scheda di una sezione.
//
// ⛔ Niente si salva da solo e niente esce dal catalogo. La route ricostruisce
// ogni mossa da zero (`ripulisciMosse`): una sezione o un campo li può
// indicare solo per numero, fra quelli che la pagina ha. L'editor la riapplica
// ai blocchi com'erano in quel momento (`applicaMosse`) passando dagli stessi
// controlli della scrittura sulla pagina (`scriviCampo`, `scriviParagrafo`,
// `azioneSuElemento`). Le mosse di una frase sono una modifica sola: un
// «Annulla» le toglie tutte.
//
// Senza dipendenze: lo importano la route, l'editor e la sonda.

import { campiDiTesto, scriviCampo, scriviParagrafo, azioneSuElemento, LISTE, AZIONI_ELEMENTO } from './editor-visuale'
import { testoPulito, cifreNote } from './ai-blocco'

export const FRASE_MIN = 3
export const FRASE_MAX = 500
export const MAX_MOSSE = 4
export const PAGINA_MAX = 300_000      // caratteri dei blocchi mandati dall'editor
const MAX_SEZIONI = 60
const CAMPI_PER_SEZIONE = 30
const TESTO_MAX = 2000
const TIPO_SEZIONE = 'sezione'

// Gli sfondi che si chiedono a parole. «Immagine» no: serve una foto, e la
// foto la sceglie una persona.
export const SFONDI = { default: 'come il resto della pagina', white: 'bianco', light: 'grigio chiaro', muted: 'grigio', dark: 'scuro', primary: 'il colore del sito', gradient: 'sfumato' }
const DOVE = ['su', 'giu', 'in_cima', 'in_fondo', 'prima_di', 'dopo_di']

// L'AI a volte scrive «3» fra virgolette.
const numero = v => typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,3}$/.test(v.trim()) ? Number(v) : NaN

// ── La pagina come la legge l'AI ─────────────────────────────────────────────
// Sezioni numerate da 1 e, per ognuna, i testi che si possono scrivere, ognuno
// con una chiave «n.k». Gli id e i percorsi veri restano nella `mappa`:
// all'AI non servono, e così una mossa può nominare solo ciò che c'è.
// `blocchi` arriva dall'editor: { id, type, etichetta, data, style?, nome? }.
export function riassuntoPagina(blocchi) {
  const sezioni = [], campi = {}, righe = []
  for (const b of (Array.isArray(blocchi) ? blocchi : []).slice(0, MAX_SEZIONI)) {
    if (!b || typeof b.id !== 'string' || !b.id || b.id.length > 80 || typeof b.type !== 'string') continue
    const n = sezioni.length + 1
    const condivisa = b.type === TIPO_SEZIONE
    sezioni.push({ id: b.id, condivisa })
    const riga = { n, sezione: testoPulito(b.etichetta || b.type, 40) || b.type.slice(0, 40) }
    if (condivisa) riga.nota = `sezione condivisa «${testoPulito(b.nome, 60)}»: è uguale su più pagine e i suoi testi non si cambiano da qui`
    else {
      const dati = b.data && typeof b.data === 'object' && !Array.isArray(b.data) ? b.data : {}
      const testi = {}
      campiDiTesto(dati).slice(0, CAMPI_PER_SEZIONE).forEach((c, k) => {
        const chiave = `${n}.${k + 1}`
        campi[chiave] = { id: b.id, percorso: c.percorso, ricco: !!c.ricco, valore: c.valore }
        // Dentro un elenco si dice di quale elemento è: «la seconda domanda» = [2].
        const el = LISTE.includes(c.percorso[0]) && Number.isInteger(c.percorso[1]) ? `[${c.percorso[1] + 1}] ` : ''
        testi[chiave] = el + testoPulito(c.valore, 160)
      })
      if (Object.keys(testi).length) riga.testi = testi
      const elenchi = LISTE.filter(l => Array.isArray(dati[l]) && dati[l].length).map(l => `${l}: ${dati[l].length}`)
      if (elenchi.length) riga.elenchi = elenchi
      if (typeof b.style?.bg === 'string' && Object.hasOwn(SFONDI, b.style.bg)) riga.sfondo = b.style.bg
    }
    righe.push(riga)
  }
  return { righe, mappa: { sezioni, campi } }
}

export function promptInterprete({ righe, frase, entity }) {
  return `Sei l'interprete dell'editor di un sito. Il titolare ti dice a parole cosa cambiare nella pagina che ha davanti, e tu lo traduci in MOSSE di questo elenco chiuso. Non scrivi codice né HTML.

LE MOSSE
{"fai":"scrivi","campo":"3.2","testo":"…"} — mette un testo al posto di uno che c'è già (le chiavi dei campi sono nella pagina qui sotto)
{"fai":"sposta","sezione":3,"dove":"su|giu|in_cima|in_fondo|prima_di|dopo_di","rispetto":5} — "rispetto" solo con prima_di e dopo_di
{"fai":"elimina","sezione":3}
{"fai":"duplica","sezione":3}
{"fai":"sfondo","sezione":3,"sfondo":"${Object.keys(SFONDI).join('|')}"} — ${Object.entries(SFONDI).map(([k, v]) => `${k} = ${v}`).join(', ')}
{"fai":"elemento","sezione":3,"elenco":"items|slides|images","numero":2,"azione":"duplica|elimina|prima|dopo"} — un elemento di un elenco (una domanda, una scheda, una foto); "numero" parte da 1; "prima"/"dopo" lo spostano di un posto
{"fai":"riscrivi","sezione":3,"istruzione":"più corto"} — riscrive i testi di una sezione (più corto, più caldo, più formale, più semplice, correggi gli errori, aggiungi un fatto che il titolare detta)
{"fai":"aggiungi","prima_di":4,"richiesta":"…"} — una sezione nuova; "prima_di" = numero della sezione che starà sotto, null = in fondo; "richiesta" = cosa deve contenere, con le parole del titolare
{"fai":"apri","sezione":3} — apre la scheda di una sezione, per ciò che da qui non si fa

REGOLE
- Al massimo ${MAX_MOSSE} mosse, nell'ordine in cui vanno fatte; al massimo una "riscrivi" e una "aggiungi".
- I numeri delle sezioni sono sempre quelli della pagina com'è ADESSO, anche se nella stessa frase chiedi di spostarne una.
- Con "scrivi" metti il testo che il titolare detta, com'è detto (sistemando solo maiuscole e punteggiatura). Se chiede di migliorare, accorciare o cambiare tono senza dettare il testo, usa "riscrivi".
- NON INVENTARE FATTI: prezzi, numeri, orari, nomi, indirizzi che il titolare non ha detto e che non stanno già nella pagina.
- Da qui non si fanno: foto, link e destinazioni dei pulsanti, colori e caratteri del sito, salvare, pubblicare. Per la foto o il link di una sezione usa "apri" su quella sezione; per il resto nessuna mossa.
- Una sezione condivisa si sposta, si toglie o si copia; i suoi testi no.
- Se la frase non è chiara o non riguarda questa pagina, nessuna mossa.
- "risposta": una frase breve, dando del tu. Se fai mosse, cosa hai fatto; se non ne fai, perché, e un esempio di cosa si può chiedere.

L'ATTIVITÀ: ${testoPulito(entity?.name, 120) || '(senza nome)'}

LA PAGINA ADESSO
(nei testi, un [2] all'inizio vuol dire «secondo elemento del suo elenco» e non fa parte del testo)
${JSON.stringify(righe)}

LA FRASE DEL TITOLARE
"""
${frase}
"""

Rispondi ESCLUSIVAMENTE con JSON valido, senza testo prima o dopo:
{"mosse":[...],"risposta":"…"}`
}

// ── La risposta dell'AI, ricostruita da zero ─────────────────────────────────
// Ogni mossa diventa id e percorsi veri, presi dalla `mappa`; quello che non
// torna si scarta. `frase` serve al controllo dei fatti: una cifra scritta
// dall'AI deve stare nella frase o già nella pagina.
export function ripulisciMosse(risposta, mappa, frase) {
  const grezze = Array.isArray(risposta?.mosse) ? risposta.mosse.slice(0, 8) : []
  const sezione = v => { const n = numero(v); return Number.isInteger(n) && n >= 1 && n <= mappa.sezioni.length ? mappa.sezioni[n - 1] : null }
  const noti = `${frase}\n${Object.values(mappa.campi).map(c => c.valore).join('\n')}`
  const mosse = [], note = new Set()
  let riscrivi = 0, aggiungi = 0
  for (const m of grezze) {
    if (mosse.length >= MAX_MOSSE) break
    if (!m || typeof m !== 'object' || Array.isArray(m)) continue
    const s = sezione(m.sezione)
    if (m.fai === 'scrivi') {
      const c = typeof m.campo === 'string' && Object.hasOwn(mappa.campi, m.campo) ? mappa.campi[m.campo] : null
      const testo = testoPulito(m.testo, TESTO_MAX)
      if (!c || !testo || testo === c.valore) continue
      if (!cifreNote(testo, noti)) { note.add('Un numero che non mi hai detto non l\'ho scritto.'); continue }
      mosse.push({ fai: 'scrivi', id: c.id, percorso: c.percorso, ricco: c.ricco, testo })
    } else if (m.fai === 'sposta') {
      if (!s || !DOVE.includes(m.dove)) continue
      const rispetto = m.dove === 'prima_di' || m.dove === 'dopo_di' ? sezione(m.rispetto) : null
      if ((m.dove === 'prima_di' || m.dove === 'dopo_di') && (!rispetto || rispetto.id === s.id)) continue
      mosse.push({ fai: 'sposta', id: s.id, dove: m.dove, rispetto: rispetto?.id || null })
    } else if (m.fai === 'elimina' || m.fai === 'duplica' || m.fai === 'apri') {
      if (s) mosse.push({ fai: m.fai, id: s.id })
    } else if (m.fai === 'sfondo') {
      if (s && !s.condivisa && typeof m.sfondo === 'string' && Object.hasOwn(SFONDI, m.sfondo)) mosse.push({ fai: 'sfondo', id: s.id, sfondo: m.sfondo })
    } else if (m.fai === 'elemento') {
      const elenco = m.elenco === undefined ? 'items' : m.elenco
      const n = numero(m.numero)
      if (s && !s.condivisa && LISTE.includes(elenco) && AZIONI_ELEMENTO.includes(m.azione) && Number.isInteger(n) && n >= 1 && n <= 200)
        mosse.push({ fai: 'elemento', id: s.id, elenco, indice: n - 1, azione: m.azione })
    } else if (m.fai === 'riscrivi') {
      const istruzione = testoPulito(m.istruzione, 300)
      if (s && !s.condivisa && !riscrivi && istruzione.length >= 3) { riscrivi++; mosse.push({ fai: 'riscrivi', id: s.id, istruzione }) }
    } else if (m.fai === 'aggiungi') {
      const richiesta = testoPulito(m.richiesta, 800)
      const inFondo = m.prima_di === null || m.prima_di === undefined
      const prima = inFondo ? null : sezione(m.prima_di)
      if (!aggiungi && richiesta.length >= 3 && (inFondo || prima)) { aggiungi++; mosse.push({ fai: 'aggiungi', prima: prima?.id || null, richiesta }) }
    }
  }
  return { mosse, note: [...note] }
}

// ── Le mosse applicate ai blocchi ────────────────────────────────────────────
// Sui blocchi di ADESSO: una sezione che nel frattempo non c'è più si salta.
// Restituisce i blocchi nuovi, cosa è stato fatto (in parole), le mosse che
// chiedono di nuovo l'AI (riscrivi, aggiungi: le fa l'editor dopo) e la
// sezione da aprire.
export function applicaMosse(blocchi, mosse, { nuovoId, etichetta = t => t } = {}) {
  let lista = Array.isArray(blocchi) ? [...blocchi] : []
  const fatte = [], dopo = []
  let apri = null, saltate = 0, cambiato = false
  const nome = b => `«${etichetta(b.type)}»`
  const copia = src => {
    const data = JSON.parse(JSON.stringify(src.data || {}))
    if (Array.isArray(data.items)) data.items = data.items.map(it => it && typeof it === 'object' ? { ...it, id: nuovoId() } : it)
    if (Array.isArray(data.slides)) data.slides = data.slides.map(it => it && typeof it === 'object' ? { ...it, id: nuovoId() } : it)
    return { ...JSON.parse(JSON.stringify(src)), id: nuovoId(), data }
  }
  for (const m of Array.isArray(mosse) ? mosse : []) {
    if (!m || typeof m !== 'object') continue
    if (m.fai === 'aggiungi') { if (m.prima === null || lista.some(x => x.id === m.prima)) dopo.push(m); else saltate++; continue }
    const i = lista.findIndex(x => x.id === m.id)
    if (i < 0) { saltate++; continue }
    const b = lista[i]
    if (m.fai === 'riscrivi') { dopo.push(m); continue }
    if (m.fai === 'apri') { apri = b.id; continue }
    if (m.fai === 'elimina') {
      lista.splice(i, 1); fatte.push(`ho tolto ${nome(b)}`)
    } else if (m.fai === 'duplica') {
      lista.splice(i + 1, 0, copia(b)); fatte.push(`ho copiato ${nome(b)}`)
    } else if (m.fai === 'sposta') {
      const resto = lista.filter(x => x.id !== b.id)
      let j
      if (m.dove === 'su') j = Math.max(0, i - 1)
      else if (m.dove === 'giu') j = Math.min(resto.length, i + 1)
      else if (m.dove === 'in_cima') j = 0
      else if (m.dove === 'in_fondo') j = resto.length
      else {
        const k = resto.findIndex(x => x.id === m.rispetto)
        if (k < 0) { saltate++; continue }
        j = m.dove === 'prima_di' ? k : k + 1
      }
      resto.splice(j, 0, b)
      if (resto.every((x, k) => x.id === lista[k].id)) continue
      lista = resto; fatte.push(`ho spostato ${nome(b)}`)
    } else if (m.fai === 'sfondo') {
      if (b.type === TIPO_SEZIONE || !Object.hasOwn(SFONDI, m.sfondo)) { saltate++; continue }
      if ((b.style?.bg || 'default') === m.sfondo) continue
      lista[i] = { ...b, style: { ...(b.style || {}), bg: m.sfondo } }; fatte.push(`ho messo lo sfondo ${SFONDI[m.sfondo]} a ${nome(b)}`)
    } else if (m.fai === 'scrivi') {
      if (b.type === TIPO_SEZIONE || typeof m.testo !== 'string') { saltate++; continue }
      const dati = m.ricco
        ? scriviParagrafo(b.data, m.percorso, m.testo.split('\n').flatMap((riga, k) => [...(k ? [{ type: 'hardBreak' }] : []), ...(riga ? [{ type: 'text', text: riga }] : [])]))
        : scriviCampo(b.data, m.percorso, m.testo)
      if (!dati) { saltate++; continue }
      lista[i] = { ...b, data: dati }; fatte.push(`ho scritto il testo nuovo in ${nome(b)}`)
    } else if (m.fai === 'elemento') {
      if (b.type === TIPO_SEZIONE) { saltate++; continue }
      const dati = azioneSuElemento(b.data, m.elenco, m.indice, m.azione, nuovoId)
      if (!dati) { saltate++; continue }
      lista[i] = { ...b, data: dati }
      fatte.push({ duplica: `ho copiato un elemento di ${nome(b)}`, elimina: `ho tolto un elemento da ${nome(b)}`, prima: `ho spostato un elemento di ${nome(b)}`, dopo: `ho spostato un elemento di ${nome(b)}` }[m.azione])
    } else continue
    cambiato = true
  }
  return { blocchi: lista, cambiato, fatte, dopo, apri, saltate }
}
