export const BLOCK_GROUPS = [
  { key: 'layout',      label: 'Testo & Layout' },
  { key: 'marketing',   label: 'Marketing' },
  { key: 'media',       label: 'Media' },
  { key: 'servizi',     label: 'Contenuti entità' },
  { key: 'conversione', label: 'Conversione' },
]

export const BLOCK_TYPES = [
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
  { type: 'gallery',      label: 'Galleria foto',      group: 'media',       emoji: '🖼', desc: 'Griglia foto dell\'entità' },
  { type: 'video',        label: 'Video',              group: 'media',       emoji: '▶️', desc: 'Embed YouTube o Vimeo' },
  { type: 'services',     label: 'Servizi',            group: 'servizi',     emoji: '🛎️', desc: 'Lista servizi dell\'entità' },
  { type: 'activities',   label: 'Attività',           group: 'servizi',     emoji: '🧭', desc: 'Attività prenotabili' },
  { type: 'excursions',   label: 'Escursioni',         group: 'servizi',     emoji: '🗺️', desc: 'Escursioni disponibili' },
  { type: 'eventi',       label: 'Prossimi eventi',    group: 'servizi',     emoji: '📅', desc: 'Lista eventi in programma' },
  { type: 'news',         label: 'Articoli / News',    group: 'servizi',     emoji: '📰', desc: 'Ultimi articoli del blog' },
  { type: 'booking',      label: 'Widget prenotazione',group: 'conversione', emoji: '📆', desc: 'Form prenotazione risorse' },
  { type: 'newsletter',   label: 'Newsletter',         group: 'conversione', emoji: '✉️', desc: 'Form iscrizione newsletter' },
  { type: 'contatti',     label: 'Form contatti',      group: 'conversione', emoji: '📩', desc: 'Modulo contatto con mappa' },
  { type: 'show_map',     label: 'Solo mappa',         group: 'conversione', emoji: '📍', desc: 'Google Maps embed' },
  { type: 'form_builder', label: 'Form personalizzato',group: 'conversione', emoji: '📋', desc: 'Form creato con il Form Builder → scrive in Contatti' },
]

export const BLOCK_DEFAULTS = {
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
  gallery:      {},
  video:        { url: '' },
  services:     {},
  activities:   {},
  excursions:   {},
  eventi:       {},
  news:         {},
  booking:      {},
  newsletter:   { title: '', subtitle: '' },
  contatti:     {},
  show_map:     {},
  form_builder: { form_token: '', titolo_sezione: '' },
}

export function blockLabel(type) {
  return BLOCK_TYPES.find(b => b.type === type)?.label || type
}
export function blockEmoji(type) {
  return BLOCK_TYPES.find(b => b.type === type)?.emoji || '📄'
}
