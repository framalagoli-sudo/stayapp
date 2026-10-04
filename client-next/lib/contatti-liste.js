// Come si leggono i contatti: da dove arrivano, cosa hanno fatto, in che liste stanno.
//
// Il registro (`contatti_attivita`, migration 130) dice i fatti con parole
// tecniche — `evento`, `modulo`, `lista_attesa`. Qui diventano frasi e liste che
// un titolare capisce: «Chi ha prenotato Luca Zesi», «Tornati più volte».
//
// Le liste NON si salvano: si calcolano dai fatti, quindi sono sempre aggiornate
// — chi prenota entra, e nessuno deve ricordarsi di aggiungerlo. È quello che
// gli altri chiamano «smart list» (vedi nota 56 in CLAUDE.md).
//
// ⚠️ Nessuna dipendenza: lo legge il pannello, che è codice di browser.

// Da quale porta è entrato il contatto (`contatti.fonte`). Le parole storiche
// del database — `minisito`, `pwa`, `form` — erano gergo nostro.
const FONTI = {
  evento: 'Evento', prenotazione: 'Prenotazione', ordine: 'Negozio', form: 'Modulo',
  minisito: 'Sito', pwa: 'App', whatsapp: 'WhatsApp', manuale: 'Aggiunto a mano', import: 'Importato',
}
export const nomeFonte = f => FONTI[f] || (f ? String(f) : 'Aggiunto a mano')

// Cosa ha fatto, detto a parole. `con` = come si lega al titolo.
const FATTI = {
  evento:       { frase: 'Ha prenotato', gruppo: 'Eventi', lista: t => `Chi ha prenotato «${t}»` },
  lista_attesa: { frase: 'In lista d’attesa per', gruppo: 'Liste d’attesa', lista: t => `In lista d’attesa per «${t}»` },
  prenotazione: { frase: 'Ha prenotato', gruppo: 'Prenotazioni', lista: t => `Chi ha prenotato «${t}»` },
  modulo:       { frase: 'Ha compilato', gruppo: 'Moduli', lista: t => `Chi ha compilato «${t}»` },
  ordine:       { frase: 'Ha ordinato', unica: 'Hanno ordinato dal negozio' },
  richiesta:    { frase: 'Ha scritto dal sito', unica: 'Hanno scritto dal sito' },
  newsletter:   { frase: 'Si è iscritto alla newsletter', unica: 'Iscrizioni alla newsletter' },
  whatsapp:     { frase: 'Ha scritto su WhatsApp', unica: 'Hanno scritto su WhatsApp' },
  preventivo:   { frase: 'Preventivo', unica: 'Preventivi' },
  recensione:   { frase: 'Recensione', unica: 'Recensioni' },
}

// «Ha prenotato Luca Zesi Live Show · 2 posti»
export function fraseAttivita(a) {
  const f = FATTI[a?.tipo]
  const titolo = a?.titolo ? String(a.titolo) : ''
  let testo
  if (!f) testo = titolo || 'Attività'
  else if (a.tipo === 'ordine') testo = titolo ? `${f.frase} — ${titolo}` : f.frase
  // «Interesse per: …» aggiunge qualcosa; «Messaggio dal sito» ripeterebbe la frase.
  else if (a.tipo === 'richiesta') testo = titolo && titolo !== 'Messaggio dal sito' ? `${f.frase} — ${titolo}` : f.frase
  // Dove la frase dice già tutto («Ha scritto su WhatsApp») il titolo la ripeterebbe.
  else if (f.unica) testo = f.frase
  else testo = titolo ? `${f.frase} «${titolo}»` : f.frase
  const d = a?.dettaglio || {}
  const coda = [
    d.posti ? `${d.posti} ${d.posti === 1 ? 'posto' : 'posti'}` : null,
    d.persone ? `${d.persone} ${d.persone === 1 ? 'persona' : 'persone'}` : null,
    d.totale ? `€${d.totale}` : null,
    d.canale === 'telefono' ? 'al telefono' : null,
  ].filter(Boolean).join(' · ')
  return coda ? `${testo} · ${coda}` : testo
}

// Si può scrivere a questa persona per promozione? Il consenso è per canale.
// ⚠️ Entrare fra i contatti NON è un consenso: senza la sua spunta non si scrive.
export function canaliContattabili(c) {
  return {
    email: !!(c?.email && c.iscritto_newsletter && !c.email_non_valida),
    whatsapp: !!((c?.telefono_e164 || c?.telefono) && c.whatsapp_optin),
  }
}
export const contattabile = c => { const k = canaliContattabili(c); return k.email || k.whatsapp }

// Un'email che così com'è non arriva: segnata dal rimbalzo, o scritta male.
// Solo gli errori certi — un dominio insolito non è un errore.
const REFUSI = /@(gmail|hotmail|libero|yahoo|outlook|icloud|virgilio|alice|tiscali)\.(con|cmo|ocm|vom|comm|co|cm|i|ti)$|@(gmial|gamil|gmai|gmal|gnail|hotmial|hotmal|yaho|libeo)\.[a-z.]+$/i
export function emailDaCorreggere(c) {
  if (!c?.email) return false
  return !!c.email_non_valida || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(c.email) || REFUSI.test(c.email)
}

