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
  // Le famiglie che mancavano (13/10/2026): un serif editoriale, uno «pieno»,
  // uno sottile, due stretti e alti da locandina, tre grotteschi con carattere.
  // Ognuno porta `titoli`: come vanno composti i titoli con QUEL carattere
  // (peso, spazio fra le lettere, maiuscolo). È metà del lavoro di
  // un'accoppiata: un Bebas in minuscolo a peso 700 non è un Bebas.
  // I nove sopra non lo hanno, e i siti che li usano restano come sono.
  { key: 'fraunces',   label: 'Fraunces',          family: "'Fraunces', Georgia, serif",            desc: 'Serif editoriale, caldo',    titoli: { peso: 600, spazio: '-0.02em' } },
  { key: 'dm-serif',   label: 'DM Serif Display',  family: "'DM Serif Display', Georgia, serif",    desc: 'Serif pieno, da rivista',    titoli: { peso: 400, spazio: '-0.01em' }, unPeso: true },
  { key: 'instrument-serif', label: 'Instrument Serif', family: "'Instrument Serif', Georgia, serif", desc: 'Serif sottile, ricercato', titoli: { peso: 400, spazio: '-0.015em' }, unPeso: true },
  { key: 'oswald',     label: 'Oswald',            family: "'Oswald', 'Arial Narrow', sans-serif",  desc: 'Stretto, da insegna',        titoli: { peso: 600, spazio: '0.01em', maiuscolo: true } },
  { key: 'bebas',      label: 'Bebas Neue',        family: "'Bebas Neue', 'Arial Narrow', sans-serif", desc: 'Maiuscolo alto, da locandina', titoli: { peso: 400, spazio: '0.02em', maiuscolo: true }, unPeso: true },
  { key: 'manrope',    label: 'Manrope',           family: "'Manrope', system-ui, sans-serif",      desc: 'Geometrico, compatto',       titoli: { peso: 800, spazio: '-0.03em' } },
  { key: 'bricolage',  label: 'Bricolage Grotesque', family: "'Bricolage Grotesque', system-ui, sans-serif", desc: 'Vivace, artigianale', titoli: { peso: 700, spazio: '-0.03em' } },
  { key: 'syne',       label: 'Syne',              family: "'Syne', system-ui, sans-serif",         desc: 'Largo, da galleria d\'arte', titoli: { peso: 800, spazio: '-0.02em' } },
]
export const BODY_FONTS = [
  { key: 'inter',     label: 'Inter',     family: "'Inter', system-ui, sans-serif",     desc: 'Leggibile, neutro' },
  { key: 'lato',      label: 'Lato',      family: "'Lato', system-ui, sans-serif",      desc: 'Caldo, umano' },
  { key: 'open-sans', label: 'Open Sans', family: "'Open Sans', system-ui, sans-serif", desc: 'Classico digitale' },
  // Prima c'erano solo i tre sopra, tutti senza grazie e neutri: cambiava il
  // titolo e il resto della pagina restava uguale.
  { key: 'dm-sans',   label: 'DM Sans',   family: "'DM Sans', system-ui, sans-serif",   desc: 'Geometrico, attuale' },
  { key: 'manrope',   label: 'Manrope',   family: "'Manrope', system-ui, sans-serif",   desc: 'Compatto, tecnico' },
  { key: 'work-sans', label: 'Work Sans', family: "'Work Sans', system-ui, sans-serif", desc: 'Aperto, da editoria' },
  { key: 'karla',     label: 'Karla',     family: "'Karla', system-ui, sans-serif",     desc: 'Con un po\' di carattere' },
  { key: 'source-serif', label: 'Source Serif', family: "'Source Serif 4', Georgia, serif", desc: 'Con le grazie, da libro' },
  { key: 'lora',      label: 'Lora',      family: "'Lora', Georgia, serif",             desc: 'Con le grazie, morbido' },
]

// Mappe key→family, derivate dalle liste sopra (niente doppia fonte di verità).
export const HEADING_FAMILIES = Object.fromEntries(HEADING_FONTS.map(f => [f.key, f.family]))
export const BODY_FAMILIES = Object.fromEntries(BODY_FONTS.map(f => [f.key, f.family]))
export function getHeadingFamily(key) { return HEADING_FAMILIES[key] || HEADING_FONTS[0].family }
export function getBodyFamily(key)    { return BODY_FAMILIES[key]    || BODY_FONTS[0].family }
// Come si compongono i titoli con un certo carattere: `{ peso, spazio, maiuscolo, unPeso }`,
// oppure null (i caratteri di sempre: nessuna regola in più). Si può chiedere
// per chiave o per famiglia, perché ai blocchi del sito arriva la famiglia.
export function stileTitoli(chiaveOFamiglia) {
  const c = HEADING_FONTS.find(x => x.key === chiaveOFamiglia || x.family === chiaveOFamiglia)
  return c?.titoli ? { ...c.titoli, unPeso: !!c.unPeso } : null
}


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
  fraunces:   'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&display=swap',
  'dm-serif': 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
  'instrument-serif': 'https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap',
  oswald:     'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap',
  bebas:      'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  manrope:    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap',
  bricolage:  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&display=swap',
  syne:       'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap',
  'work-sans':'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&display=swap',
  karla:      'https://fonts.googleapis.com/css2?family=Karla:wght@400;600;700&display=swap',
  'source-serif': 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&display=swap',
  lora:       'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap',
}

// Tutte le famiglie in un foglio solo, per le pagine del pannello che le
// mostrano insieme (scelta dei caratteri, anteprime). Si ricava dall'elenco
// sopra: gli stessi pesi che carica il sito, così un'anteprima non mostra un
// grassetto finto.
export const FONTS_URL = 'https://fonts.googleapis.com/css2?' + Object.values(FONT_CSS_URLS).map(u => u.match(/family=[^&]+/)[0]).join('&') + '&display=swap'

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
  { key: 'editoriale', label: 'Editoriale', heading: 'fraunces',  body: 'inter',        vibe: 'Da rivista, caldo e attuale' },
  { key: 'rivista',   label: 'Rivista',   heading: 'dm-serif',   body: 'dm-sans',      vibe: 'Titoli pieni, testo pulito' },
  { key: 'atelier',   label: 'Atelier',   heading: 'instrument-serif', body: 'manrope', vibe: 'Sottile e ricercato' },
  { key: 'letterario', label: 'Letterario', heading: 'playfair',  body: 'source-serif', vibe: 'Tutto con le grazie, da libro' },
  { key: 'locandina', label: 'Locandina', heading: 'bebas',      body: 'work-sans',    vibe: 'Maiuscolo alto e stretto' },
  { key: 'officina',  label: 'Officina',  heading: 'oswald',     body: 'lato',         vibe: 'Solido, da insegna' },
  { key: 'studio',    label: 'Studio',    heading: 'manrope',    body: 'manrope',      vibe: 'Un carattere solo, pesi diversi' },
  { key: 'bottega',   label: 'Bottega',   heading: 'bricolage',  body: 'karla',        vibe: 'Artigianale e vivace' },
  { key: 'galleria',  label: 'Galleria',  heading: 'syne',       body: 'work-sans',    vibe: 'Largo e deciso, da mostra' },
]
