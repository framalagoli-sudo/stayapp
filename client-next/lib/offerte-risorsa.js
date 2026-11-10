// Le offerte su una risorsa prenotabile: quando valgono e quanto fanno pagare.
//
// ⚠️ Nessun import, come `booking-giornaliero`: questo file lo legge anche il
// browser, e il prezzo che si vede nel widget deve uscire dalla stessa funzione
// che calcola quello che si paga. Due copie divergono, e diverge proprio quella
// che si legge di rado.
//
// ⛔ Perché esiste: il prezzo speciale veniva applicato **solo** agli slot
// orari. Su una risorsa a giornate — il Furgone di Automax — l'offerta si
// compilava, si salvava, e non succedeva niente: né nel prezzo, né sul
// calendario. E nella route di prenotazione bastava mandare l'id di
// un'offerta qualunque per ottenerne il prezzo, senza che nessuno controllasse
// che fosse di quella risorsa e di quelle date.

import { notti, unitaDaPagare, contaGiorni } from './booking-giornaliero'

// Un'offerta vale per questo periodo?
//
// Ogni condizione vuota è «sempre»: chi non mette le date fa un'offerta che
// vale tutto l'anno, chi non mette il minimo non chiede una durata. Sono
// facoltative apposta — pretenderle tutte trasformerebbe un'offerta di tre
// campi in un modulo.
// I tre modi di un'offerta (migration 145). `prezzo` è quello di sempre e il
// predefinito: un'offerta salvata prima non ha la colonna e resta com'era.
export const TIPI_SCONTO = ['prezzo', 'percentuale', 'importo']
export const MODI_PREZZO = ['giorno', 'periodo']
export const tipoSconto = promo => TIPI_SCONTO.includes(promo?.sconto_tipo) ? promo.sconto_tipo : 'prezzo'

// Un pacchetto che si ripete: un prezzo per tutto il periodo che vale per una
// **forma** («ven→lun», «una settimana da sabato») invece che per date fisse.
export const ePacchetto = promo =>
  tipoSconto(promo) === 'prezzo' && promo?.prezzo_modo === 'periodo' && promo?.durata_esatta != null

// Quanti giorni mancano dall'oggi al giorno d'inizio (negativo se è passato).
function giorniTra(da, a) {
  return Math.round((new Date(`${a}T12:00:00`) - new Date(`${da}T12:00:00`)) / 86400000)
}

// Prenotazione anticipata e last minute: valgono secondo QUANDO si prenota.
//
// ⚠️ `oggi` arriva da chi chiama, calcolato nel fuso dell'azienda: «mancano 30
// giorni» deciso con l'ora del server (UTC) sbaglierebbe di un giorno dopo le
// 22 italiane, e lo sconto scomparirebbe o comparirebbe a cavallo della
// soglia. Senza `oggi` un'offerta con queste condizioni **non** vale: meglio
// non dare uno sconto che darne uno che non spettava.
function finestraDiPrenotazione(promo, dal, oggi) {
  const prima = promo?.prenota_prima_giorni, entro = promo?.prenota_entro_giorni
  if (prima == null && entro == null) return true
  if (!oggi) return false
  const mancano = giorniTra(oggi, dal)
  if (prima != null && mancano < Number(prima)) return false
  if (entro != null && mancano > Number(entro)) return false
  return true
}

