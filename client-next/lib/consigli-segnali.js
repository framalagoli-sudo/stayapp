// I segnali dei consigli personali: QUANDO un consiglio scatta, misurato sui
// numeri di un cliente. Nessuna dipendenza: lo leggono la regia (browser) e il
// server.
//
// È un catalogo CHIUSO di proposito. La regia sceglie il segnale e ne regola le
// soglie; la regola sui dati resta codice provato. Una condizione scritta a
// mano dal pannello sarebbe la strada per un errore che legge i dati di tutti.
//
// Ogni segnale riceve i «fatti» di un'azienda (calcolati in lib/consigli.js) e
// i suoi parametri; restituisce null, oppure i valori per i segnaposti del
// titolo ({persone}, {evento}…).
import { AZIONI } from './club-regole'

const GIORNO = 864e5
const giorniA = (iso, adesso) => Math.ceil((new Date(iso).getTime() - adesso) / GIORNO)
const giorniDa = (iso, adesso) => Math.floor((adesso - new Date(iso).getTime()) / GIORNO)

export const SEGNALI = {
  evento_quasi_pieno: {
    nome: 'Evento quasi pieno',
    descrizione: 'Il prossimo evento con posti contati è vicino e quasi esaurito.',
    parametri: [
      { chiave: 'percentuale', nome: 'Pieno almeno al (%)', predefinito: 85, min: 50, max: 99 },
      { chiave: 'entro_giorni', nome: 'Entro (giorni)', predefinito: 14, min: 1, max: 60 },
    ],
    segnaposti: ['evento', 'prenotati', 'capienza', 'posti_liberi', 'giorni_mancanti'],
    scatta: (f, p, adesso) => {
      const ev = f.prossimo
      if (!ev?.capienza || giorniA(ev.quando, adesso) > p.entro_giorni) return null
      const pieno = ev.prenotati / ev.capienza * 100
      if (pieno < p.percentuale || pieno >= 100) return null
      return valoriEvento(ev, adesso)
    },
  },
  evento_poco_prenotato: {
    nome: 'Evento poco prenotato',
    descrizione: 'Il prossimo evento è vicino e ha ancora molti posti liberi, e ci sono persone a cui scrivere.',
    parametri: [
      { chiave: 'percentuale', nome: 'Pieno meno del (%)', predefinito: 30, min: 5, max: 90 },
      { chiave: 'entro_giorni', nome: 'Entro (giorni)', predefinito: 7, min: 1, max: 30 },
      { chiave: 'min_persone', nome: 'Persone a cui si può scrivere, almeno', predefinito: 5, min: 0, max: 100000 },
    ],
    segnaposti: ['evento', 'prenotati', 'capienza', 'posti_liberi', 'giorni_mancanti', 'persone'],
    scatta: (f, p, adesso) => {
      const ev = f.prossimo
      if (!ev?.capienza || giorniA(ev.quando, adesso) > p.entro_giorni) return null
      if (ev.prenotati / ev.capienza * 100 >= p.percentuale || f.invitabili < p.min_persone) return null
      return { ...valoriEvento(ev, adesso), persone: f.invitabili }
    },
  },
  iscritti_senza_newsletter: {
    nome: 'Iscritti a cui non si scrive',
    descrizione: 'Ci sono persone che hanno detto sì alle promozioni, e da tempo (o mai) non ricevono una newsletter.',
    parametri: [
      { chiave: 'min_persone', nome: 'Persone iscritte, almeno', predefinito: 10, min: 1, max: 100000 },
      { chiave: 'giorni', nome: 'Giorni senza newsletter, almeno', predefinito: 45, min: 7, max: 365 },
    ],
    segnaposti: ['persone', 'da_quando'],
    scatta: (f, p, adesso) => {
      if (f.invitabili < p.min_persone) return null
      if (f.ultimaNewsletter && giorniDa(f.ultimaNewsletter, adesso) < p.giorni) return null
      return { persone: f.invitabili, da_quando: f.ultimaNewsletter ? `da ${giorniDa(f.ultimaNewsletter, adesso)} giorni` : 'mai' }
    },
  },
  calendario_vuoto: {
    nome: 'Calendario vuoto',
    descrizione: 'Chi fa eventi (negli ultimi sei mesi) non ne ha nessuno in programma.',
    parametri: [
      { chiave: 'min_passati', nome: 'Eventi fatti negli ultimi 6 mesi, almeno', predefinito: 2, min: 1, max: 100 },
    ],
    segnaposti: ['eventi_passati'],
    scatta: (f, p) => (f.eventiPassati >= p.min_passati && f.eventiFuturi === 0) ? { eventi_passati: f.eventiPassati } : null,
  },
  visite_in_calo: {
    nome: 'Visite in calo',
    descrizione: 'Le visite ai siti degli ultimi 7 giorni sono calate rispetto ai 7 prima.',
    parametri: [
      { chiave: 'calo', nome: 'Calo almeno del (%)', predefinito: 30, min: 10, max: 90 },
      { chiave: 'min_visite', nome: 'Visite nei 7 giorni prima, almeno', predefinito: 20, min: 5, max: 1000000 },
    ],
    segnaposti: ['visite', 'visite_prima', 'calo'],
    scatta: (f, p) => {
      if (f.visitePrima < p.min_visite) return null
      const calo = Math.round((1 - f.visiteOra / f.visitePrima) * 100)
      return calo >= p.calo ? { visite: f.visiteOra, visite_prima: f.visitePrima, calo: `${calo}%` } : null
    },
  },
  nessun_contatto_nuovo: {
    nome: 'Nessun contatto nuovo',
    descrizione: 'Chi raccoglieva contatti non ne riceve uno nuovo da tempo.',
    parametri: [
      { chiave: 'giorni', nome: 'Giorni senza contatti nuovi, almeno', predefinito: 30, min: 7, max: 365 },
      { chiave: 'min_contatti', nome: 'Contatti raccolti in tutto, almeno', predefinito: 5, min: 1, max: 100000 },
    ],
    segnaposti: ['giorni', 'contatti'],
    scatta: (f, p, adesso) => {
      if (f.contattiTotali < p.min_contatti || !f.ultimoContatto) return null
      const giorni = giorniDa(f.ultimoContatto, adesso)
      return giorni >= p.giorni ? { giorni, contatti: f.contattiTotali } : null
    },
  },
}

