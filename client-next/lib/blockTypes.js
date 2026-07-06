'use client'
import { cloneElement } from 'react'

export const BLOCK_GROUPS = [
  { key: 'layout',      label: 'Testo & Layout' },
  { key: 'marketing',   label: 'Marketing' },
  { key: 'media',       label: 'Media' },
  { key: 'servizi',     label: 'Contenuti condivisi (app + sito)' },
  { key: 'conversione', label: 'Conversione' },
]

export const BLOCK_TYPES = [
  { type: 'hero',         label: 'Hero / Copertina',   group: 'layout',      emoji: '🌄', desc: 'Sezione full-screen con foto, titolo, tagline e CTA — ideale come primo blocco della homepage' },
  { type: 'hero_slider',  label: 'Hero slider',        group: 'layout',      emoji: '🎞️', desc: 'Copertina full-screen con più slide a scorrimento (immagine, titolo, sottotitolo, pulsanti) — frecce, puntini, swipe e autoplay' },
  { type: 'about',        label: 'Blocco testo',       group: 'layout',      emoji: '📝', desc: 'Titolo + paragrafo di testo' },
  { type: 'pulsante',     label: 'Pulsante',           group: 'layout',      emoji: '🔘', desc: 'Bottone con link, stile (pieno/bordato) e allineamento' },
  { type: 'foto_testo',   label: 'Foto + Testo',       group: 'layout',      emoji: '🖼️', desc: 'Immagine affiancata al testo (ripetibile)' },
  { type: 'paragrafi',    label: 'Card paragrafi',     group: 'layout',      emoji: '🗂️', desc: 'Griglia card con icona, titolo, testo' },
  { type: 'team',         label: 'Team',               group: 'layout',      emoji: '👥', desc: 'Card con foto, nome, ruolo, bio' },
  { type: 'steps',        label: 'Steps / Processo',   group: 'layout',      emoji: '🔢', desc: 'Passaggi numerati con icona e testo' },
  { type: 'colonne',      label: 'Colonne',            group: 'layout',      emoji: '▦', desc: 'Due o tre colonne di testo affiancate' },
  { type: 'accordion',    label: 'Accordion',          group: 'layout',      emoji: '🪗', desc: 'Sezioni a fisarmonica (titolo + contenuto) apribili — per contenuti lunghi' },
  { type: 'divisore',     label: 'Divisore / Spazio',  group: 'layout',      emoji: '➖', desc: 'Spazio vuoto, linea o separatore a forma (onda/diagonale) tra le sezioni' },
  { type: 'social',       label: 'Social',             group: 'layout',      emoji: '🔗', desc: 'Icone dei social con link' },
  { type: 'highlights',   label: 'Highlights',         group: 'marketing',   emoji: '⭐', desc: 'Icona + testo breve, griglia 3 colonne' },
  { type: 'stats',        label: 'Statistiche',        group: 'marketing',   emoji: '📊', desc: 'Banda scura con numeri grandi' },
  { type: 'cta_banner',   label: 'Banner CTA',         group: 'marketing',   emoji: '📣', desc: 'Banda colorata con call to action (ripetibile)' },
  { type: 'annuncio',     label: 'Barra annuncio',     group: 'marketing',   emoji: '📢', desc: 'Striscia sottile con annuncio/promo e link — di solito come primo blocco' },
  { type: 'countdown',    label: 'Countdown',          group: 'marketing',   emoji: '⏳', desc: 'Conto alla rovescia verso una data (evento, lancio, offerta)' },
  { type: 'testimonianze',label: 'Testimonianze',      group: 'marketing',   emoji: '💬', desc: 'Card recensioni con stelle e autore' },
  { type: 'promozioni',   label: 'Promozioni',         group: 'marketing',   emoji: '🏷️', desc: 'Card offerte con badge e scadenza' },
  { type: 'pacchetti',    label: 'Pacchetti / Prezzi', group: 'marketing',   emoji: '📦', desc: 'Pricing card con inclusi e CTA' },
  { type: 'faq',          label: 'FAQ',                group: 'marketing',   emoji: '❓', desc: 'Accordion domande e risposte' },
  { type: 'clienti',     label: 'Loghi clienti',      group: 'marketing',   emoji: '🏢', desc: 'Carosello infinito di loghi clienti/partner — grigi di default, colorati al hover' },
  { type: 'carosello',    label: 'Carosello',          group: 'media',       emoji: '🎠', desc: 'Carosello scorrevole di card (immagine + titolo + testo) — frecce, puntini, swipe e autoplay. Più elementi visibili per volta' },
  { type: 'before_after', label: 'Prima / Dopo',       group: 'media',       emoji: '🔀', desc: 'Confronto tra due immagini con maniglia trascinabile' },
  { type: 'embed',        label: 'HTML / Embed',       group: 'media',       emoji: '</>', desc: 'Incolla codice HTML/iframe (mappe, widget, prenotazioni…) — mostrato in sandbox sicura' },
  { type: 'immagine',     label: 'Immagine',           group: 'media',       emoji: '🖼', desc: 'Immagine singola caricata, con didascalia e link — indipendente dall\'app' },
  { type: 'galleria_immagini', label: 'Galleria immagini', group: 'media',   emoji: '🖼', desc: 'Griglia di immagini caricate ad hoc (indipendente dall\'app)' },
  { type: 'gallery',      label: 'Galleria foto (app)',group: 'media',       emoji: '🖼', desc: 'Griglia automatica con le foto dell\'entità' },
  { type: 'video',        label: 'Video',              group: 'media',       emoji: '▶️', desc: 'Embed YouTube o Vimeo' },
  { type: 'menu',         label: 'Menù ristorante',    group: 'servizi',     emoji: '🍽️', desc: 'Mostra il menù del ristorante (categorie, piatti, prezzi, allergeni) — si configura nella tab Menu' },
  { type: 'services',     label: 'Servizi',            group: 'servizi',     emoji: '🛎️', desc: 'Lista servizi dell\'entità' },
  { type: 'activities',   label: 'Attività',           group: 'servizi',     emoji: '🧭', desc: 'Attività prenotabili' },
  { type: 'excursions',   label: 'Escursioni',         group: 'servizi',     emoji: '🗺️', desc: 'Escursioni disponibili' },
  { type: 'eventi',       label: 'Prossimi eventi',    group: 'servizi',     emoji: '📅', desc: 'Lista eventi in programma' },
  { type: 'news',         label: 'Articoli / News',    group: 'servizi',     emoji: '📰', desc: 'Ultimi articoli del blog' },
  { type: 'booking',      label: 'Widget prenotazione',group: 'conversione', emoji: '📆', desc: 'Form prenotazione risorse' },
  { type: 'newsletter',   label: 'Newsletter',         group: 'conversione', emoji: '✉️', desc: 'Form iscrizione newsletter' },
  { type: 'show_map',     label: 'Solo mappa',         group: 'conversione', emoji: '📍', desc: 'Google Maps embed' },
  { type: 'form_builder', label: 'Form contatti',      group: 'conversione', emoji: '📋', desc: 'Form per raccogliere contatti e richieste — scrive nel CRM. Crea e personalizza i form nel Form Builder.' },
]

