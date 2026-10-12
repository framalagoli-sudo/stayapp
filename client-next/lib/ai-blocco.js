// «Chiedi all'AI» dentro l'editor delle pagine: la persona descrive la sezione
// che vuole e l'AI sceglie il blocco più adatto e lo scrive.
//
// L'AI non scrive mai HTML e non decide la forma dei dati: sceglie un tipo da
// questo catalogo e ne riempie i campi. Quello che restituisce NON finisce
// nella pagina così com'è: `ripulisci` lo ricostruisce da zero, campo per
// campo, tenendo solo ciò che il catalogo prevede.
//
// ⚠️ I fatti non si inventano. Un prezzo, un numero, il nome di una persona o
// una recensione restano solo se stanno nella richiesta o nei dati
// dell'attività; altrimenti al loro posto va una frase che dice cosa scriverci.
// Lo dice il prompt, ma lo garantisce il codice qui sotto: una recensione
// inventata sul sito di un cliente è una recensione falsa.
//
// Senza dipendenze: lo importa la route, e la sonda lo prova da sola.

import { AI_ICONS } from './ai-blocks'
import { datiDiNascita } from './editor-visuale'

const ICONE = AI_ICONS.slice(AI_ICONS.indexOf(':') + 1).split(',').map(s => s.trim()).filter(Boolean)

export const MAX_BLOCCHI = 3
export const RICHIESTA_MIN = 3
export const RICHIESTA_MAX = 800

// Tipi di campo
const t = max => ({ k: 'testo', max })
const DOVE = { k: 'destinazione' }            // un indirizzo: solo fra le pagine del sito
const ICONA = { k: 'icona' }
const SI_NO = { k: 'si_no' }
const FOTO = { k: 'foto' }                    // 2-5 parole in inglese: la foto la cerca il server
const uno = (...valori) => ({ k: 'scelta', valori })
const PREZZO = { k: 'cifra', max: 40, vuoto: '' }
const NUMERO = { k: 'cifra', max: 20, vuoto: '—' }

