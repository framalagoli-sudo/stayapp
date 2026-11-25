// Consigli a chi scrive una newsletter: cosa la fa sembrare pubblicità.
//
// Perché esiste: Gmail mette le newsletter nella scheda «Promozioni» guardando
// com'è fatta l'email (tante immagini, tanti link, oggetto urlato, parole da
// volantino). Non c'è un modo garantito di evitarlo e non lo promettiamo:
// questi sono SUGGERIMENTI, mai un blocco. L'invio non li legge.
//
// ⛔ Il pulsante «Annulla iscrizione» e le intestazioni List-Unsubscribe NON si
// toccano per uscire da Promozioni: Gmail e Yahoo li pretendono da chi manda
// posta in massa, e senza le email finiscono nello spam o vengono rifiutate.
//
// ⚠️ File senza dipendenze: lo legge il browser (regola 5).

const isDoc = v => !!v && typeof v === 'object' && v.type === 'doc' && Array.isArray(v.content)

// Testo e link di un campo: stringa semplice o documento dell'editor formattato.
function leggi(v, acc) {
  if (isDoc(v) || (v && typeof v === 'object' && Array.isArray(v.content))) {
    for (const n of v.content) leggi(n, acc)
    return
  }
  if (v && typeof v === 'object' && v.type === 'text') {
    acc.testo += String(v.text || '') + ' '
    for (const m of Array.isArray(v.marks) ? v.marks : []) {
      if (m?.type === 'link' && m.attrs?.href) acc.link.add(String(m.attrs.href).trim())
    }
    return
  }
  if (typeof v === 'string') {
    acc.testo += v + ' '
    for (const u of v.match(/https?:\/\/[^\s<>"']+/gi) || []) acc.link.add(u)
  }
}

// Quante parole, link e immagini ha davvero il contenuto di un modello.
export function misuraContenuto(content) {
  const c = content || {}
  const acc = { testo: '', link: new Set() }
  let immagini = 0
  for (const k of ['heading', 'intro', 'text', 'event_title', 'location', 'conditions', 'cta_text', 'badge']) leggi(c[k], acc)
  if (c.cta_url?.trim()) acc.link.add(c.cta_url.trim())
  if (c.image_url?.trim()) immagini++
  for (const b of Array.isArray(c.blocks) ? c.blocks : []) {
    leggi(b?.title, acc); leggi(b?.text, acc)
    if (b?.image_url?.trim()) immagini++
  }
  const parole = acc.testo.split(/\s+/).filter(Boolean).length
  return { parole, link: acc.link.size, immagini }
}

// Parole da volantino: le riconosce chi legge prima ancora dei filtri.
const PAROLE_VOLANTINO = [
  'gratis', 'gratuito', 'gratuita', 'urgente', 'imperdibile', 'ultima occasione', 'ultimissim',
  'solo oggi', 'affrettati', 'clicca qui', 'vinci', 'hai vinto', 'garantito', '100%', 'offerta speciale',
  'super offerta', 'prezzi pazzi', 'sconto pazzesco', 'non perdere',
]
const EMOJI = /\p{Extended_Pictographic}/gu

// L'elenco dei consigli per la bozza così com'è adesso.
// Ognuno: { chiave, livello: 'attenzione' | 'suggerimento', testo }.
export function consigliNewsletter({ subject = '', preheader = '', content } = {}) {
  const out = []
  const ogg = String(subject || '').trim()

  if (ogg) {
    const lettere = ogg.replace(/[^\p{L}]/gu, '')
    if (lettere.length >= 6 && lettere === lettere.toUpperCase() && lettere !== lettere.toLowerCase()) {
      out.push({ chiave: 'maiuscolo', livello: 'attenzione', testo: 'L’oggetto è tutto in maiuscolo: nella casella sembra urlato. Scrivilo come una frase normale.' })
    }
    if ((ogg.match(/!/g) || []).length > 1) {
      out.push({ chiave: 'esclamativi', livello: 'attenzione', testo: 'Più di un punto esclamativo nell’oggetto: è il tono dei volantini. Ne basta uno, o nessuno.' })
    }
    const minuscolo = ogg.toLowerCase()
    const trovate = PAROLE_VOLANTINO.filter(p => minuscolo.includes(p))
    if (trovate.length) {
      out.push({ chiave: 'parole', livello: 'attenzione', testo: `Nell’oggetto c’è «${trovate[0]}»: è una delle parole che fanno subito pensare alla pubblicità. Prova a dire la cosa concreta (cosa, quando, per chi).` })
    }
    if ((ogg.match(EMOJI) || []).length > 1) {
      out.push({ chiave: 'emoji', livello: 'suggerimento', testo: 'Più di un’emoji nell’oggetto. Una aiuta a farsi notare; tante lo fanno sembrare una promozione.' })
    }
    if (ogg.length > 60) {
      out.push({ chiave: 'lungo', livello: 'suggerimento', testo: `L’oggetto è di ${ogg.length} caratteri: sul telefono se ne leggono circa 40. Metti in testa la parte che conta.` })
    }
  }

  if (!String(preheader || '').trim()) {
    out.push({ chiave: 'preheader', livello: 'suggerimento', testo: 'Il testo anteprima è vuoto: al suo posto la casella mostra la prima riga dell’email, spesso «Se non vedi bene questa email…». Scrivi una frase che completi l’oggetto.' })
  }

  const { parole, link, immagini } = misuraContenuto(content)
  if (link > 3) {
    out.push({ chiave: 'link', livello: 'attenzione', testo: `Ci sono ${link} link diversi. Una newsletter con un solo invito chiaro sembra una lettera; con tanti link sembra un volantino.` })
  }
  if (immagini >= 2 && parole < 60) {
    out.push({ chiave: 'immagini', livello: 'attenzione', testo: `${immagini} immagini e poche parole (${parole}). Le email fatte quasi solo di foto sono quelle che i programmi di posta trattano da pubblicità: aggiungi qualche riga di testo.` })
  }

  return out
}
