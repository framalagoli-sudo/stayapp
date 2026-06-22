'use client'
import { cloneElement } from 'react'

export const BLOCK_GROUPS = [
  { key: 'layout',      label: 'Testo & Layout' },
  { key: 'marketing',   label: 'Marketing' },
  { key: 'media',       label: 'Media' },
  { key: 'servizi',     label: 'Contenuti entità' },
  { key: 'conversione', label: 'Conversione' },
]

export const BLOCK_TYPES = [
  { type: 'hero',         label: 'Hero / Copertina',   group: 'layout',      emoji: '🌄', desc: 'Sezione full-screen con foto, titolo, tagline e CTA — ideale come primo blocco della homepage' },
  { type: 'about',        label: 'Blocco testo',       group: 'layout',      emoji: '📝', desc: 'Titolo + paragrafo di testo' },
  { type: 'foto_testo',   label: 'Foto + Testo',       group: 'layout',      emoji: '🖼️', desc: 'Immagine affiancata al testo (ripetibile)' },
  { type: 'paragrafi',    label: 'Card paragrafi',     group: 'layout',      emoji: '🗂️', desc: 'Griglia card con icona, titolo, testo' },
  { type: 'team',         label: 'Team',               group: 'layout',      emoji: '👥', desc: 'Card con foto, nome, ruolo, bio' },
  { type: 'steps',        label: 'Steps / Processo',   group: 'layout',      emoji: '🔢', desc: 'Passaggi numerati con icona e testo' },
  { type: 'highlights',   label: 'Highlights',         group: 'marketing',   emoji: '⭐', desc: 'Icona + testo breve, griglia 3 colonne' },
  { type: 'stats',        label: 'Statistiche',        group: 'marketing',   emoji: '📊', desc: 'Banda scura con numeri grandi' },
  { type: 'cta_banner',   label: 'Banner CTA',         group: 'marketing',   emoji: '📣', desc: 'Banda colorata con call to action (ripetibile)' },
  { type: 'testimonianze',label: 'Testimonianze',      group: 'marketing',   emoji: '💬', desc: 'Card recensioni con stelle e autore' },
  { type: 'promozioni',   label: 'Promozioni',         group: 'marketing',   emoji: '🏷️', desc: 'Card offerte con badge e scadenza' },
  { type: 'pacchetti',    label: 'Pacchetti / Prezzi', group: 'marketing',   emoji: '📦', desc: 'Pricing card con inclusi e CTA' },
  { type: 'faq',          label: 'FAQ',                group: 'marketing',   emoji: '❓', desc: 'Accordion domande e risposte' },
  { type: 'clienti',     label: 'Loghi clienti',      group: 'marketing',   emoji: '🏢', desc: 'Carosello infinito di loghi clienti/partner — grigi di default, colorati al hover' },
  { type: 'immagine',     label: 'Immagine',           group: 'media',       emoji: '🖼', desc: 'Immagine singola caricata, con didascalia e link — indipendente dall\'app' },
  { type: 'gallery',      label: 'Galleria foto',      group: 'media',       emoji: '🖼', desc: 'Griglia foto dell\'entità' },
  { type: 'video',        label: 'Video',              group: 'media',       emoji: '▶️', desc: 'Embed YouTube o Vimeo' },
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
  about:        { title: '', text: '' },
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
  immagine:     { image_url: '', alt: '', caption: '', link_url: '', width: 'large' },
  gallery:      {},
  video:        { url: '' },
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
export const BLOCK_BG = { default: null, white: '#ffffff', light: '#fafafa', muted: '#f4f4f7' }
export const BLOCK_BG_OPTIONS = [
  { key: 'default', label: 'Predefinito' },
  { key: 'white',   label: 'Bianco' },
  { key: 'light',   label: 'Grigio chiaro' },
  { key: 'muted',   label: 'Grigio' },
]
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
export const BG_EXCLUDED_TYPES = ['hero', 'stats', 'cta_banner', 'video']
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
export function applyBlockStyle(el, block) {
  if (!el || !block?.style) return el
  const st = block.style
  const ov = {}
  if (blockSupportsBg(block.type) && st.bg && BLOCK_BG[st.bg]) ov.background = BLOCK_BG[st.bg]
  const pad = BLOCK_PADY[st.paddingY]
  const hasPad = st.paddingY && st.paddingY !== 'default' && pad != null
  if (!Object.keys(ov).length && !hasPad) return el
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
  return cloneElement(el, { style: { ...base, ...ov } })
}

export function blockLabel(type) {
  return BLOCK_TYPES.find(b => b.type === type)?.label || type
}
export function blockEmoji(type) {
  return BLOCK_TYPES.find(b => b.type === type)?.emoji || '📄'
}
