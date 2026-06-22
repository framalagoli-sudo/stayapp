// Font del sito — fonte condivisa per le 3 pagine Tema e il FontPairPicker.
// Le chiavi corrispondono a quelle già usate nei selettori (theme.fontHeading/fontBody)
// e nelle famiglie caricate dai renderer guest.

export const HEADING_FAMILIES = {
  playfair:   "'Playfair Display', Georgia, serif",
  cormorant:  "'Cormorant Garamond', Georgia, serif",
  raleway:    "'Raleway', system-ui, sans-serif",
  montserrat: "'Montserrat', system-ui, sans-serif",
  nunito:     "'Nunito', system-ui, sans-serif",
  'dm-sans':  "'DM Sans', system-ui, sans-serif",
}
export const BODY_FAMILIES = {
  inter:       "'Inter', system-ui, sans-serif",
  lato:        "'Lato', system-ui, sans-serif",
  'open-sans': "'Open Sans', system-ui, sans-serif",
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
]
