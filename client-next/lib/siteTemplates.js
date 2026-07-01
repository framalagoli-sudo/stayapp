// Template di sito curati — un archetipo per verticale, con DNA diverso (struttura
// blocchi + tema + immagini), non solo skin. I contenuti sono d'esempio realistici;
// l'AI (ai-fill) li adatta al business. Le immagini sono `image_query`: risolte a
// tema da Unsplash in apply/ai-fill/preview (vedi lib/unsplash.js).
//
// Forme blocco: vedi BLOCK_DEFAULTS in lib/blockTypes.js. Gli id di items/slides li
// assegna la route (apply/ai-fill) come per l'AI builder.

export const SITE_TEMPLATES = [
  // ── 1. HOTEL — editoriale / immersivo ──────────────────────────────────────
  {
    id: 'hotel',
    nome: 'Hotel & Ospitalità',
    descrizione: 'Immersivo ed elegante. Atmosfera, camere e prenotazione al centro.',
    settori: ['hotel', 'b&b', 'agriturismo', 'resort'],
    obiettivi: ['vetrina', 'prenotazioni'],
    theme: { primaryColor: '#1a1a2e', bgColor: '#ffffff', textColor: '#1a1a2e', fontHeading: 'playfair', fontBody: 'inter', borderStyle: 'mixed' },
    blocks: [
      { type: 'hero_slider', data: { height: 'full', autoplay: true, interval: 6, overlay_opacity: 0.45, text_align: 'center', slides: [
        { image_query: 'luxury hotel facade evening', title: 'Benvenuto', subtitle: 'Un soggiorno che ricorderai', cta1_text: 'Prenota ora', cta1_url: '' },
        { image_query: 'elegant hotel suite interior', title: 'Camere che accolgono', subtitle: 'Comfort e cura in ogni dettaglio', cta1_text: '', cta1_url: '' },
        { image_query: 'hotel pool sunset', title: 'Momenti di relax', subtitle: 'Prenditi il tempo che meriti', cta1_text: 'Scopri', cta1_url: '' },
      ] } },
      { type: 'about', data: { title: 'La nostra storia', text: 'Racconta chi sei, dove ti trovi e cosa rende speciale la tua ospitalità. Poche righe sincere valgono più di mille parole.' } },
      { type: 'carosello', data: { titolo: 'Le nostre camere', per_view: 3, autoplay: true, interval: 5, show_arrows: true, show_dots: true, items: [
        { image_query: 'hotel double room', title: 'Camera Classic', text: 'Descrivi qui questa tipologia di camera.' },
        { image_query: 'hotel deluxe suite', title: 'Suite Deluxe', text: 'Descrivi qui la tua camera più ampia.' },
        { image_query: 'hotel bathroom luxury', title: 'Comfort', text: 'Metti in evidenza i servizi in camera.' },
        { image_query: 'hotel breakfast table', title: 'Colazione', text: 'La giornata inizia con gusto.' },
      ] } },
      { type: 'foto_testo', data: { title: 'A due passi da tutto', text: 'Descrivi la posizione e cosa si può vivere nei dintorni.', image_query: 'scenic town view italy', inverti: false, button_label: '', button_url: '' } },
      { type: 'stats', data: { titolo: '', items: [{ value: '4.9', label: 'Valutazione ospiti' }, { value: '20+', label: 'Camere' }, { value: '15', label: 'Anni di ospitalità' }] } },
      { type: 'testimonianze', data: { titolo: 'Dicono di noi', items: [
        { author: 'Giulia R.', location: 'Milano', rating: 5, text: 'Un soggiorno perfetto, torneremo sicuramente.' },
        { author: 'Marco T.', location: 'Torino', rating: 5, text: 'Accoglienza impeccabile e camere bellissime.' },
      ] } },
      { type: 'faq', data: { titolo: 'Informazioni utili', items: [
        { question: 'A che ora sono check-in e check-out?', answer: 'Indica qui gli orari.' },
        { question: 'È incluso il parcheggio?', answer: 'Specifica qui i servizi inclusi.' },
      ] } },
      { type: 'cta_banner', data: { title: 'Ti aspettiamo', subtitle: 'Prenota ora il tuo soggiorno', button_text: 'Prenota', button_url: '' } },
    ],
  },

  // ── 2. RISTORANTE — caldo, cucina protagonista ─────────────────────────────
  {
    id: 'ristorante',
    nome: 'Ristorante',
    descrizione: 'Caldo e goloso. La cucina, l’atmosfera e la prenotazione del tavolo.',
    settori: ['ristorante', 'trattoria', 'pizzeria', 'bistrot'],
    obiettivi: ['vetrina', 'prenotazioni'],
    theme: { primaryColor: '#7b2d26', bgColor: '#ffffff', textColor: '#2a1a17', fontHeading: 'cormorant', fontBody: 'lato', borderStyle: 'mixed' },
    blocks: [
      { type: 'hero_slider', data: { height: 'full', autoplay: true, interval: 6, overlay_opacity: 0.5, text_align: 'center', slides: [
        { image_query: 'restaurant warm interior ambiance', title: 'La nostra cucina', subtitle: 'Sapori autentici, ogni giorno', cta1_text: 'Prenota un tavolo', cta1_url: '' },
        { image_query: 'gourmet plated dish', title: 'Materie prime scelte', subtitle: 'Il gusto della qualità', cta1_text: '', cta1_url: '' },
      ] } },
      { type: 'about', data: { title: 'La nostra storia', text: 'Racconta la tua cucina, la tua filosofia e cosa rende unici i tuoi piatti.' } },
      { type: 'foto_testo', data: { title: 'Dalla nostra cucina', text: 'Presenta lo chef, la tradizione o la tua specialità.', image_query: 'chef cooking kitchen', inverti: true, button_label: '', button_url: '' } },
      { type: 'carosello', data: { titolo: 'I nostri piatti', per_view: 3, autoplay: true, interval: 4, show_arrows: true, show_dots: true, items: [
        { image_query: 'italian pasta dish', title: 'Primi', text: 'Descrivi i tuoi primi piatti.' },
        { image_query: 'grilled meat plate', title: 'Secondi', text: 'Le tue proposte di carne e pesce.' },
        { image_query: 'dessert plating', title: 'Dolci', text: 'Un finale indimenticabile.' },
        { image_query: 'wine glasses restaurant', title: 'Cantina', text: 'La selezione di vini.' },
      ] } },
      { type: 'highlights', data: { titolo: 'Perché sceglierci', items: [
        { icon: 'restaurant', text: 'Cucina fresca e stagionale' }, { icon: 'heart', text: 'Ambiente accogliente' }, { icon: 'award', text: 'Ingredienti selezionati' },
      ] } },
      { type: 'testimonianze', data: { titolo: 'Le recensioni', items: [
        { author: 'Anna P.', location: '', rating: 5, text: 'Piatti squisiti e servizio gentilissimo.' },
        { author: 'Luca V.', location: '', rating: 5, text: 'Il posto giusto per una cena speciale.' },
      ] } },
      { type: 'cta_banner', data: { title: 'Prenota il tuo tavolo', subtitle: 'Ti aspettiamo a pranzo e a cena', button_text: 'Prenota ora', button_url: '' } },
    ],
  },

  // ── 3. AZIENDA DI PRODOTTI — showroom / catalogo ───────────────────────────
  {
    id: 'prodotti',
    nome: 'Azienda di prodotti',
    descrizione: 'Vetrina prodotti in stile showroom: gamma, qualità e call to action.',
    settori: ['produzione', 'artigianato', 'negozio', 'e-commerce'],
    obiettivi: ['vetrina', 'lead_gen'],
    theme: { primaryColor: '#2563eb', bgColor: '#ffffff', textColor: '#1a1a2e', fontHeading: 'montserrat', fontBody: 'inter', borderStyle: 'rounded' },
    blocks: [
      { type: 'hero_slider', data: { height: 'large', autoplay: true, interval: 6, overlay_opacity: 0.4, text_align: 'left', slides: [
        { image_query: 'product showcase studio', title: 'I nostri prodotti', subtitle: 'Qualità che si vede e si tocca', cta1_text: 'Scopri la gamma', cta1_url: '' },
        { image_query: 'modern factory production', title: 'Fatto come si deve', subtitle: 'Dalla materia prima al prodotto finito', cta1_text: '', cta1_url: '' },
      ] } },
      { type: 'highlights', data: { titolo: 'Perché i nostri prodotti', items: [
        { icon: 'award', text: 'Qualità certificata' }, { icon: 'check-circle', text: 'Materiali selezionati' }, { icon: 'heart', text: 'Cura artigianale' },
      ] } },
      { type: 'carosello', data: { titolo: 'La nostra gamma', per_view: 3, autoplay: true, interval: 4, show_arrows: true, show_dots: true, items: [
        { image_query: 'product packaging design', title: 'Linea 1', text: 'Descrivi questa linea di prodotti.' },
        { image_query: 'product detail closeup', title: 'Linea 2', text: 'Metti in evidenza un prodotto.' },
        { image_query: 'product flat lay', title: 'Linea 3', text: 'Un’altra proposta della gamma.' },
        { image_query: 'craft product handmade', title: 'Novità', text: 'Le ultime aggiunte.' },
      ] } },
      { type: 'foto_testo', data: { title: 'Qualità in ogni dettaglio', text: 'Racconta il tuo processo produttivo e cosa ti distingue.', image_query: 'quality control manufacturing', inverti: false, button_label: '', button_url: '' } },
      { type: 'stats', data: { titolo: '', items: [{ value: '10k+', label: 'Prodotti venduti' }, { value: '30+', label: 'Referenze' }, { value: '100%', label: 'Made in Italy' }] } },
      { type: 'faq', data: { titolo: 'Domande frequenti', items: [
        { question: 'Fate spedizioni?', answer: 'Indica qui modalità e tempi.' },
        { question: 'Posso richiedere un preventivo?', answer: 'Spiega come richiedere informazioni.' },
      ] } },
      { type: 'cta_banner', data: { title: 'Scopri tutta la gamma', subtitle: 'Contattaci per informazioni e preventivi', button_text: 'Contattaci', button_url: '' } },
    ],
  },

  // ── 4. AZIENDA DI SERVIZI — conversione ────────────────────────────────────
  {
    id: 'servizi',
    nome: 'Azienda di servizi',
    descrizione: 'Chiaro e orientato al contatto. Benefici, processo e fiducia.',
    settori: ['servizi', 'agenzia', 'impresa', 'consulenza'],
    obiettivi: ['lead_gen', 'prenotazioni'],
    theme: { primaryColor: '#0891b2', bgColor: '#ffffff', textColor: '#1a1a2e', fontHeading: 'dm-sans', fontBody: 'inter', borderStyle: 'rounded' },
    blocks: [
      { type: 'hero_slider', data: { height: 'large', autoplay: true, interval: 6, overlay_opacity: 0.5, text_align: 'center', slides: [
        { image_query: 'modern bright office workspace', title: 'Il servizio che cercavi', subtitle: 'Professionale, semplice, affidabile', cta1_text: 'Richiedi info', cta1_url: '' },
        { image_query: 'business team meeting', title: 'Al tuo fianco', subtitle: 'Competenza e ascolto, sempre', cta1_text: '', cta1_url: '' },
      ] } },
      { type: 'highlights', data: { titolo: 'Perché sceglierci', items: [
        { icon: 'check-circle', text: 'Esperienza comprovata' }, { icon: 'clock', text: 'Tempi certi' }, { icon: 'heart', text: 'Assistenza dedicata' },
      ] } },
      { type: 'steps', data: { titolo: 'Come funziona', items: [
        { icon: 'phone', title: 'Contatto', text: 'Ci racconti di cosa hai bisogno.' },
        { icon: 'calendar', title: 'Incontro', text: 'Fissiamo un appuntamento.' },
        { icon: 'check', title: 'Soluzione', text: 'Ti seguiamo passo passo.' },
      ] } },
      { type: 'stats', data: { titolo: '', items: [{ value: '1.000+', label: 'Clienti seguiti' }, { value: '15', label: 'Anni di attività' }, { value: '98%', label: 'Soddisfatti' }] } },
      { type: 'testimonianze', data: { titolo: 'Cosa dicono i clienti', items: [
        { author: 'Studio B.', location: '', rating: 5, text: 'Professionali e sempre disponibili.' },
        { author: 'Elena M.', location: '', rating: 5, text: 'Hanno risolto ogni nostra esigenza.' },
      ] } },
      { type: 'faq', data: { titolo: 'Domande frequenti', items: [
        { question: 'Quanto costa?', answer: 'Indica qui prezzi e preventivi.' },
        { question: 'Quanto tempo serve?', answer: 'Spiega i tempi tipici.' },
      ] } },
      { type: 'cta_banner', data: { title: 'Parliamone', subtitle: 'Il primo contatto è gratuito', button_text: 'Richiedi una consulenza', button_url: '' } },
    ],
  },

  // ── 5. ATTIVITÀ & ESPERIENZE — avventuroso / visivo ────────────────────────
  {
    id: 'esperienze',
    nome: 'Attività & Esperienze',
    descrizione: 'Per tour, guide ed esperienze: racconta, mostra e fai prenotare.',
    settori: ['tour', 'guida', 'escursioni', 'eventi'],
    obiettivi: ['prenotazioni', 'vetrina'],
    theme: { primaryColor: '#0d9488', bgColor: '#ffffff', textColor: '#12211f', fontHeading: 'raleway', fontBody: 'lato', borderStyle: 'mixed' },
    blocks: [
      { type: 'hero_slider', data: { height: 'full', autoplay: true, interval: 6, overlay_opacity: 0.4, text_align: 'center', slides: [
        { image_query: 'adventure hiking nature landscape', title: 'Vivi l’esperienza', subtitle: 'Momenti che ricorderai', cta1_text: 'Prenota ora', cta1_url: '' },
        { image_query: 'kayak sea excursion', title: 'Avventure su misura', subtitle: 'Per tutti, in ogni stagione', cta1_text: '', cta1_url: '' },
      ] } },
      { type: 'about', data: { title: 'Chi siamo', text: 'Racconta le tue esperienze, per chi sono pensate e cosa le rende speciali.' } },
      { type: 'carosello', data: { titolo: 'Le nostre esperienze', per_view: 3, autoplay: true, interval: 4, show_arrows: true, show_dots: true, items: [
        { image_query: 'guided tour group', title: 'Tour guidati', text: 'Descrivi questa esperienza.' },
        { image_query: 'wine tasting experience', title: 'Degustazioni', text: 'Descrivi questa proposta.' },
        { image_query: 'sunset boat trip', title: 'Escursioni', text: 'Un’altra esperienza da vivere.' },
        { image_query: 'outdoor activity people', title: 'Avventure', text: 'Per chi cerca adrenalina.' },
      ] } },
      { type: 'steps', data: { titolo: 'Come prenotare', items: [
        { icon: 'calendar', title: 'Scegli', text: 'Seleziona l’esperienza e la data.' },
        { icon: 'phone', title: 'Prenota', text: 'Confermi in pochi clic.' },
        { icon: 'star', title: 'Vivila', text: 'Ci pensiamo noi al resto.' },
      ] } },
      { type: 'testimonianze', data: { titolo: 'Le voci di chi c’è stato', items: [
        { author: 'Sara D.', location: '', rating: 5, text: 'Esperienza indimenticabile, guide top!' },
        { author: 'Paolo G.', location: '', rating: 5, text: 'Organizzazione perfetta, consigliatissimo.' },
      ] } },
      { type: 'cta_banner', data: { title: 'Pronto a partire?', subtitle: 'Posti limitati — prenota la tua esperienza', button_text: 'Prenota', button_url: '' } },
    ],
  },

  // ── 6. BEAUTY & WELLNESS — soft / visivo ───────────────────────────────────
  {
    id: 'beauty',
    nome: 'Beauty & Wellness',
    descrizione: 'Curato e rilassante. Trattamenti, atmosfera e prenotazione.',
    settori: ['parrucchiere', 'estetista', 'spa', 'benessere'],
    obiettivi: ['prenotazioni', 'vetrina'],
    theme: { primaryColor: '#b45c7e', bgColor: '#ffffff', textColor: '#2a1f24', fontHeading: 'cormorant', fontBody: 'lato', borderStyle: 'rounded' },
    blocks: [
      { type: 'hero_slider', data: { height: 'full', autoplay: true, interval: 6, overlay_opacity: 0.35, text_align: 'center', slides: [
        { image_query: 'spa wellness calm interior', title: 'Il tuo momento di bellezza', subtitle: 'Prenditi cura di te', cta1_text: 'Prenota', cta1_url: '' },
        { image_query: 'beauty salon interior elegant', title: 'Mani esperte', subtitle: 'Trattamenti su misura', cta1_text: '', cta1_url: '' },
      ] } },
      { type: 'about', data: { title: 'Il nostro studio', text: 'Racconta la tua filosofia di cura e cosa rende speciale la tua esperienza.' } },
      { type: 'carosello', data: { titolo: 'I nostri trattamenti', per_view: 3, autoplay: true, interval: 4, show_arrows: true, show_dots: true, items: [
        { image_query: 'facial treatment spa', title: 'Viso', text: 'Descrivi i trattamenti viso.' },
        { image_query: 'massage therapy', title: 'Corpo', text: 'Massaggi e rituali di benessere.' },
        { image_query: 'hair styling salon', title: 'Capelli', text: 'Taglio, colore e piega.' },
        { image_query: 'manicure nails', title: 'Mani & Piedi', text: 'Manicure e pedicure.' },
      ] } },
      { type: 'highlights', data: { titolo: 'Perché noi', items: [
        { icon: 'spa', text: 'Ambiente rilassante' }, { icon: 'award', text: 'Prodotti professionali' }, { icon: 'heart', text: 'Personale qualificato' },
      ] } },
      { type: 'testimonianze', data: { titolo: 'Le nostre clienti', items: [
        { author: 'Chiara L.', location: '', rating: 5, text: 'Mi sono sentita coccolata, tornerò!' },
        { author: 'Federica S.', location: '', rating: 5, text: 'Professionalità e gentilezza uniche.' },
      ] } },
      { type: 'cta_banner', data: { title: 'Regalati una pausa', subtitle: 'Prenota il tuo trattamento', button_text: 'Prenota ora', button_url: '' } },
    ],
  },

  // ── 7. PALESTRA & FITNESS — bold / energico ────────────────────────────────
  {
    id: 'fitness',
    nome: 'Palestra & Fitness',
    descrizione: 'Grintoso e diretto. Corsi, abbonamenti e risultati.',
    settori: ['palestra', 'fitness', 'personal trainer', 'crossfit'],
    obiettivi: ['lead_gen', 'prenotazioni'],
    theme: { primaryColor: '#f97316', bgColor: '#ffffff', textColor: '#171717', fontHeading: 'montserrat', fontBody: 'inter', borderStyle: 'square' },
    blocks: [
      { type: 'hero_slider', data: { height: 'full', autoplay: true, interval: 5, overlay_opacity: 0.55, text_align: 'left', slides: [
        { image_query: 'gym workout intense', title: 'Dai il massimo', subtitle: 'Il tuo obiettivo inizia oggi', cta1_text: 'Inizia ora', cta1_url: '' },
        { image_query: 'fitness training group', title: 'Non sei solo', subtitle: 'Ti alleniamo verso i tuoi risultati', cta1_text: '', cta1_url: '' },
      ] } },
      { type: 'stats', data: { titolo: '', items: [{ value: '500+', label: 'Iscritti attivi' }, { value: '30', label: 'Corsi a settimana' }, { value: '10', label: 'Trainer certificati' }] } },
      { type: 'highlights', data: { titolo: 'Perché allenarti qui', items: [
        { icon: 'gym', text: 'Attrezzature top' }, { icon: 'users', text: 'Corsi per ogni livello' }, { icon: 'clock', text: 'Aperti 7 giorni su 7' },
      ] } },
      { type: 'carosello', data: { titolo: 'I nostri corsi', per_view: 3, autoplay: true, interval: 4, show_arrows: true, show_dots: true, items: [
        { image_query: 'crossfit training', title: 'Functional', text: 'Descrivi il corso.' },
        { image_query: 'yoga class studio', title: 'Yoga', text: 'Descrivi il corso.' },
        { image_query: 'spinning cycling class', title: 'Spinning', text: 'Descrivi il corso.' },
        { image_query: 'weight lifting gym', title: 'Sala pesi', text: 'Allenamento libero e assistito.' },
      ] } },
      { type: 'pacchetti', data: { titolo: 'Abbonamenti', items: [
        { badge: '', name: 'Mensile', tagline: 'Accesso libero', price: '€ 39', price_label: 'al mese', cta_label: 'Scegli', cta_url: '' },
        { badge: 'Più scelto', name: 'Trimestrale', tagline: 'Il migliore rapporto qualità/prezzo', price: '€ 99', price_label: '3 mesi', cta_label: 'Scegli', cta_url: '' },
        { badge: '', name: 'Annuale', tagline: 'Per chi fa sul serio', price: '€ 349', price_label: 'anno', cta_label: 'Scegli', cta_url: '' },
      ] } },
      { type: 'cta_banner', data: { title: 'Prova gratis', subtitle: 'Prenota la tua prima lezione di prova', button_text: 'Inizia ora', button_url: '' } },
    ],
  },

  // ── 8. STUDIO PROFESSIONALE — sobrio / autorevole ──────────────────────────
  {
    id: 'professionista',
    nome: 'Studio professionale',
    descrizione: 'Sobrio e autorevole. Competenze, metodo e richiesta consulenza.',
    settori: ['avvocato', 'commercialista', 'consulente', 'studio'],
    obiettivi: ['lead_gen'],
    theme: { primaryColor: '#1e293b', bgColor: '#ffffff', textColor: '#1e293b', fontHeading: 'playfair', fontBody: 'inter', borderStyle: 'square' },
    blocks: [
      { type: 'hero', data: { title: 'Competenza al tuo servizio', tagline: 'Consulenza professionale, su misura per te', cta1_text: 'Richiedi consulenza', cta1_url: '', image_query: 'professional office desk elegant', height: 'large' } },
      { type: 'about', data: { title: 'Lo studio', text: 'Presenta lo studio, i valori e l’esperienza che offri ai tuoi clienti.' } },
      { type: 'paragrafi', data: { titolo: 'Aree di competenza', items: [
        { icon: 'check-circle', title: 'Area 1', text: 'Descrivi qui la prima area di competenza.' },
        { icon: 'check-circle', title: 'Area 2', text: 'Descrivi qui la seconda area di competenza.' },
        { icon: 'check-circle', title: 'Area 3', text: 'Descrivi qui la terza area di competenza.' },
      ] } },
      { type: 'steps', data: { titolo: 'Come lavoriamo', items: [
        { icon: 'phone', title: 'Primo contatto', text: 'Ascoltiamo la tua esigenza.' },
        { icon: 'users', title: 'Analisi', text: 'Studiamo la situazione insieme.' },
        { icon: 'check', title: 'Soluzione', text: 'Ti guidiamo fino al risultato.' },
      ] } },
      { type: 'stats', data: { titolo: '', items: [{ value: '20+', label: 'Anni di esperienza' }, { value: '500+', label: 'Pratiche gestite' }, { value: '100%', label: 'Riservatezza' }] } },
      { type: 'testimonianze', data: { titolo: 'La fiducia dei clienti', items: [
        { author: 'Roberto M.', location: '', rating: 5, text: 'Serietà e competenza fuori dal comune.' },
        { author: 'Laura F.', location: '', rating: 5, text: 'Mi hanno seguito con grande attenzione.' },
      ] } },
      { type: 'cta_banner', data: { title: 'Hai bisogno di una consulenza?', subtitle: 'Contattaci: il primo colloquio è senza impegno', button_text: 'Richiedi consulenza', button_url: '' } },
    ],
  },
]

export function getTemplate(id) {
  return SITE_TEMPLATES.find(t => t.id === id) || null
}
