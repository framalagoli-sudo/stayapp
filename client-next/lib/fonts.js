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
export const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Lato:wght@400;600&family=Open+Sans:wght@400;600&family=Playfair+Display:wght@400;600&family=Cormorant+Garamond:wght@400;600&family=Raleway:wght@400;600&family=Montserrat:wght@400;600&family=Nunito:wght@400;600&family=DM+Sans:wght@400;600&display=swap'

// Abbinamenti curati (heading + body): l'utente sceglie un'identità già armoniosa,
// invece di accoppiare a mano due font con il rischio di combinazioni brutte.
export const FONT_PAIRS = [
  { key: 'elegante',  label: 'Elegante',  heading: 'playfair',   body: 'lato',      vibe: 'Classico e curato' },
  { key: 'raffinato', label: 'Raffinato', heading: 'cormorant',  body: 'open-sans', vibe: 'Lusso sobrio' },
  { key: 'moderno',   label: 'Moderno',   heading: 'montserrat', body: 'inter',     vibe: 'Deciso e pulito' },
  { key: 'minimal',   label: 'Minimal',   heading: 'dm-sans',    body: 'inter',     vibe: 'Contemporaneo essenziale' },
  { key: 'friendly',  label: 'Friendly',  heading: 'nunito',     body: 'open-sans', vibe: 'Caldo e accogliente' },
  { key: 'pulito',    label: 'Pulito',    heading: 'raleway',    body: 'inter',     vibe: 'Slim e arioso' },
]