export const BLOCK_DEFAULTS = {
  hero:         { title: '', tagline: '', bg_image_url: '', overlay_opacity: 0.5, cta1_text: 'Scopri di più', cta1_url: '', cta2_text: '', cta2_url: '', height: 'large' },
  hero_slider:  { slides: [], autoplay: true, interval: 6, height: 'full', overlay_opacity: 0.45, text_align: 'center' },
  colonne:      { titolo: '', columns: 2, items: [] },
  divisore:     { variant: 'space', size: 'medium' },
  annuncio:     { text: '', link_text: '', link_url: '', bg: 'primary' },
  accordion:    { titolo: '', items: [] },
  social:       { titolo: '', items: [] },
  countdown:    { titolo: '', sottotitolo: '', target: '' },
  before_after: { before_url: '', after_url: '', before_label: 'Prima', after_label: 'Dopo' },
  embed:        { html: '', height: 400 },
  about:        { title: '', text: '' },
  pulsante:     { text: 'Scopri di più', url: '', style: 'filled', size: 'medium', align: 'center' },
  foto_testo:   { title: '', text: '', image_url: '', inverti: false, button_label: '', button_url: '' },
  paragrafi:    { titolo: '', items: [] },
  team:         { titolo: '', items: [] },
  steps:        { titolo: '', items: [] },
  highlights:   { titolo: '', items: [] },
  stats:        { titolo: '', items: [] },
  cta_banner:   { title: '', subtitle: '', button_text: 'Scopri di più', button_url: '' },
  testimonianze:{ titolo: '', items: [] },
  promozioni:   { titolo: '', items: [] },
  pacchetti:    { titolo: '', items: [] },
  faq:          { titolo: '', items: [] },
  clienti:      { titolo: 'I nostri clienti', items: [] },
  carosello:    { titolo: '', items: [], per_view: 3, autoplay: true, interval: 5, show_arrows: true, show_dots: true },
  immagine:     { image_url: '', alt: '', caption: '', link_url: '', width: 'large' },
  galleria_immagini: { titolo: '', images: [], columns: 3 },
  gallery:      {},
  video:        { url: '' },
  menu:         { titolo: '' },
  services:     {},
  activities:   {},
  excursions:   {},
  eventi:       {},
  news:         {},
  booking:      {},
  newsletter:   { title: '', subtitle: '' },
  show_map:     {},
  form_builder: { form_token: '', titolo_sezione: '' },
}

