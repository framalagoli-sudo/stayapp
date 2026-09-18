// Font del sito — FONTE UNICA per le 3 pagine Tema, il FontPairPicker e altrove.
// Le chiavi corrispondono a quelle usate nei selettori (theme.fontHeading/fontBody)
// e nelle famiglie caricate dai renderer guest.

export const HEADING_FONTS = [
  { key: 'playfair',   label: 'Playfair Display',  family: "'Playfair Display', Georgia, serif",    desc: 'Elegante serif' },
  { key: 'cormorant',  label: 'Cormorant Garamond', family: "'Cormorant Garamond', Georgia, serif", desc: 'Lusso raffinato' },
  { key: 'raleway',    label: 'Raleway',           family: "'Raleway', system-ui, sans-serif",      desc: 'Geometrico slim' },
  { key: 'montserrat', label: 'Montserrat',        family: "'Montserrat', system-ui, sans-serif",   desc: 'Moderno forte' },
  { key: 'nunito',     label: 'Nunito',            family: "'Nunito', system-ui, sans-serif",       desc: 'Friendly rotondo' },
  { key: 'dm-sans',    label: 'DM Sans',           family: "'DM Sans', system-ui, sans-serif",      desc: 'Minimal contemporaneo' },
  // I tre «da titolo grande» (18/09/2026). I sei sopra sono font da testo usati
  // anche nei titoli: restano eleganti, ma a 90px non tengono la scena. Questi
  // sono disegnati per stare enormi e stretti, che è il registro dei siti
  // moderni — quello che Francesco ha portato come riferimento.
  { key: 'space-grotesk', label: 'Space Grotesk',  family: "'Space Grotesk', system-ui, sans-serif", desc: 'Tecnico, spigoloso' },
  { key: 'sora',       label: 'Sora',              family: "'Sora', system-ui, sans-serif",         desc: 'Geometrico deciso' },
  { key: 'unbounded',  label: 'Unbounded',         family: "'Unbounded', system-ui, sans-serif",    desc: 'Display largo, da titolone' },
]
export const BODY_FONTS = [
  { key: 'inter',     label: 'Inter',     family: "'Inter', system-ui, sans-serif",     desc: 'Leggibile, neutro' },
  { key: 'lato',      label: 'Lato',      family: "'Lato', system-ui, sans-serif",      desc: 'Caldo, umano' },
  { key: 'open-sans', label: 'Open Sans', family: "'Open Sans', system-ui, sans-serif", desc: 'Classico digitale' },
]

// Mappe key→family, derivate dalle liste sopra (niente doppia fonte di verità).
export const HEADING_FAMILIES = Object.fromEntries(HEADING_FONTS.map(f => [f.key, f.family]))
export const BODY_FAMILIES = Object.fromEntries(BODY_FONTS.map(f => [f.key, f.family]))
export function getHeadingFamily(key) { return HEADING_FAMILIES[key] || HEADING_FONTS[0].family }
export function getBodyFamily(key)    { return BODY_FAMILIES[key]    || BODY_FONTS[0].family }

// URL Google Fonts con tutte le famiglie (per il caricamento nell'admin).
export const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Lato:wght@400;600&family=Open+Sans:wght@400;600&family=Playfair+Display:wght@400;600&family=Cormorant+Garamond:wght@400;600&family=Raleway:wght@400;600&family=Montserrat:wght@400;600&family=Nunito:wght@400;600&family=DM+Sans:wght@400;600&family=Space+Grotesk:wght@400;600;700&family=Sora:wght@400;600;700&family=Unbounded:wght@400;600;700&display=swap'

// Il foglio di stile di UNA famiglia, per caricarla solo quando serve.
//
// ⚠️ Questa mappa era **copiata in sei componenti** (le tre landing, le tre app
// del QR) più PropertyPage: aggiungere un font voleva dire toccarli tutti e
// dimenticarne uno — e un font dimenticato non dà errore, mostra un altro
// carattere. Da qui in poi si aggiunge una riga sola, qui.
export const FONT_CSS_URLS = {
  playfair:   'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  cormorant:  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap',
  raleway:    'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap',
  montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
  nunito:     'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
  'dm-sans':  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap',
  'space-grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap',
  sora:       'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap',
  unbounded:  'https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800&display=swap',
  inter:      'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  lato:       'https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700&display=swap',
  'open-sans':'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
}

// Aggiunge al documento il foglio di una famiglia, una volta sola.
export function caricaFont(key) {
  if (typeof document === 'undefined' || !key || !FONT_CSS_URLS[key]) return
  const id = `gfont-${key}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = FONT_CSS_URLS[key]
  document.head.appendChild(link)
}

// Abbinamenti curati (heading + body): l'utente sceglie un'identità già armoniosa,
// invece di accoppiare a mano due font con il rischio di combinazioni brutte.
export const FONT_PAIRS = [
  { key: 'elegante',  label: 'Elegante',  heading: 'playfair',   body: 'lato',      vibe: 'Classico e curato' },
  { key: 'raffinato', label: 'Raffinato', heading: 'cormorant',  body: 'open-sans', vibe: 'Lusso sobrio' },
  { key: 'moderno',   label: 'Moderno',   heading: 'montserrat', body: 'inter',     vibe: 'Deciso e pulito' },
  { key: 'minimal',   label: 'Minimal',   heading: 'dm-sans',    body: 'inter',     vibe: 'Contemporaneo essenziale' },
  { key: 'friendly',  label: 'Friendly',  heading: 'nunito',     body: 'open-sans', vibe: 'Caldo e accogliente' },
  { key: 'pulito',    label: 'Pulito',    heading: 'raleway',    body: 'inter',     vibe: 'Slim e arioso' },
  { key: 'tecnico',   label: 'Tecnico',   heading: 'space-grotesk', body: 'inter',  vibe: 'Digitale, spigoloso' },
  { key: 'audace',    label: 'Audace',    heading: 'sora',       body: 'inter',     vibe: 'Titoli grandi, sicuri' },
  { key: 'display',   label: 'Display',   heading: 'unbounded',  body: 'inter',     vibe: 'Titolone da agenzia' },
]