export function offertaVale(promo, risorsa, dal, al, oggi = null) {
  if (!promo || promo.attiva === false) return false

  // ⛔ Il controllo che mancava del tutto: un'offerta appartiene alla SUA
  // risorsa. Senza, l'id di un'offerta di un'altra risorsa — o di un'altra
  // azienda — ne portava via il prezzo.
  if (risorsa?.id && promo.risorsa_id && promo.risorsa_id !== risorsa.id) return false

  if (!finestraDiPrenotazione(promo, dal, oggi)) return false

  // ⛔ Le date valgono in modo diverso a seconda di cosa è quel prezzo, e
  // confonderli è costato caro: il ponte dell'8 dicembre (5→9, €850 forfettari)
  // veniva applicato anche a chi prenotava DUE giorni là dentro, che pagava
  // €850 invece di €240. Tre volte e mezzo il dovuto.
  //
  //   · «per tutto il periodo» è il prezzo di QUEL soggiorno: un forfait si
  //     riferisce alle date per cui è stato pensato, quindi vale **solo** se
  //     coincidono. Prenotare metà ponte non è fare il ponte.
  //   · «per ogni giorno» è invece il listino di quel periodo — «a dicembre
  //     costa 150 al giorno» — e vale per qualsiasi tratto ci stia dentro.
  //   · un **pacchetto che si ripete** («ven→lun 300 €») è un forfait legato a
  //     una forma, non a date: vale per quella durata esatta, nei giorni
  //     d'inizio scelti (controllati sotto), e le date — se ci sono — dicono
  //     solo in che periodo dell'anno si vende.
  //   · gli **sconti** (percentuale, importo) si applicano al conto del
  //     calendario: le date sono la finestra in cui valgono, come il listino.
  if (ePacchetto(promo)) {
    if (notti(dal, al) !== Number(promo.durata_esatta)) return false
    if (promo.data_inizio && dal < promo.data_inizio) return false
    if (promo.data_fine && al > promo.data_fine) return false
  } else if (tipoSconto(promo) === 'prezzo' && promo.prezzo_modo === 'periodo') {
    // Un forfait senza date non si applicherebbe a niente di definito: costerebbe
    // uguale un giorno e tre settimane.
    if (!promo.data_inizio || !promo.data_fine) return false
    if (dal !== promo.data_inizio || al !== promo.data_fine) return false
  } else {
    if (promo.data_inizio && dal < promo.data_inizio) return false
    if (promo.data_fine && al > promo.data_fine) return false
  }

  // Quanto dura. `minimo_notti` è in notti come ogni altro limite del booking.
  if (promo.minimo_notti != null && notti(dal, al) < Number(promo.minimo_notti)) return false

  // I giorni della settimana, quando l'offerta li elenca: si guarda il giorno
  // in cui si comincia, che è quello che il cliente sceglie.
  if (Array.isArray(promo.giorni_settimana) && promo.giorni_settimana.length) {
    if (!promo.giorni_settimana.includes(new Date(`${dal}T12:00:00`).getDay())) return false
  }
  return true
}

// Quanto costa il periodo con questa offerta.
//
// ⚠️ `prezzo_modo` non è un dettaglio di forma: dice se quel numero è il prezzo
// di una giornata o il totale del soggiorno. Su cinque giorni le due letture
// differiscono di cinque volte, e prima la sceglieva il codice.
//
// Gli **sconti** partono dal conto del calendario (`totalePieno`, la somma
// giorno per giorno): «-15%» su un noleggio con il weekend a 150 € è il 15% di
// quel conto, non del prezzo base.
export function totaleConOfferta(risorsa, dal, al, promo, totalePieno = null) {
  const tipo = tipoSconto(promo)
  if (tipo !== 'prezzo') {
    const v = Number(promo?.sconto_valore)
    const pieno = Number(totalePieno)
    if (!Number.isFinite(v) || v <= 0 || !Number.isFinite(pieno)) return null
    const t = tipo === 'percentuale' ? pieno * (1 - Math.min(v, 100) / 100) : Math.max(0, pieno - v)
    return Math.round(t * 100) / 100
  }
  const unita = unitaDaPagare(dal, al, contaGiorni(risorsa))
  const speciale = Number(promo?.prezzo_speciale)
  if (promo?.prezzo_speciale == null || !Number.isFinite(speciale)) return null
  return promo.prezzo_modo === 'periodo' ? speciale : speciale * unita
}

// Come si scrive lo sconto accanto al nome: «-15%», «-€20». Un'offerta a
// prezzo non ha etichetta: parla il prezzo barrato.
export function etichettaSconto(promo) {
  const tipo = tipoSconto(promo), v = Number(promo?.sconto_valore)
  if (tipo === 'percentuale' && v > 0) return `-${String(v).replace('.', ',')}%`
  if (tipo === 'importo' && v > 0) return `-€${String(v).replace('.', ',')}`
  return null
}