// Le occasioni che contano per dire «è tornato»: cose prenotate o comprate.
// Due prenotazioni per la stessa serata sono una volta sola.
const TORNA = new Set(['evento', 'prenotazione', 'ordine'])
const chiaveOrigine = a => `${a.tipo}|${a.origine_id || a.titolo || a.riferimento || ''}`

/**
 * Le liste, calcolate dai contatti e dal registro.
 *
 * @returns {{ liste: Array<{chiave, titolo, gruppo, ids: Set|null, n}>, perContatto: Map }}
 *   `gruppo` raccoglie le liste sotto un'intestazione («Eventi»); `ids` null = tutti.
 */
export function costruisciListe(contatti, attivita) {
  const vivi = new Set(contatti.map(c => c.id))
  const perContatto = new Map()
  const perOrigine = new Map()   // «evento|<id>» → { tipo, titolo, ultimo, ids }
  const perTipo = new Map()      // tipo → ids (per le liste uniche)

  for (const a of attivita) {
    if (!vivi.has(a.contatto_id)) continue
    if (!perContatto.has(a.contatto_id)) perContatto.set(a.contatto_id, [])
    perContatto.get(a.contatto_id).push(a)
    const f = FATTI[a.tipo]
    if (!f) continue
    if (f.unica) {
      if (!perTipo.has(a.tipo)) perTipo.set(a.tipo, new Set())
      perTipo.get(a.tipo).add(a.contatto_id)
      continue
    }
    const k = chiaveOrigine(a)
    if (!perOrigine.has(k)) perOrigine.set(k, { tipo: a.tipo, titolo: a.titolo || 'Senza nome', ultimo: a.avvenuta_il, ids: new Set() })
    const o = perOrigine.get(k)
    o.ids.add(a.contatto_id)
    // Il nome è quello più recente: se l'evento è stato rinominato, si legge il nuovo.
    if (a.avvenuta_il >= o.ultimo) { o.ultimo = a.avvenuta_il; if (a.titolo) o.titolo = a.titolo }
  }
  for (const righe of perContatto.values()) righe.sort((x, y) => (y.avvenuta_il || '').localeCompare(x.avvenuta_il || ''))

  const tornati = new Set()
  for (const [id, righe] of perContatto) {
    if (new Set(righe.filter(a => TORNA.has(a.tipo)).map(chiaveOrigine)).size >= 2) tornati.add(id)
  }
  const insieme = cond => new Set(contatti.filter(cond).map(c => c.id))

  const liste = [
    { chiave: 'tutti', titolo: 'Tutti', gruppo: null, ids: null, n: contatti.length },
    { chiave: 'contattabili', titolo: 'Si possono contattare', gruppo: null, ids: insieme(contattabile), spiega: 'Hanno dato il consenso a ricevere promozioni, per email o su WhatsApp.' },
    { chiave: 'tornati', titolo: 'Tornati più volte', gruppo: null, ids: tornati, spiega: 'Hanno prenotato o comprato in almeno due occasioni diverse.' },
  ]
  // Dentro ogni gruppo, prima quello che è successo più di recente.
  for (const tipo of ['evento', 'lista_attesa', 'prenotazione', 'modulo']) {
    const sue = [...perOrigine.entries()].filter(([, o]) => o.tipo === tipo).sort((x, y) => (y[1].ultimo || '').localeCompare(x[1].ultimo || ''))
    for (const [k, o] of sue) liste.push({ chiave: k, titolo: o.titolo, titoloLungo: FATTI[tipo].lista(o.titolo), gruppo: FATTI[tipo].gruppo, ids: o.ids })
  }
  for (const tipo of ['ordine', 'richiesta', 'newsletter', 'whatsapp', 'preventivo', 'recensione']) {
    if (perTipo.has(tipo)) liste.push({ chiave: `tipo|${tipo}`, titolo: FATTI[tipo].unica, gruppo: 'Altro', ids: perTipo.get(tipo) })
  }
  for (const [fonte, titolo] of [['manuale', 'Aggiunti a mano'], ['import', 'Importati da file']]) {
    const ids = insieme(c => (c.fonte || 'manuale') === fonte)
    if (ids.size) liste.push({ chiave: `fonte|${fonte}`, titolo, gruppo: 'Altro', ids })
  }
  const storte = insieme(emailDaCorreggere)
  if (storte.size) liste.push({ chiave: 'da_correggere', titolo: 'Email da correggere', gruppo: 'Da sistemare', ids: storte, spiega: 'L’email è scritta male o i messaggi tornano indietro: a questo indirizzo non arriva niente.' })

  for (const l of liste) if (l.ids) l.n = l.ids.size
  return { liste, perContatto }
}
