// Import di una rubrica in una lista di contatti.
//
// È l'unica porta d'ingresso possibile: WhatsApp non ha una rubrica propria né
// un'API per leggerla — legge quella del telefono. Quindi il cliente esporta da
// Google Contatti, da iCloud o dal suo gestionale, e il file passa da qui.
//
// Due principi, perché questo è il punto in cui si fa più danno:
//  1. i contatti importati NON hanno dato il consenso a WhatsApp. Entrano con
//     whatsapp_optin = false e basta. Il consenso si raccoglie, non si presume:
//     dare per scontato il contrario significa far bloccare il numero del cliente.
//  2. un import non deve mai sovrascrivere dati esistenti: aggiorna solo i campi
//     vuoti e aggiunge i tag, perché il file del cliente è quasi sempre più
//     povero di quello che abbiamo già raccolto sul campo.

// Numeri: il formato internazionale è l'unico che WhatsApp accetta.
// Restituisce null se il numero non è utilizzabile, invece di inventarsi un prefisso.
export function normalizzaTelefono(raw, prefissoPredefinito = '39') {
  if (!raw) return null
  let n = String(raw).replace(/[\s\-(). ]/g, '')
  if (n.startsWith('00')) n = '+' + n.slice(2)
  if (!n.startsWith('+')) {
    // Un numero italiano scritto senza prefisso è il caso più comune nelle rubriche.
    if (/^3\d{8,9}$/.test(n) || /^0\d{8,10}$/.test(n)) n = `+${prefissoPredefinito}${n}`
    else if (/^\d{11,15}$/.test(n)) n = `+${n}`
    else return null
  }
  return /^\+\d{8,15}$/.test(n) ? n : null
}

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
export const emailValida = e => !!e && EMAIL_VALIDA.test(String(e).trim())

// Parser CSV che regge le virgolette e i separatori dentro i campi: un nome come
// "Rossi, Mario" o una nota con una virgola non devono spostare le colonne.
export function parseCsv(testo) {
  const t = String(testo).replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!t.trim()) return { righe: [], separatore: ',' }

  // Google esporta con la virgola, Excel italiano con il punto e virgola.
  const prima = t.slice(0, t.indexOf('\n') === -1 ? t.length : t.indexOf('\n'))
  const separatore = (prima.match(/;/g)?.length || 0) > (prima.match(/,/g)?.length || 0) ? ';' : ','

  const righe = []
  let campo = '', riga = [], dentroVirgolette = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (dentroVirgolette) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++ } else dentroVirgolette = false
      } else campo += c
    } else if (c === '"') dentroVirgolette = true
    else if (c === separatore) { riga.push(campo); campo = '' }
    else if (c === '\n') { riga.push(campo); righe.push(riga); riga = []; campo = '' }
    else campo += c
  }
  if (campo || riga.length) { riga.push(campo); righe.push(riga) }
  return { righe: righe.filter(r => r.some(c => c.trim())), separatore }
}

// Riconosce le colonne senza chiedere niente all'utente: i nomi cambiano tra
// Google, iCloud e i gestionali, ma sono sempre gli stessi cinque concetti.
const SINONIMI = {
  nome_completo: ['name', 'display name', 'full name', 'nominativo', 'cliente', 'ragione sociale', 'denominazione'],
  nome: ['nome', 'first name', 'given name'],
  cognome: ['cognome', 'last name', 'family name', 'surname'],
  email: ['email', 'e-mail', 'mail', 'posta elettronica', 'e-mail 1 - value', 'email address'],
  telefono: ['telefono', 'phone', 'cellulare', 'mobile', 'cell', 'numero', 'phone 1 - value', 'telefono 1', 'whatsapp'],
  note: ['note', 'notes', 'annotazioni', 'commento', 'descrizione'],
}

export function riconosciColonne(intestazioni) {
  const norm = intestazioni.map(h => String(h || '').trim().toLowerCase())
  const mappa = {}
  for (const [campo, alias] of Object.entries(SINONIMI)) {
    const i = norm.findIndex(h => alias.includes(h))
    if (i !== -1) mappa[campo] = i
  }
  // Fallback: se non c'è un'intestazione riconoscibile, cerca la colonna che
  // contiene qualcosa che somiglia a un'email o a un numero.
  return mappa
}

// Trasforma il file in righe pronte, dichiarando cosa è stato scartato e perché.
// Non scarta silenziosamente: chi importa deve sapere quante righe non sono
// passate, altrimenti si accorge dei buchi mesi dopo.
export function preparaContatti(testo, { prefisso = '39' } = {}) {
  const { righe } = parseCsv(testo)
  if (!righe.length) return { contatti: [], scartati: [], intestazioni: [] }

  const intestazioni = righe[0].map(h => String(h || '').trim())
  const mappa = riconosciColonne(intestazioni)
  const conIntestazione = Object.keys(mappa).length > 0
  const dati = conIntestazione ? righe.slice(1) : righe

  const contatti = []
  const scartati = []
  const visti = new Set()

  for (const [n, r] of dati.entries()) {
    const val = k => (mappa[k] !== undefined ? String(r[mappa[k]] ?? '').trim() : '')
    // Nome e cognome separati vincono sul nome completo (più puliti); se mancano,
    // si usa il campo unico. Mai sommare i due, o il cognome compare due volte.
    const nomeProprio = [val('nome'), val('cognome')].filter(Boolean).join(' ').trim()
    const nome = nomeProprio || val('nome_completo')
    const emailGrezza = val('email')
    const email = emailValida(emailGrezza) ? emailGrezza.toLowerCase() : null
    const telefono = normalizzaTelefono(val('telefono'), prefisso)

    if (!email && !telefono) {
      scartati.push({ riga: n + (conIntestazione ? 2 : 1), motivo: 'nessun contatto utilizzabile (né email né telefono valido)' })
      continue
    }
    // Doppioni dentro lo stesso file: capita spessissimo nelle rubriche esportate.
    const chiave = telefono || email
    if (visti.has(chiave)) {
      scartati.push({ riga: n + (conIntestazione ? 2 : 1), motivo: `doppione nel file (${chiave})` })
      continue
    }
    visti.add(chiave)

    contatti.push({
      nome: nome || email || telefono,
      email,
      telefono,
      note: val('note') || null,
    })
  }

  return { contatti, scartati, intestazioni, colonne_riconosciute: Object.keys(mappa) }
}