// Fra più offerte valide vince **la più conveniente per chi prenota**.
//
// ⛔ Va scritto e non lasciato al caso: un cliente che scopre di aver pagato il
// prezzo peggiore fra due offerte entrambe valide non torna, e ha ragione. A
// parità di prezzo tiene la prima, così l'esito non dipende dall'ordine con cui
// il database restituisce le righe.
//
// Le offerte **non si sommano** (decisione di Francesco del 09/11): uno sconto
// sopra un altro è il modo più rapido per svendere senza accorgersene.
export function miglioreOfferta(promozioni, risorsa, dal, al, totalePieno = null, oggi = null) {
  if (!dal || !al) return null
  let vincente = null, minimo = Infinity
  for (const p of promozioni || []) {
    if (!offertaVale(p, risorsa, dal, al, oggi)) continue
    const t = totaleConOfferta(risorsa, dal, al, p, totalePieno)
    if (t == null) continue
    if (t < minimo) { minimo = t; vincente = p }
  }
  return vincente ? { offerta: vincente, totale: minimo } : null
}

// Il conto finale di un periodo: prezzo pieno, offerta applicata se conviene, e
// **entrambi i numeri**, perché «€850 anziché €600» si scrive solo se si sa
// anche quanto costava prima.
//
// ⚠️ Un'offerta che costa più del listino non si applica da sola. Il cliente la
// usa per l'alta stagione — il ponte del Furgone costa più di una settimana
// qualunque — e in quel caso la scelta è sua: si applica perché **vale per quel
// periodo**, non perché conviene. Il confronto serve solo a scegliere fra più
// offerte valide insieme.
export function contoDelPeriodo(risorsa, dal, al, promozioni, totalePieno, oggi = null) {
  const migliore = miglioreOfferta(promozioni, risorsa, dal, al, totalePieno, oggi)
  if (!migliore) return { totale: totalePieno, offerta: null, totalePieno }
  return {
    totale: migliore.totale,
    totalePieno,
    offerta: {
      id: migliore.offerta.id,
      nome: migliore.offerta.nome,
      badge: migliore.offerta.badge_label || 'Offerta',
      colore: migliore.offerta.colore || '#e53e3e',
      sconto: etichettaSconto(migliore.offerta),
    },
  }
}

// C'è un'offerta lì vicino che con altre date si prenderebbe?
//
// ⛔ Senza questo la correzione delle date esatte sarebbe peggio del difetto:
// il calendario colora i giorni del ponte, il visitatore ne sceglie due, non
// ottiene l'offerta e **non sa perché**. Un prezzo che cambia senza spiegazione
// sembra un errore del sito.
//
// Torna l'offerta più conveniente fra quelle che toccano il periodo scelto ma
// non si applicano, con le date che servirebbero e quanto costerebbe.
//
// ⚠️ Solo le offerte **a prezzo** con date (il ponte, un listino di periodo):
// quanto costerebbe uno sconto su altre date dipende dal calendario di quelle
// date, che qui non c'è. Un suggerimento mancato non fa danni; una cifra
// sbagliata sì. E non i pacchetti che si ripetono: non hanno «le» date.
export function offertaQuasi(promozioni, risorsa, dal, al, oggi = null) {
  if (!dal || !al) return null
  let migliore = null
  for (const p of promozioni || []) {
    if (p?.attiva === false) continue
    if (tipoSconto(p) !== 'prezzo' || ePacchetto(p)) continue
    if (offertaVale(p, risorsa, dal, al, oggi)) continue    // questa si applica già
    if (!p.data_inizio || !p.data_fine) continue            // non ha date da suggerire
    // Deve riguardare **queste** giornate, altrimenti si suggerirebbe a marzo
    // l'offerta di agosto.
    if (al < p.data_inizio || dal > p.data_fine) continue
    // Si suggerisce solo ciò che si potrebbe davvero prendere: se le date
    // proposte non renderebbero valida l'offerta, tacere è meglio.
    if (!offertaVale(p, risorsa, p.data_inizio, p.data_fine, oggi)) continue
    const totale = totaleConOfferta(risorsa, p.data_inizio, p.data_fine, p)
    if (totale == null) continue
    if (!migliore || totale < migliore.totale) {
      migliore = {
        nome: p.nome, badge: p.badge_label || 'Offerta', colore: p.colore || '#e53e3e',
        dal: p.data_inizio, al: p.data_fine, totale,
      }
    }
  }
  return migliore
}

