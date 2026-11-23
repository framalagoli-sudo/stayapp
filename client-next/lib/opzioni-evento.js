// Le opzioni di un evento: più proposte nella stessa serata, ognuna coi suoi
// posti, il suo prezzo e la sua quota da pagare prenotando (migration 148).
//
// Garage 22 è un locale ibrido: i tavoli della cena e il bancone del bar sono
// due spazi diversi. «Cena & spettacolo · 30 € · 40 posti» e «Ingresso + drink
// · 15 € · 30 posti» non pescano da una sala comune: il totale dell'evento è la
// SOMMA delle opzioni, calcolata, mai scritta a mano. In una prenotazione si
// prendono quantità di più opzioni insieme (1 cena + 2 ingressi).
//
// È l'unico posto delle regole: la usano editor, route del pannello, route
// pubbliche, pagina dell'evento, app del QR, lista d'attesa, email e cassa.
// Due risposte diverse a «quanto costa» o «c'è posto» sarebbero una cifra letta
// e un'altra addebitata, o un posto venduto due volte.
//
// Le opzioni stanno in `eventi.packages` (il nome storico del campo).
// Un evento senza opzioni funziona esattamente come prima: prezzo e posti
// dell'evento. Nessuna di queste funzioni cambia qualcosa in quel caso.
//
// ⚠️ Nessuna dipendenza tranne `gruppi-prenotazioni-evento` (anch'essa senza):
// lo importano componenti che girano nel browser.
import { occupaPosto } from './gruppi-prenotazioni-evento.js'

export const MAX_OPZIONI = 12
export const MAX_QUANTITA = 200

// Cosa può comprendere un'opzione: un catalogo chiuso (le «pastiglie»
// dell'editor). Un valore estraneo si scarta.
export const COMPRENDE_OPZIONE = ['cena', 'pranzo', 'colazione', 'drink', 'notte', 'trasporto', 'ingresso']

const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/
const testo = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const intero = (v, min, max) => {
  if (v === '' || v == null) return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, Math.round(n)))
}
const cifra = v => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.min(100000, Math.round(n * 100) / 100) : 0
}
const arrotonda = n => Math.round((Number(n) || 0) * 100) / 100

// ── Le opzioni come le salva il titolare ────────────────────────────────────
//
// Quello che arriva dal pannello passa da qui prima di finire nel database (e
// poi sulla pagina pubblica): solo i campi previsti, lunghezze e numeri dentro
// i limiti. Prima di questa funzione `packages` si salvava così com'era.
//
//   posti        null = senza limite · intero ≥ 1
//   riservati    tenuti per il telefono (non vendibili online), mai oltre i posti
//   acconto      0–100 = quanto si paga prenotando · null = quello dell'evento
export function opzioniPulite(lista) {
  if (!Array.isArray(lista)) return []
  const visti = new Set()
  const fuori = []
  for (const o of lista.slice(0, MAX_OPZIONI)) {
    if (!o || typeof o !== 'object') continue
    let id = typeof o.id === 'string' && ID_VALIDO.test(o.id) ? o.id : null
    if (!id || visti.has(id)) id = nuovoId(visti)
    visti.add(id)
    const name = testo(o.name, 80)
    if (!name) continue // un'opzione senza nome non si può scegliere
    const posti = intero(o.posti, 1, 100000)
    const riservati = posti == null ? 0 : (intero(o.posti_riservati, 0, posti) ?? 0)
    fuori.push({
      id, name,
      description: testo(o.description, 300),
      price: cifra(o.price),
      includes: Array.isArray(o.includes) ? [...new Set(o.includes.filter(k => COMPRENDE_OPZIONE.includes(k)))] : [],
      posti,
      posti_riservati: riservati,
      acconto_percentuale: intero(o.acconto_percentuale, 0, 100),
    })
  }
  return fuori
}

function nuovoId(visti) {
  let id
  do { id = 'op_' + Math.random().toString(36).slice(2, 10) } while (visti.has(id))
  return id
}

export function haOpzioni(evento) {
  return Array.isArray(evento?.packages) && evento.packages.length > 0
}

