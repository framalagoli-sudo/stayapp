import sanitizeHtml from 'sanitize-html'

// Il contenuto di un articolo, ripulito **sul server**.
//
// ⛔ Misurato il 18/09/2026: la pagina di un articolo del blog conteneva
// **4 parole** nell'HTML e nessun H1. Il testo arrivava dopo, dal browser, e
// per un motore di ricerca l'articolo non esisteva. Il blog è esattamente la
// cosa che si scrive per farsi trovare: era il buco più costoso.
//
// Non si poteva stampare dal server perché la ripulitura usava DOMPurify, che
// gira solo nel browser. Qui si usa `sanitize-html`, che gira in Node: una
// libreria provata, invece di un filtro scritto a mano — gli attributi (href,
// src) sono la parte dove sbagliare costa caro.

// Tag e attributi ammessi: quelli che un articolo usa davvero. Niente
// `<script>`, niente `<iframe>`, nessun gestore di eventi (`onclick` & co. non
// sono in lista, quindi cadono).
const AMMESSI = {
  allowedTags: [
    'p', 'br', 'hr', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sup', 'sub', 'mark',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    '*': ['style'],
  },
  // Solo indirizzi che portano a una pagina o a una mail: `javascript:` non è
  // in lista, quindi un link che prova a eseguire codice resta senza href.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  // Lo stile in linea serve (il nostro editor lo scrive), ma solo per queste
  // proprietà: una `style` libera può nascondere contenuto o coprire la pagina.
  allowedStyles: {
    '*': {
      'color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb/, /^[a-z]+$/],
      'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb/, /^[a-z]+$/],
      'text-align': [/^(left|right|center|justify)$/],
      'font-weight': [/^(normal|bold|[1-9]00)$/],
      'font-style': [/^(normal|italic)$/],
      'text-decoration': [/^(none|underline|line-through)$/],
    },
  },
  // Un link che esce dal sito si apre altrove e non passa autorità a chi non
  // conosciamo: `rel` lo scriviamo noi, non chi ha incollato il link.
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank'
        ? { ...attribs, rel: 'noopener noreferrer' }
        : attribs,
    }),
  },
}

export function contenutoArticoloPulito(html) {
  if (!html) return ''
  return sanitizeHtml(String(html), AMMESSI)
}