// ── Stile per-blocco (Fase 0) ───────────────────────────────────────────────
// Schema: block.style = { bg, paddingY }. Tutto opzionale e retrocompatibile:
// un blocco senza `style` rende esattamente come prima. Valori da whitelist
// (niente colore/HTML arbitrario nel DOM). Sfondo limitato a tinte CHIARE così
// il testo scuro dei blocchi resta sempre leggibile; lo sfondo scuro/colorato
// arriverà quando i contenuti useranno colori ereditati (fase successiva).
export const BLOCK_BG = { default: null, white: '#ffffff', light: '#fafafa', muted: '#f4f4f7', dark: '#14141f' }
export const BLOCK_BG_OPTIONS = [
  { key: 'default', label: 'Predefinito' },
  { key: 'white',   label: 'Bianco' },
  { key: 'light',   label: 'Grigio chiaro' },
  { key: 'muted',   label: 'Grigio' },
  { key: 'dark',    label: 'Scuro' },
  { key: 'primary', label: 'Colore tema' },
  { key: 'gradient',label: 'Gradiente' },
  { key: 'image',   label: 'Immagine' },
]
// Risolve lo sfondo di una sezione dallo style + tema. Ritorna { background, inverted }.
// inverted = testo da schiarire (fondo scuro/immagine). 'primary' invertito solo se il
// colore tema è scuro. 'image' usa bg_image + velo scuro (overlay 0-0.85).
export function resolveBlockBg(style, primary, secondary) {
  const st = style || {}
  if (st.bg === 'primary') {
    const p = primary || '#1a1a2e'
    return { background: p, inverted: contrastRatio('#ffffff', p) >= 3 }
  }
  if (st.bg === 'gradient') {
    const a = primary || '#1a1a2e'
    const b = secondary || primary || '#1a1a2e'
    return { background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`, inverted: contrastRatio('#ffffff', a) >= 3 }
  }
  if (st.bg === 'image') {
    if (!st.bg_image) return { background: null, inverted: false }
    const ov = st.bg_overlay ?? 0.5
    return { background: `linear-gradient(rgba(0,0,0,${ov}),rgba(0,0,0,${ov})), url("${st.bg_image}") center/cover no-repeat`, inverted: true }
  }
  const solid = BLOCK_BG[st.bg]
  if (!solid) return { background: null, inverted: false }
  return { background: solid, inverted: contrastRatio('#ffffff', solid) >= 4.5 }
}
// px verticali; null = non toccare (mantiene la spaziatura nativa del blocco)
export const BLOCK_PADY = { default: null, none: 0, compact: 40, spacious: 96, xl: 128 }
export const BLOCK_PADY_OPTIONS = [
  { key: 'default',  label: 'Predefinita' },
  { key: 'none',     label: 'Nessuna' },
  { key: 'compact',  label: 'Compatta' },
  { key: 'spacious', label: 'Ampia' },
  { key: 'xl',       label: 'Extra' },
]
// Blocchi con testo chiaro / sfondo intenzionalmente scuro: niente controllo sfondo
// (un fondo chiaro renderebbe il testo illeggibile).
export const BG_EXCLUDED_TYPES = ['hero', 'hero_slider', 'stats', 'cta_banner', 'video', 'divisore', 'annuncio', 'menu', 'embed', 'before_after']
export function blockSupportsBg(type) { return !BG_EXCLUDED_TYPES.includes(type) }

// ── Tipografia per-blocco (Fase 1.5) — solo blocchi con rich-text ────────────
// Dimensione: scala applicata al fontSize base del blocco (preset, no px liberi).
export const BLOCK_TEXT_SIZE = { normal: 1, small: 0.88, large: 1.18 }
export const BLOCK_TEXT_SIZE_OPTIONS = [
  { key: 'normal', label: 'Normale' },
  { key: 'small',  label: 'Piccolo' },
  { key: 'large',  label: 'Grande' },
]
export function textSizeScale(key) { return BLOCK_TEXT_SIZE[key] || 1 }

// Colore: palette ristretta ('primary' risolto a runtime dal tema). Niente picker libero.
export const BLOCK_TEXT_COLOR_OPTIONS = [
  { key: 'default', label: 'Predefinito' },
  { key: 'dark',    label: 'Scuro' },
  { key: 'grey',    label: 'Grigio' },
  { key: 'primary', label: 'Colore tema' },
]
export function textColorFor(key, primary) {
  if (key === 'dark') return '#1a1a2e'
  if (key === 'grey') return '#666'
  if (key === 'primary') return primary
  return null
}

// ── Contrasto colori (WCAG) ──────────────────────────────────────────────────
// Serve a non far sparire un testo colorato col tema su uno sfondo dello stesso
// tono (es. numeri primary su banda scura quando primary È scuro).
function relLuminance(hex) {
  const h = String(hex || '').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  const n = parseInt(full, 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
// Rapporto di contrasto WCAG tra due hex (1 = identico, 21 = max).
export function contrastRatio(a, b) {
  const la = relLuminance(a), lb = relLuminance(b)
  if (la == null || lb == null) return 21
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}
// `color` se contrasta a sufficienza con `bg`, altrimenti `fallback`.
export function readableOn(color, bg, fallback = '#fff') {
  return contrastRatio(color, bg) >= 3 ? color : fallback
}

// Blocchi con campo rich-text: mostrano dimensione/colore testo nel pannello stile.
export function blockHasText(type) { return type === 'about' || type === 'foto_testo' }

// Spezza una shorthand CSS `padding` (1-4 valori) nei 4 lati.
function parsePadding(p) {
  if (p == null) return { top: '0', right: '0', bottom: '0', left: '0' }
  const a = String(p).trim().split(/\s+/)
  if (a.length === 1) return { top: a[0], right: a[0], bottom: a[0], left: a[0] }
  if (a.length === 2) return { top: a[0], right: a[1], bottom: a[0], left: a[1] }
  if (a.length === 3) return { top: a[0], right: a[1], bottom: a[2], left: a[1] }
  return { top: a[0], right: a[1], bottom: a[2], left: a[3] }
}

// Fase 0 — applica block.style (sfondo + spaziatura) all'unica <section> di un blocco
// via cloneElement, senza riscrivere i singoli case dei renderer. Additivo: se non
// c'è style o non ci sono override validi, ritorna l'elemento immutato. Condiviso da
// PaginaPage (sotto-pagine) e LandingBlockRenderer (home) per evitare duplicazione.
export function blockInverted(block, primary, secondary) {
  if (!block?.style || !blockSupportsBg(block.type)) return false
  return resolveBlockBg(block.style, primary, secondary).inverted
}

export function applyBlockStyle(el, block, opts = {}) {
  if (!el || !block?.style) return el
  const st = block.style
  const ov = {}
  let inverted = false
  if (blockSupportsBg(block.type)) {
    const r = resolveBlockBg(st, opts.primary, opts.secondary)
    if (r.background) { ov.background = r.background; inverted = r.inverted }
  }
  const pad = BLOCK_PADY[st.paddingY]
  const hasPad = st.paddingY && st.paddingY !== 'default' && pad != null
  const classes = []
  if (inverted) classes.push('lbr-inv')
  if (st.hide_mobile) classes.push('lbr-hide-mob')
  if (st.hide_desktop) classes.push('lbr-hide-desk')
  if (st.align === 'left' || st.align === 'center' || st.align === 'right') classes.push('lbr-al-' + st.align)
  if (!Object.keys(ov).length && !hasPad && !classes.length) return el
  const base = { ...(el.props.style || {}) }
  if (hasPad) {
    // preserva la spaziatura orizzontale nativa, sovrascrive solo la verticale
    const cur = parsePadding(base.padding)
    delete base.padding
    if (base.paddingLeft == null) base.paddingLeft = cur.left
    if (base.paddingRight == null) base.paddingRight = cur.right
    ov.paddingTop = `${pad}px`
    ov.paddingBottom = `${pad}px`
  }
  const props = { style: { ...base, ...ov } }
  if (classes.length) props.className = ((el.props.className || '') + ' ' + classes.join(' ')).trim()
  return cloneElement(el, props)
}

// ── Configurazione blocchi auto-entità (Fase 5) ──────────────────────────────
// Blocchi a griglia di item dell'entità che accettano titolo/sottotitolo/limite/colonne.
export const GRID_AUTO_BLOCKS = ['services', 'activities', 'excursions', 'eventi', 'news', 'gallery']
export const BLOCK_COLUMNS_OPTIONS = [
  { key: '',  label: 'Automatiche' },
  { key: '2', label: '2 colonne' },
  { key: '3', label: '3 colonne' },
  { key: '4', label: '4 colonne' },
]
// min px per colonna scelta: l'auto-fill ne mette quante ne stanno → su desktop ~N,
// su mobile collassa da solo (il min(100%, …) garantisce 1 colonna sui telefoni).
const GRID_COL_MIN = { '2': 480, '3': 320, '4': 240 }
export function gridTemplate(columns, defaultMinPx = 260) {
  const px = GRID_COL_MIN[String(columns)] || defaultMinPx
  return `repeat(auto-fill, minmax(min(100%, ${px}px), 1fr))`
}

export function blockLabel(type) {
  return BLOCK_TYPES.find(b => b.type === type)?.label || type
}
export function blockEmoji(type) {
  return BLOCK_TYPES.find(b => b.type === type)?.emoji || '📄'
}