// I numeri dell'evento che con le opzioni si CALCOLANO: posti (somma, o senza
// limite se anche una sola opzione non ne ha), posti per il telefono (somma),
// prezzo (il più basso: è il «da 15 €» delle schede). Si scrivono sull'evento
// a ogni salvataggio, così tutto ciò che legge i posti dell'evento — schede,
// avvisi di soglia, «esaurito» — continua a dire il vero senza saperne niente.
export function derivatiDaOpzioni(opzioni) {
  if (!opzioni?.length) return null
  const tutteLimitate = opzioni.every(o => o.posti)
  return {
    seats_total: tutteLimitate ? opzioni.reduce((s, o) => s + o.posti, 0) : 0,
    posti_riservati: tutteLimitate ? opzioni.reduce((s, o) => s + (o.posti_riservati || 0), 0) : 0,
    price: Math.min(...opzioni.map(o => Number(o.price) || 0)),
  }
}

// ── Le prenotazioni ─────────────────────────────────────────────────────────

// Cosa ha prenotato una riga, opzione per opzione. Le righe di prima (o di un
// evento senza opzioni) non hanno `scelte`: se avevano un pacchetto, vale quello.
export function scelteDi(b) {
  if (Array.isArray(b?.scelte) && b.scelte.length) return b.scelte
  if (b?.package_id) return [{ id: b.package_id, quantita: b.seats || 1 }]
  return []
}

// Quanti posti occupa ogni opzione: { id: n }. Conta solo chi occupa davvero
// un posto (`occupaPosto`: la stessa regola dei posti dell'evento).
export function occupatiPerOpzione(prenotazioni, ora = Date.now()) {
  const conti = {}
  for (const b of prenotazioni || []) {
    if (!occupaPosto(b, ora)) continue
    for (const s of scelteDi(b)) conti[s.id] = (conti[s.id] || 0) + (Number(s.quantita) || 0)
  }
  return conti
}

// I posti di un'opzione, con le stesse parole di `postiEvento`:
//   liberiOnline → quanti il sito può ancora vendere (al netto dei riservati)
//   liberi       → quanti restano davvero (per il titolare)
export function postiOpzione(opzione, occupati = 0) {
  const prenotati = Math.max(0, Number(occupati) || 0)
  if (!opzione?.posti) return { illimitato: true, capienza: 0, riservati: 0, prenotati, liberi: null, liberiOnline: null, limiteOnline: null }
  const capienza = opzione.posti
  const riservati = Math.min(Math.max(Number(opzione.posti_riservati) || 0, 0), capienza)
  return {
    illimitato: false, capienza, riservati, prenotati,
    liberi: Math.max(0, capienza - prenotati),
    liberiOnline: Math.max(0, capienza - riservati - prenotati),
    limiteOnline: capienza - riservati,
  }
}

// Cosa chiede chi prenota, controllato sul listino dell'evento. Dal browser
// arrivano solo `[{ id, quantita }]`: nome, prezzo e quota si rileggono qui.
// Restituisce { scelte, posti } oppure { errore }.
export function leggiScelte(evento, richiesta) {
  const catalogo = evento?.packages || []
  if (!Array.isArray(richiesta)) return { errore: 'Scegli almeno un posto.' }
  const quantita = {}
  for (const r of richiesta.slice(0, MAX_OPZIONI * 2)) {
    if (!r || typeof r.id !== 'string') return { errore: 'Scelta non valida.' }
    const q = Number(r.quantita)
    if (!Number.isInteger(q) || q < 0 || q > MAX_QUANTITA) return { errore: 'Quantità non valida.' }
    if (!catalogo.some(o => o.id === r.id)) return { errore: 'Questa proposta non c’è più: ricarica la pagina.' }
    quantita[r.id] = (quantita[r.id] || 0) + q
  }
  const scelte = catalogo
    .filter(o => quantita[o.id] > 0)
    .map(o => ({
      id: o.id, nome: o.name, prezzo: Number(o.price) || 0, quantita: quantita[o.id],
      // La quota si fotografa adesso: è quella che la persona ha letto.
      acconto: o.acconto_percentuale ?? Math.min(100, Math.max(0, parseInt(evento.acconto_percentuale) || 0)),
    }))
  const posti = scelte.reduce((s, x) => s + x.quantita, 0)
  if (!posti) return { errore: 'Scegli almeno un posto.' }
  if (posti > MAX_QUANTITA) return { errore: 'Troppi posti in una prenotazione sola.' }
  return { scelte, posti }
}