// Il catalogo: per ogni tipo i campi che l'AI può scrivere e, se ha una lista,
// i campi di ogni elemento. `fissi` = quello che il blocco porta comunque.
const FORME = {
  hero:        { cosa: 'copertina con titolo, frase e pulsante', campi: { title: t(120), tagline: t(240), cta1_text: t(40), cta1_url: DOVE, image_query: FOTO, height: uno('large', 'full') } },
  about:       { cosa: 'titolo + testo (chi siamo, la storia, una presentazione)', campi: { title: t(120), text: t(2500) } },
  foto_testo:  { cosa: 'una foto accanto a un testo', campi: { title: t(120), text: t(2000), image_query: FOTO, inverti: SI_NO, button_label: t(40), button_url: DOVE } },
  cta_banner:  { cosa: 'banda con un invito e un pulsante', campi: { title: t(120), subtitle: t(240), button_text: t(40), button_url: DOVE, variant: uno('center', 'split') } },
  pulsante:    { cosa: 'un pulsante da solo', campi: { text: t(40), url: DOVE } },
  colonne:     { cosa: 'due o tre colonne di testo', campi: { titolo: t(120), columns: uno(2, 3) }, lista: { campi: { title: t(100), text: t(700) }, max: 3 } },
  paragrafi:   { cosa: 'schede con icona, titolo e testo (servizi, vantaggi)', campi: { titolo: t(120) }, lista: { campi: { icon: ICONA, title: t(100), text: t(400) }, max: 8 } },
  highlights:  { cosa: 'punti in evidenza: icona + frase breve', campi: { titolo: t(120) }, lista: { campi: { icon: ICONA, text: t(120) }, max: 8 } },
  steps:       { cosa: 'come funziona, a passi numerati', campi: { titolo: t(120) }, lista: { campi: { icon: ICONA, title: t(100), text: t(400) }, max: 6 } },
  accordion:   { cosa: 'sezioni apribili per contenuti lunghi', campi: { titolo: t(120) }, lista: { campi: { title: t(140), text: t(1200) }, max: 8 } },
  faq:         { cosa: 'domande frequenti', campi: { titolo: t(120) }, lista: { campi: { question: t(200), answer: t(800) }, max: 8 } },
  stats:       { cosa: 'numeri grandi (anni, clienti, coperti)', campi: { titolo: t(120) }, lista: { campi: { value: NUMERO, label: t(80) }, max: 4 } },
  testimonianze: { cosa: 'recensioni dei clienti', campi: { titolo: t(120) }, lista: { campi: { author: t(80), role: t(80), text: t(700) }, max: 6 } },
  team:        { cosa: 'le persone: nome, ruolo, due righe', campi: { titolo: t(120), variant: uno('ritratti', 'editoriale') }, lista: { campi: { nome: t(80), ruolo: t(80), bio: t(600) }, max: 8 }, fissi: { formato: 'quadrato' } },
  pacchetti:   { cosa: 'due-quattro proposte a confronto, col prezzo', campi: { titolo: t(120) }, lista: { campi: { name: t(80), tagline: t(200), price: PREZZO, price_label: t(40), badge: t(30) }, max: 4 } },
  listino:     { cosa: 'elenco di voci col loro prezzo', campi: { titolo: t(120), sottotitolo: t(200), nota: t(200), due_colonne: SI_NO }, lista: { campi: { name: t(120), description: t(240), price: PREZZO }, max: 30 } },
  carosello:   { cosa: 'schede che scorrono: titolo + testo', campi: { titolo: t(120) }, lista: { campi: { title: t(100), text: t(400) }, max: 8 } },
  newsletter:  { cosa: 'iscrizione alla newsletter', campi: { title: t(120), subtitle: t(240) } },
  recapiti:    { cosa: 'indirizzo, telefono, email, orari e mappa: li prende da soli dai dati salvati', campi: { titolo: t(120), sottotitolo: t(200), mostra_mappa: SI_NO }, fissi: { nascondi: [] } },
  form_builder: { cosa: 'modulo per farsi scrivere (il modulo si sceglie poi dalla scheda)', campi: { titolo_sezione: t(120) }, fissi: { form_token: '' } },
  galleria_immagini: { cosa: 'galleria di foto da caricare: nasce VUOTA, le foto le mette il cliente', campi: { titolo: t(120) }, fissi: { images: [], columns: 3 } },
  gallery:     { cosa: 'le foto già caricate nella Galleria dell\'attività', campi: {} },
  services:    { cosa: 'i servizi già salvati dell\'attività', campi: {} },
  eventi:      { cosa: 'gli eventi in programma, presi dal calendario', campi: {} },
  show_map:    { cosa: 'solo la mappa', campi: {} },
  menu:        { cosa: 'il menù del ristorante, preso da quello salvato', campi: { titolo: t(120) }, solo: 'ristorante' },
  divisore:    { cosa: 'separatore decorativo fra due sezioni', campi: { variant: uno('wave', 'diagonal') } },
}

export function tipiPerAI(entity_tipo) {
  return Object.keys(FORME).filter(k => !FORME[k].solo || FORME[k].solo === entity_tipo)
}

// ── Testi ────────────────────────────────────────────────────────────────────
// Niente marcatura: sul sito un `<p>` scritto dall'AI finirebbe stampato.
function testoPulito(v, max) {
  if (typeof v === 'number') v = String(v)
  if (typeof v !== 'string') return ''
  return v.replace(/<[^>]{0,200}>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[ \t]+\n/g, '\n').trim().slice(0, max)
}
const piano = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const parole = (s, min) => piano(s).split(/[^a-z0-9]+/).filter(w => w.length >= min)

