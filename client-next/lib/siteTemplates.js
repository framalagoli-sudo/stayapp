// Template di sito curati (Fase A galleria template). Set in codice: struttura
// blocchi + stile (tema). I contenuti sono d'esempio realistici; in Fase B l'AI
// li adatta al business del cliente. Gli items NON hanno id qui: glieli assegna
// la route "apply" (come fa l'AI builder con addItemIds).
//
// Forme blocco: vedi BLOCK_DEFAULTS in lib/blockTypes.js. Tipi usati qui (validati
// su home reali): hero, about, foto_testo, highlights, stats, steps, faq, cta_banner.

export const SITE_TEMPLATES = [
  {
    id: 'vetrina-elegante',
    nome: 'Vetrina Elegante',
    descrizione: 'Editoriale e raffinato. Atmosfera e brand identity prima di tutto.',
    settori: ['hotel', 'ristorante', 'beauty', 'vetrina'],
    obiettivi: ['vetrina', 'portfolio'],
    theme: { primaryColor: '#1a1a2e', bgColor: '#ffffff', textColor: '#1a1a2e', fontHeading: 'playfair', fontBody: 'inter', borderStyle: 'mixed' },
    blocks: [
      { type: 'hero_slider', data: { height: 'full', autoplay: true, interval: 6, overlay_opacity: 0.45, text_align: 'center', slides: [
        { image_query: 'elegant interior warm light', title: 'Benvenuto', subtitle: 'Un’esperienza che ricorderai', cta1_text: 'Scopri di più', cta1_url: '' },
        { image_query: 'refined table setting ambiance', title: 'Atmosfera unica', subtitle: 'Ogni dettaglio è pensato per te', cta1_text: '', cta1_url: '' },
        { image_query: 'luxury lifestyle detail', title: 'Ti aspettiamo', subtitle: 'Vieni a scoprirci di persona', cta1_text: 'Contattaci', cta1_url: '' },
      ] } },
      { type: 'about', data: { title: 'La nostra storia', text: 'Racconta chi sei, da dove vieni e cosa ti rende unico. Poche righe sincere valgono più di mille parole.' } },
      { type: 'foto_testo', data: { title: 'Cosa ci distingue', text: 'Descrivi un punto di forza con un’immagine evocativa accanto.', image_query: 'artisan craftsmanship detail', inverti: false, button_label: '', button_url: '' } },
      { type: 'foto_testo', data: { title: 'La cura dei dettagli', text: 'Un secondo blocco, immagine sul lato opposto, per dare ritmo alla pagina.', image_query: 'cozy elegant atmosphere', inverti: true, button_label: '', button_url: '' } },
      { type: 'stats', data: { titolo: '', items: [{ value: '10+', label: 'Anni di esperienza' }, { value: '500+', label: 'Clienti felici' }, { value: '4.9', label: 'Valutazione media' }] } },
      { type: 'faq', data: { titolo: 'Domande frequenti', items: [{ question: 'Come vi contatto?', answer: 'Trovi tutti i recapiti in fondo alla pagina.' }, { question: 'Dove vi trovate?', answer: 'Indica qui la tua posizione e come raggiungerti.' }] } },
      { type: 'cta_banner', data: { title: 'Ti aspettiamo', subtitle: 'Mettiti in contatto con noi', button_text: 'Contattaci', button_url: '' } },
    ],
  },
  {
    id: 'servizi-pro',
    nome: 'Servizi Pro',
    descrizione: 'Chiaro e orientato alla conversione. Benefici, processo e fiducia.',
    settori: ['studio', 'agenzia', 'medico', 'palestra', 'servizi'],
    obiettivi: ['lead_gen', 'prenotazioni'],
    theme: { primaryColor: '#0891b2', bgColor: '#ffffff', textColor: '#1a1a2e', fontHeading: 'montserrat', fontBody: 'inter', borderStyle: 'rounded' },
    blocks: [
      { type: 'hero_slider', data: { height: 'full', autoplay: true, interval: 6, overlay_opacity: 0.5, text_align: 'center', slides: [
        { image_query: 'modern bright office workspace', title: 'Il servizio che cercavi', subtitle: 'Professionale, semplice, affidabile', cta1_text: 'Richiedi info', cta1_url: '' },
        { image_query: 'business handshake meeting', title: 'Al tuo fianco', subtitle: 'Competenza e ascolto, sempre', cta1_text: '', cta1_url: '' },
        { image_query: 'team collaboration office', title: 'Risultati che contano', subtitle: 'Lavoriamo per i tuoi obiettivi', cta1_text: 'Contattaci', cta1_url: '' },
      ] } },
      { type: 'highlights', data: { titolo: 'Perché sceglierci', items: [{ icon: 'check-circle', text: 'Esperienza comprovata sul campo' }, { icon: 'clock', text: 'Risposte rapide e tempi certi' }, { icon: 'heart', text: 'Assistenza dedicata e continua' }] } },
      { type: 'steps', data: { titolo: 'Come funziona', items: [{ icon: 'phone', text: 'Ci contatti e ci racconti cosa ti serve' }, { icon: 'calendar', text: 'Fissiamo un appuntamento' }, { icon: 'check', text: 'Ti seguiamo passo passo' }] } },
      { type: 'stats', data: { titolo: '', items: [{ value: '1.000+', label: 'Clienti seguiti' }, { value: '15', label: 'Anni di attività' }, { value: '98%', label: 'Soddisfatti' }] } },
      { type: 'faq', data: { titolo: 'Domande frequenti', items: [{ question: 'Quanto costa?', answer: 'Indica qui le informazioni su prezzi e preventivi.' }, { question: 'Quanto tempo serve?', answer: 'Spiega i tempi tipici del tuo servizio.' }] } },
      { type: 'cta_banner', data: { title: 'Parliamone', subtitle: 'Il primo contatto è gratuito', button_text: 'Richiedi una consulenza', button_url: '' } },
    ],
  },
  {
    id: 'evento',
    nome: 'Evento',
    descrizione: 'Per lanciare un evento: data, programma, iscrizione.',
    settori: ['evento', 'vetrina'],
    obiettivi: ['evento'],
    theme: { primaryColor: '#e63946', bgColor: '#ffffff', textColor: '#1a1a2e', fontHeading: 'raleway', fontBody: 'lato', borderStyle: 'mixed' },
    blocks: [
      { type: 'hero_slider', data: { height: 'full', autoplay: true, interval: 6, overlay_opacity: 0.5, text_align: 'center', slides: [
        { image_query: 'event audience celebration crowd', title: 'Il nome del tuo evento', subtitle: 'Data e luogo — non mancare!', cta1_text: 'Iscriviti ora', cta1_url: '' },
        { image_query: 'conference stage lights', title: 'Un’esperienza da vivere', subtitle: 'Momenti che ricorderai', cta1_text: '', cta1_url: '' },
        { image_query: 'people networking party', title: 'Unisciti a noi', subtitle: 'Posti limitati', cta1_text: 'Iscriviti', cta1_url: '' },
      ] } },
      { type: 'about', data: { title: 'Di cosa si tratta', text: 'Racconta in breve cos’è l’evento, a chi è rivolto e perché vale la pena partecipare.' } },
      { type: 'steps', data: { titolo: 'Il programma', items: [{ icon: 'clock', text: 'Accoglienza e registrazione' }, { icon: 'star', text: 'Momento clou dell’evento' }, { icon: 'coffee', text: 'Networking e saluti finali' }] } },
      { type: 'highlights', data: { titolo: 'Perché partecipare', items: [{ icon: 'users', text: 'Incontra persone come te' }, { icon: 'award', text: 'Contenuti di valore' }, { icon: 'gift', text: 'Sorprese per i partecipanti' }] } },
      { type: 'faq', data: { titolo: 'Informazioni utili', items: [{ question: 'Dove si svolge?', answer: 'Indica indirizzo e come arrivare.' }, { question: 'Quanto costa?', answer: 'Specifica se è gratuito o il costo di iscrizione.' }] } },
      { type: 'cta_banner', data: { title: 'Posti limitati', subtitle: 'Assicurati il tuo posto', button_text: 'Iscriviti', button_url: '' } },
    ],
  },
]

export function getTemplate(id) {
  return SITE_TEMPLATES.find(t => t.id === id) || null
}