// Quanto costa e quanto si paga adesso, opzione per opzione. Ogni opzione ha la
// sua quota (0 = sul posto, 100 = tutto subito): il dovuto è la somma.
// `righe` sono le voci della cassa di Stripe: una per opzione da pagare.
export function contoScelte(scelte) {
  let totale = 0, dovuto = 0
  const righe = []
  for (const s of scelte || []) {
    const q = Number(s.quantita) || 0
    const prezzo = Number(s.prezzo) || 0
    totale += prezzo * q
    const perc = Math.min(100, Math.max(0, parseInt(s.acconto) || 0))
    if (perc <= 0 || prezzo <= 0) continue
    // Si arrotonda la quota di UN posto, poi si moltiplica: è il prezzo
    // unitario che Stripe mostra, e la somma torna al centesimo.
    const unitario = Math.round(prezzo * perc) / 100
    dovuto += unitario * q
    righe.push({ id: s.id, nome: perc >= 100 ? s.nome : `${s.nome} — acconto ${perc}%`, importo: unitario, quantita: q })
  }
  totale = arrotonda(totale); dovuto = arrotonda(dovuto)
  return {
    totale,
    conto: {
      dovuto, saldo: arrotonda(totale - dovuto),
      // «Tutto subito» solo se non resta niente da pagare sul posto.
      tutto: dovuto > 0 && dovuto >= totale,
      perc: totale > 0 ? Math.round((dovuto / totale) * 100) : 0,
    },
    righe,
  }
}

// Perché queste scelte non si possono accettare, o null. `canale` = 'online'
// (il sito: al netto dei posti per il telefono) o 'titolare' (il pannello: i
// posti per il telefono sono suoi). `escludi` = una prenotazione da non
// contare (quella che si sta modificando).
export function rifiutoScelte(evento, scelte, occupati, { canale = 'online' } = {}) {
  const catalogo = evento?.packages || []
  for (const s of scelte) {
    const o = catalogo.find(x => x.id === s.id)
    const p = postiOpzione(o, occupati[s.id])
    if (p.illimitato) continue
    const liberi = canale === 'titolare' ? p.liberi : p.liberiOnline
    if (s.quantita > liberi) {
      return {
        error: liberi === 0
          ? `«${o.name}» è esaurita.`
          : `Per «${o.name}» restano ${liberi} ${liberi === 1 ? 'posto' : 'posti'} e ne hai chiesti ${s.quantita}.`,
        opzione: o.id, posti_liberi: liberi,
      }
    }
  }
  return null
}

// Una riga da leggere: «1 × Cena & spettacolo · 2 × Ingresso + drink».
export function riassuntoScelte(scelte) {
  return (scelte || []).map(s => `${s.quantita} × ${s.nome || 'Opzione'}`).join(' · ')
}

// ── Quello che vede il pubblico ─────────────────────────────────────────────
//
// Di ogni opzione: nome, descrizione, prezzo, cosa comprende e quanti posti si
// possono ancora prenotare online (`posti_online`, null = senza limite).
// ⛔ Mai capienza, prenotati e posti tenuti per il telefono: con due di loro e i
// posti online il terzo si ricava (vedi `postiPubblici`). Mai la quota: la
// cifra da pagare la calcola il server nel riepilogo.
export function opzioniPubbliche(evento) {
  const occupati = evento?.opzioni_prenotate || {}
  return (evento?.packages || []).map(o => {
    const p = postiOpzione(o, occupati[o.id])
    return {
      id: o.id, name: o.name, description: o.description || '', price: Number(o.price) || 0,
      includes: Array.isArray(o.includes) ? o.includes : [],
      posti_online: p.illimitato ? null : p.liberiOnline,
    }
  })
}