// Le cifre di un testo stanno tutte in una delle fonti? «su richiesta» (nessuna
// cifra) passa sempre.
function cifreNote(valore, fonte) {
  const cifre = String(valore).match(/\d+/g) || []
  if (!cifre.length) return true
  const note = new Set(String(fonte).match(/\d+/g) || [])
  return cifre.every(c => note.has(c))
}
// Quanta parte delle parole di un testo sta nella fonte (0–1).
function coperto(testo, fonte, min = 4) {
  const p = parole(testo, min); if (!p.length) return 0
  const note = new Set(parole(fonte, min))
  return p.filter(w => note.has(w)).length / p.length
}

const SEGNAPOSTO = {
  recensione: () => ({ author: 'Nome del cliente', role: '', text: 'Scrivi qui la recensione di un tuo cliente.', stars: 5 }),
  persona:    () => ({ photo_url: '', photo_focal: '', nome: 'Nome e cognome', ruolo: 'Ruolo', bio: 'Due righe su questa persona.' }),
}

function campo(forma, v, ctx, note) {
  if (forma.k === 'testo') return testoPulito(v, forma.max)
  if (forma.k === 'destinazione') return typeof v === 'string' && ctx.destinazioni.includes(v.trim()) ? v.trim() : ''
  if (forma.k === 'icona') return ICONE.includes(v) ? v : 'star'
  if (forma.k === 'si_no') return v === true
  if (forma.k === 'scelta') return forma.valori.includes(v) ? v : forma.valori[0]
  if (forma.k === 'foto') return testoPulito(v, 80).replace(/[^\p{L}\p{N} ,'-]/gu, ' ').trim()
  if (forma.k === 'cifra') {
    const scritto = testoPulito(v, forma.max)
    if (!scritto || cifreNote(scritto, ctx.fonti)) return scritto
    note.add(forma === PREZZO ? 'I prezzi non li conosco: li ho lasciati vuoti, scrivili tu.' : 'I numeri non li conosco: al loro posto c\'è un trattino, scrivili tu.')
    return forma.vuoto
  }
  return ''
}

// Ricostruisce i blocchi restituiti dall'AI. `ctx`:
//   entity_tipo · richiesta · contesto (i dati dell'attività dati all'AI) ·
//   destinazioni (gli indirizzi ammessi) · nuovoId
// Restituisce { blocks, note }: `note` = cosa è stato lasciato da completare.
export function ripulisci(grezzi, ctx) {
  const note = new Set()
  const c = { ...ctx, destinazioni: ctx.destinazioni || [], fonti: `${ctx.richiesta || ''}\n${ctx.contesto || ''}` }
  const ammessi = tipiPerAI(ctx.entity_tipo)
  const blocks = []
  for (const g of Array.isArray(grezzi) ? grezzi : []) {
    if (blocks.length >= MAX_BLOCCHI) break
    if (!g || typeof g !== 'object' || !ammessi.includes(g.type)) continue
    const forma = FORME[g.type]
    const d = g.data && typeof g.data === 'object' && !Array.isArray(g.data) ? g.data : {}
    const data = { ...(forma.fissi ? JSON.parse(JSON.stringify(forma.fissi)) : {}) }
    for (const [k, f] of Object.entries(forma.campi)) data[k] = campo(f, d[k], c, note)

    if (forma.lista) {
      let items = (Array.isArray(d.items) ? d.items : []).filter(x => x && typeof x === 'object' && !Array.isArray(x)).slice(0, forma.lista.max)
        .map(x => Object.fromEntries(Object.entries(forma.lista.campi).map(([k, f]) => [k, campo(f, x[k], c, note)])))
        // Un elemento conta se ha almeno un testo: un'icona o un trattino da soli no.
        .filter(x => Object.entries(x).some(([k, v]) => forma.lista.campi[k].k === 'testo' && v))

      if (g.type === 'testimonianze') {
        // Una recensione resta solo se è stata incollata nella richiesta.
        const vere = items.filter(x => x.author && x.text && coperto(x.text, ctx.richiesta) >= 0.7 && coperto(x.author, ctx.richiesta, 3) >= 0.5)
        if (vere.length < items.length || !items.length) note.add('Le recensioni non le invento: incolla quelle vere dei tuoi clienti al posto della frase di esempio.')
        items = vere.length ? vere.map(x => ({ ...x, stars: 5 })) : [SEGNAPOSTO.recensione()]
      } else if (g.type === 'team') {
        // Una persona resta solo se il suo nome è nella richiesta o nei dati.
        const vere = items.filter(x => x.nome && coperto(x.nome, c.fonti, 3) === 1)
        if (vere.length < items.length || !items.length) note.add('I nomi delle persone non li conosco: scrivili al posto di «Nome e cognome».')
        items = vere.length ? vere.map(x => ({ photo_url: '', photo_focal: '', ...x })) : [SEGNAPOSTO.persona(), SEGNAPOSTO.persona()]
      }
      if (!items.length) {
        // L'AI ha scelto il blocco giusto ma non aveva di che riempirlo: nasce
        // con le voci di esempio dell'editor, senza cifre, da riscrivere.
        items = (datiDiNascita(g.type, {}, ctx.nuovoId).items || []).map(x => Object.fromEntries(Object.keys(forma.lista.campi).map(k => [k, forma.lista.campi[k].k === 'cifra' ? forma.lista.campi[k].vuoto : (x[k] ?? '')])))
        if (!items.length) continue
        note.add('Non avevo abbastanza informazioni per riempirla: ho lasciato delle voci di esempio da riscrivere.')
      }
      data.items = items.map(x => ({ id: ctx.nuovoId(), ...x }))
    }
    if (g.type === 'colonne') data.columns = Math.min(3, Math.max(2, data.items.length))
    if (g.type === 'galleria_immagini') note.add('La galleria è vuota: le foto le carichi tu con «Aggiungi una foto alla galleria».')
    // Senza una destinazione fra le pagine del sito il pulsante non comparirebbe.
    for (const [testo, dove] of [['cta1_text', 'cta1_url'], ['button_label', 'button_url'], ['button_text', 'button_url'], ['text', 'url']]) {
      if (forma.campi[dove] === DOVE && data[testo] && !data[dove]) note.add('Il pulsante compare quando scegli dove porta, dalla scheda a sinistra.')
    }
    if (g.type === 'pulsante' && !data.text) continue
    const b = { id: ctx.nuovoId(), type: g.type, data }
    const fondo = g.style && typeof g.style === 'object' ? g.style.bg : null
    if (['dark', 'light', 'gradient'].includes(fondo) && !['hero', 'stats', 'cta_banner', 'divisore', 'menu'].includes(g.type)) b.style = { bg: fondo }
    blocks.push(b)
  }
  return { blocks, note: [...note] }
}

// ── La richiesta all'AI ──────────────────────────────────────────────────────
export function promptBlocco({ entity, entity_tipo, contesto, richiesta, destinazioni, sopra, sotto, haRecapiti, fotoInGalleria }) {
  const catalogo = tipiPerAI(entity_tipo).map(k => {
    const f = FORME[k]
    const scrivi = x => Object.entries(x).map(([n, c]) => c.k === 'scelta' ? `${n}(${c.valori.map(v => JSON.stringify(v)).join('|')})` : c.k === 'si_no' ? `${n}(true|false)` : n).join(', ')
    const campi = [scrivi(f.campi), f.lista ? `items:[{ ${scrivi(f.lista.campi)} }]` : ''].filter(Boolean).join(', ')
    return `• ${k}: { ${campi} }  ← ${f.cosa}`
  }).join('\n')

  return `Sei l'assistente dell'editor di un sito. Il titolare descrive a parole la sezione che vuole aggiungere alla sua pagina: scegli il blocco PIÙ ADATTO fra quelli del catalogo e scrivine i contenuti. Non scrivi HTML: scegli un tipo e ne riempi i campi.

CATALOGO — usa SOLO questi tipi e SOLO questi campi, coi nomi esatti:
${catalogo}

${AI_ICONS}

REGOLE
- Di norma UN blocco. Fino a ${MAX_BLOCCHI} solo se la richiesta ne chiede chiaramente più d'uno.
- Testi in italiano, concreti, scritti per QUESTA attività usando i dati qui sotto. Niente marcatura (né HTML né asterischi). Nei testi lunghi separa i paragrafi con una riga vuota.
- NON INVENTARE FATTI. Prezzi, numeri, orari, indirizzi, nomi di persone, premi, anni di attività, condizioni: scrivili solo se stanno nella richiesta o nei dati dell'attività. Se mancano: il prezzo lascialo "" · il numero lascialo "" · per una persona scrivi "Nome e cognome" · nelle risposte delle FAQ scrivi una frase che invita a completare ("Scrivi qui …").
- RECENSIONI: mai inventarle. Usa "testimonianze" riportando SOLO le recensioni che il titolare ha incollato nella richiesta, parola per parola. Se non ne ha incollate, metti il blocco con items vuoto: ci penserà lui.
- FOTO: "image_query" = 2-5 parole in INGLESE che descrivono una foto d'atmosfera. Le foto dell'attività non le hai: per una galleria ${fotoInGalleria ? `usa "gallery" (l'attività ha già ${fotoInGalleria} foto caricate)` : 'usa "galleria_immagini", che nasce vuota'}.
- CONTATTI: ${haRecapiti ? 'i recapiti sono già salvati: per contatti, sede, orari o mappa usa "recapiti" e NON ricopiare indirizzo, telefono e orari in altri testi.' : 'i recapiti non sono ancora salvati: "recapiti" resterebbe vuoto, usalo solo se viene chiesto espressamente.'}
- PULSANTI: la destinazione (cta1_url, button_url, url) va scelta SOLO fra questi indirizzi, copiata identica; se nessuno è adatto lasciala "":
${destinazioni.length ? destinazioni.map(d => `  ${d.url}  → ${d.label}`).join('\n') : '  (nessuna)'}
- Puoi aggiungere "style":{"bg":"dark"|"light"|"gradient"} solo se serve a staccare la sezione da quelle vicine.
- Se la richiesta nomina una sezione ma non dà i contenuti (un listino senza le voci, un team senza i nomi), metti lo stesso il blocco con quello che sai: non rifiutare.
- Se la richiesta non è una sezione da aggiungere alla pagina (o chiede qualcosa che il catalogo non sa fare), non forzare: rispondi con blocks vuoto e in "motivo" una frase breve, in parole semplici e SENZA i nomi tecnici dei tipi (di' «le domande frequenti», non «faq»), che dice cosa si può chiedere invece. Dai del tu a chi legge: è lui il titolare.

L'ATTIVITÀ
Nome: ${entity?.name || '(senza nome)'}${entity?.settore ? `\nSettore: ${entity.settore}` : ''}
Descrizione: ${String(entity?.description || '(non scritta)').slice(0, 900)}
${contesto || ''}

DOVE VA LA SEZIONE
Sopra c'è: ${sopra || '(inizio della pagina)'} · sotto c'è: ${sotto || '(fine della pagina)'}. Non ripetere quello che le sezioni vicine già fanno.

LA RICHIESTA DEL TITOLARE
"""
${richiesta}
"""

Rispondi ESCLUSIVAMENTE con JSON valido, senza testo prima o dopo:
{"blocks":[{"type":"...","data":{...}}],"motivo":""}`
}

// Il JSON nella risposta dell'AI, anche se arriva dentro un recinto di codice.
export function leggiRisposta(raw) {
  const m = String(raw || '').match(/\{[\s\S]*\}/)
  try { const r = JSON.parse(m ? m[0] : raw); return r && typeof r === 'object' ? r : null } catch { return null }
}