// I giorni di un mese toccati da un'offerta, per colorare il calendario prima
// che il visitatore scelga.
//
// ⚠️ Qui si guarda il **giorno**, non il periodo: un'offerta che chiede almeno
// tre notti si segnala lo stesso sui suoi giorni, perché serve a far vedere che
// lì c'è qualcosa. Il prezzo vero si dice dopo, quando le date ci sono — e se
// il minimo non è raggiunto l'offerta semplicemente non si applica.
//
// Prenotazione anticipata e last minute si colorano solo nei giorni in cui
// varrebbero partendo da lì oggi: segnalare «-25% last minute» fra tre mesi
// sarebbe una promessa che al clic sparisce.
export function offerteDelGiorno(promozioni, giorno, oggi = null) {
  return (promozioni || []).filter(p => {
    if (!p || p.attiva === false) return false
    if (!finestraDiPrenotazione(p, giorno, oggi)) return false
    if (p.data_inizio && giorno < p.data_inizio) return false
    if (p.data_fine && giorno > p.data_fine) return false
    if (!p.data_inizio && !p.data_fine) return false   // «sempre» non si colora
    if (Array.isArray(p.giorni_settimana) && p.giorni_settimana.length) {
      if (!p.giorni_settimana.includes(new Date(`${giorno}T12:00:00`).getDay())) return false
    }
    return true
  })
}

// ─── Gli slot orari ──────────────────────────────────────────────────────────

const minuti = ora => { const [h, m] = String(ora || '').split(':').map(Number); return (h || 0) * 60 + (m || 0) }

// Un'offerta vale per questo slot (giorno + ora d'inizio)?
//
// ⛔ Sta qui perché la usano in due: il calendario degli slot, che la mostra, e
// la route di prenotazione, che la **ricontrolla**. Prima la prenotazione
// prendeva dal browser l'id dell'offerta e ne applicava il prezzo senza
// guardare giorno e ora: chi costruiva la richiesta a mano si prendeva il
// prezzo di un'offerta di agosto a novembre. Il client dice quale, mai se vale.
//
// Gli slot conoscono solo le offerte a prezzo: sconti, prenotazione anticipata,
// last minute e pacchetti sono delle risorse a giornate.
export function offertaSlotVale(promo, data, ora) {
  if (!promo || promo.attiva === false) return false
  if (tipoSconto(promo) !== 'prezzo' || promo.prezzo_speciale == null) return false
  if (promo.prenota_prima_giorni != null || promo.prenota_entro_giorni != null || promo.durata_esatta != null) return false
  if (promo.data_inizio && data < promo.data_inizio) return false
  if (promo.data_fine && data > promo.data_fine) return false
  if (Array.isArray(promo.giorni_settimana) && promo.giorni_settimana.length &&
      !promo.giorni_settimana.includes(new Date(`${data}T12:00:00`).getDay())) return false
  if (promo.ora_inizio) {
    if (!ora) return false
    const m = minuti(ora)
    if (m < minuti(promo.ora_inizio) || m >= minuti(promo.ora_fine)) return false
  }
  return true
}

// ─── I dati di un'offerta, come li accetta il server ─────────────────────────

const CAMPI_OFFERTA = ['nome', 'descrizione', 'data_inizio', 'data_fine', 'ora_inizio', 'ora_fine',
  'giorni_settimana', 'prezzo_speciale', 'badge_label', 'colore', 'attiva', 'prezzo_modo', 'minimo_notti',
  'sconto_tipo', 'sconto_valore', 'prenota_prima_giorni', 'prenota_entro_giorni', 'durata_esatta']
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const ORA_RE = /^\d{2}:\d{2}(:\d{2})?$/

function interoONull(v, min, max) {
  if (v === null || v === undefined || v === '') return { v: null }
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max) return { errore: true }
  return { v: n }
}