function valoriEvento(ev, adesso) {
  return {
    evento: ev.titolo, prenotati: ev.prenotati, capienza: ev.capienza,
    posti_liberi: Math.max(0, ev.capienza - ev.prenotati), giorni_mancanti: Math.max(0, giorniA(ev.quando, adesso)),
    evento_id: ev.id,
  }
}

// I pulsanti: quelli del Club, più «l'evento» che porta proprio a quello di
// cui parla il consiglio, quando il segnale ne nomina uno.
export const AZIONI_CONSIGLIO = { ...AZIONI, evento: { testo: 'Apri l’evento', link: '/admin/eventi' } }

export function azioneConsiglio(chiave, valori = {}) {
  const a = chiave && AZIONI_CONSIGLIO[chiave]
  if (!a) return null
  const link = chiave === 'evento' && valori.evento_id ? `/admin/eventi/${valori.evento_id}` : a.link
  return { testo: a.testo, link }
}

// Le soglie dentro i limiti del segnale: un valore fuori misura o non numerico
// torna al predefinito.
export function parametriPuliti(segnale, parametri = {}) {
  const s = SEGNALI[segnale]
  const out = {}
  for (const d of s?.parametri || []) {
    const v = Number(parametri?.[d.chiave])
    out[d.chiave] = Number.isFinite(v) ? Math.min(d.max, Math.max(d.min, Math.round(v))) : d.predefinito
  }
  return out
}

const SEGNAPOSTO = /\{([a-z_]+)\}/g

// I segnaposti scritti nel titolo che il segnale non conosce.
export const segnapostiIgnoti = (segnale, testo) =>
  [...String(testo || '').matchAll(SEGNAPOSTO)].map(m => m[1]).filter(k => !SEGNALI[segnale]?.segnaposti.includes(k))

export const componi = (testo, valori) =>
  String(testo || '').replace(SEGNAPOSTO, (m, k) => (k in valori ? String(valori[k]) : m))

const MESTIERE = /^[a-z0-9_]{2,40}$/

// Quello che manda la regia, ricostruito campo per campo.
export function consiglioPulito(body = {}) {
  const segnale = String(body.segnale || '')
  if (!SEGNALI[segnale]) return { errore: 'Segnale non valido' }
  const titolo = String(body.titolo || '').trim().slice(0, 200)
  if (!titolo) return { errore: 'Il titolo è obbligatorio' }
  const ignoti = segnapostiIgnoti(segnale, titolo).concat(segnapostiIgnoti(segnale, body.perche))
  if (ignoti.length) return { errore: `Questo segnale non conosce: ${[...new Set(ignoti)].map(k => `{${k}}`).join(', ')}` }
  let mestieri = null
  if (Array.isArray(body.mestieri) && body.mestieri.length) {
    mestieri = [...new Set(body.mestieri.map(String))].filter(m => MESTIERE.test(m)).slice(0, 20)
    if (!mestieri.length) mestieri = null
  }
  const ordine = Number.isFinite(Number(body.ordine)) ? Math.min(1000, Math.max(0, Math.round(Number(body.ordine)))) : 100
  return {
    consiglio: {
      segnale, parametri: parametriPuliti(segnale, body.parametri), mestieri, titolo,
      perche: String(body.perche || '').trim().slice(0, 2000),
      azione: AZIONI_CONSIGLIO[body.azione] ? body.azione : null,
      stato: body.stato === 'attivo' ? 'attivo' : 'bozza',
      ordine,
    },
  }
}