// Un'offerta completa (quella salvata + i cambi) ripulita campo per campo.
// Torna `{ dati }` con soli campi ammessi, o `{ errore }` in parole.
//
// ⛔ Ogni numero qui finisce in un conto: arriva dal client, quindi passa da un
// controllo chiuso e i tipi da un catalogo. Il `CHECK` della tabella (migration
// 145) è il muro dietro.
export function datiOffertaPuliti(offerta, risorsa) {
  const o = {}
  for (const k of CAMPI_OFFERTA) if (k in (offerta || {})) o[k] = offerta[k]

  if (!String(o.nome || '').trim()) return { errore: 'Dai un nome all\'offerta.' }
  o.nome = String(o.nome).trim().slice(0, 120)
  o.sconto_tipo = tipoSconto(o)
  o.prezzo_modo = MODI_PREZZO.includes(o.prezzo_modo) ? o.prezzo_modo : 'giorno'

  for (const k of ['data_inizio', 'data_fine']) {
    if (o[k] === '' || o[k] == null) o[k] = null
    else if (!DATA_RE.test(o[k])) return { errore: 'Data non valida.' }
  }
  if (o.data_inizio && o.data_fine && o.data_fine < o.data_inizio) return { errore: 'La data di fine viene prima di quella di inizio.' }
  for (const k of ['ora_inizio', 'ora_fine']) {
    if (o[k] === '' || o[k] == null) o[k] = null
    else if (!ORA_RE.test(o[k])) return { errore: 'Ora non valida.' }
  }
  if (o.giorni_settimana != null) {
    if (!Array.isArray(o.giorni_settimana)) return { errore: 'Giorni della settimana non validi.' }
    const g = [...new Set(o.giorni_settimana.map(Number))]
    if (g.some(x => !Number.isInteger(x) || x < 0 || x > 6)) return { errore: 'Giorni della settimana non validi.' }
    o.giorni_settimana = g.length ? g : null
  }

  const minimo = interoONull(o.minimo_notti, 1, 365)
  const prima = interoONull(o.prenota_prima_giorni, 0, 730)
  const entro = interoONull(o.prenota_entro_giorni, 0, 730)
  const durata = interoONull(o.durata_esatta, 1, 365)
  if (minimo.errore || prima.errore || entro.errore || durata.errore) return { errore: 'Un numero di giorni non è valido.' }
  o.minimo_notti = minimo.v; o.prenota_prima_giorni = prima.v; o.prenota_entro_giorni = entro.v; o.durata_esatta = durata.v
  if (o.prenota_prima_giorni != null && o.prenota_entro_giorni != null && o.prenota_entro_giorni < o.prenota_prima_giorni)
    return { errore: '«Almeno N giorni prima» e «al massimo N giorni prima» non possono valere insieme così.' }

  if (o.sconto_tipo === 'prezzo') {
    const p = Number(o.prezzo_speciale)
    if (o.prezzo_speciale === '' || o.prezzo_speciale == null || !Number.isFinite(p) || p < 0 || p > 1_000_000)
      return { errore: 'Scrivi il prezzo dell\'offerta.' }
    o.prezzo_speciale = Math.round(p * 100) / 100
    o.sconto_valore = null
  } else {
    const v = Number(o.sconto_valore)
    if (!Number.isFinite(v) || v <= 0 || (o.sconto_tipo === 'percentuale' && v > 100) || v > 1_000_000)
      return { errore: o.sconto_tipo === 'percentuale' ? 'Lo sconto va da 1 a 100%.' : 'Scrivi l\'importo dello sconto.' }
    o.sconto_valore = Math.round(v * 100) / 100
    o.prezzo_speciale = null
  }

  // Il pacchetto è un forfait legato a una forma: senza «prezzo per tutto il
  // periodo» una durata esatta non vorrebbe dire niente.
  if (o.durata_esatta != null && !(o.sconto_tipo === 'prezzo' && o.prezzo_modo === 'periodo'))
    return { errore: 'La durata esatta serve ai pacchetti: prezzo fisso «per tutto il periodo».' }

  // Sconti, prenotazione anticipata, last minute e pacchetti sono delle
  // risorse a giornate: gli slot e i coperti non sanno contarli.
  if (risorsa?.modalita && risorsa.modalita !== 'giornaliero' &&
      (o.sconto_tipo !== 'prezzo' || o.prenota_prima_giorni != null || o.prenota_entro_giorni != null || o.durata_esatta != null))
    return { errore: 'Sconti, prenotazione anticipata e pacchetti valgono per le risorse a giornate.' }

  if ('attiva' in o) o.attiva = o.attiva !== false
  if (o.badge_label != null) o.badge_label = String(o.badge_label).slice(0, 40) || 'Offerta'
  if (o.colore != null && !/^#[0-9a-f]{6}$/i.test(o.colore)) o.colore = '#e53e3e'
  if (o.descrizione != null) o.descrizione = String(o.descrizione).slice(0, 1000)
  return { dati: o }
}
