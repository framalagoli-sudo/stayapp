// Sezioni pronte: uno o più blocchi già composti — contenuto E stile — che si
// inseriscono con un clic dalla galleria (`components/admin/GalleriaSezioni.jsx`),
// dove ognuna si vede com'è, nei colori del sito. «Parti da bello, non da bianco.»
//
// ⚠️ Sono dati veri: se si salva senza cambiarli vanno sul sito così. Quindi:
//   · i testi dicono cosa scriverci, non fingono un contenuto credibile;
//   · niente prezzi, numeri, nomi o recensioni che sembrino veri;
//   · un pulsante nasce senza destinazione (e finché non ne ha una non compare);
//   · le poche foto sono di repertorio e si cambiano con un clic sulla pagina.
// Gli id dei blocchi e degli elementi li dà l'editor al momento dell'inserimento.
// Senza dipendenze.

const foto = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`
const FOTO_INTERNO = foto('1760326652193-bc25f0fe4a8e')
const FOTO_MANI = foto('1721508490084-1b1de5b230d4')

export const CATEGORIE_SEZIONI = [
  { key: 'copertine', label: 'Copertine' },
  { key: 'presentazione', label: 'Chi siamo' },
  { key: 'servizi', label: 'Servizi' },
  { key: 'prove', label: 'Numeri e recensioni' },
  { key: 'prezzi', label: 'Prezzi' },
  { key: 'domande', label: 'Domande' },
  { key: 'inviti', label: 'Inviti e contatti' },
]

export const BLOCK_PATTERNS = [
  // ── Copertine ──────────────────────────────────────────────────────────────
  {
    key: 'copertina_titolo', categoria: 'copertine',
    label: 'Copertina a tutto titolo',
    desc: 'Solo parole, grandi: la promessa in una riga e un pulsante',
    blocks: [
      { type: 'hero', data: { title: 'Scrivi qui la tua promessa, in una riga', tagline: 'Una frase che dice cosa fai, per chi, e perché scegliere te.', bg_image_url: '', overlay_opacity: 0.5, cta1_text: 'Scopri di più', cta1_url: '', cta2_text: '', cta2_url: '', height: 'large' } },
    ],
  },
  {
    key: 'copertina_foto', categoria: 'copertine',
    label: 'Copertina con foto',
    desc: 'Una foto a tutto schermo sotto il titolo',
    blocks: [
      { type: 'hero', data: { title: 'Il nome di quello che offri', tagline: 'Una frase che fa venire voglia di saperne di più.', bg_image_url: FOTO_INTERNO, overlay_opacity: 0.45, cta1_text: 'Prenota', cta1_url: '', cta2_text: '', cta2_url: '', height: 'full' } },
    ],
  },
  {
    key: 'copertina_compatta', categoria: 'copertine',
    label: 'Apertura di una pagina interna',
    desc: 'Titolo grande e una riga sotto, senza foto: per «Servizi», «Chi siamo», «Contatti»',
    blocks: [
      { type: 'titolo', data: { title: 'Il titolo della pagina', subtitle: 'Una riga che dice cosa si trova qui sotto.', size: 'large' }, style: { etichetta: 'La sezione' } },
    ],
  },

  // ── Chi siamo ──────────────────────────────────────────────────────────────
  {
    key: 'chi_siamo', categoria: 'presentazione',
    label: 'Chi siamo',
    desc: 'Titolo e paragrafo di presentazione',
    blocks: [
      { type: 'about', data: { title: 'Chi siamo', text: 'Racconta qui chi sei, cosa offri e cosa ti rende diverso. Bastano poche righe sincere.' }, style: { etichetta: 'La nostra storia' } },
    ],
  },
  {
    key: 'storia_foto', categoria: 'presentazione',
    label: 'La storia, con una foto e i numeri',
    desc: 'Foto accanto al testo e, sotto, una fascia scura con tre numeri',
    blocks: [
      { type: 'foto_testo', data: { title: 'Come lavoriamo', text: 'Racconta qui il tuo modo di lavorare: da dove vieni, cosa curi di più, cosa trova chi si rivolge a te.', image_url: FOTO_MANI, inverti: false, button_label: '', button_url: '' }, style: { etichetta: 'Chi siamo' } },
      { type: 'stats', data: { titolo: '', items: [
        { value: '—', label: 'Scrivi cosa conta il primo numero' },
        { value: '—', label: 'Scrivi cosa conta il secondo numero' },
        { value: '—', label: 'Scrivi cosa conta il terzo numero' },
      ] } },
    ],
  },
  {
    key: 'manifesto', categoria: 'presentazione',
    label: 'Una frase su fondo scuro',
    desc: 'Il tuo modo di lavorare in una frase, in grande',
    blocks: [
      { type: 'citazione', data: { text: 'Scrivi qui la frase che riassume come lavori.', author: '', role: '' }, style: { bg: 'dark', glow: 'primary' } },
    ],
  },
  {
    key: 'squadra', categoria: 'presentazione',
    label: 'Le persone',
    desc: 'Ritratti con nome, ruolo e due righe',
    blocks: [
      { type: 'team', data: { titolo: 'Le persone', formato: 'quadrato', variant: 'ritratti', items: [
        { photo_url: '', photo_focal: '', nome: 'Nome e cognome', ruolo: 'Ruolo', bio: 'Due righe su questa persona.' },
        { photo_url: '', photo_focal: '', nome: 'Nome e cognome', ruolo: 'Ruolo', bio: 'Due righe su questa persona.' },
        { photo_url: '', photo_focal: '', nome: 'Nome e cognome', ruolo: 'Ruolo', bio: 'Due righe su questa persona.' },
      ] }, style: { bg: 'muted' } },
    ],
  },

  // ── Servizi ────────────────────────────────────────────────────────────────
  {
    key: 'servizi_3', categoria: 'servizi',
    label: 'Tre punti di forza',
    desc: 'Tre schede con icona, titolo e testo',
    blocks: [
      { type: 'paragrafi', data: { titolo: 'Perché sceglierci', items: [
        { icon: 'star',  title: 'Il primo punto di forza', text: 'Descrivi qui il primo punto di forza.', image_url: '', image_focal: '' },
        { icon: 'heart', title: 'Il secondo punto di forza', text: 'Descrivi qui il secondo punto di forza.', image_url: '', image_focal: '' },
        { icon: 'award', title: 'Il terzo punto di forza', text: 'Descrivi qui il terzo punto di forza.', image_url: '', image_focal: '' },
      ] }, style: { etichetta: 'Cosa offriamo' } },
    ],
  },
  {
    key: 'servizi_linguette', categoria: 'servizi',
    label: 'Servizi a linguette',
    desc: 'Un servizio per linguetta: tanto contenuto in poco spazio',
    blocks: [
      { type: 'linguette', data: { titolo: 'I nostri servizi', items: [
        { title: 'Primo servizio', text: 'Descrivi qui il primo servizio: cosa comprende, per chi è, quanto dura.' },
        { title: 'Secondo servizio', text: 'Descrivi qui il secondo servizio.' },
        { title: 'Terzo servizio', text: 'Descrivi qui il terzo servizio.' },
      ] } },
    ],
  },
  {
    key: 'come_funziona', categoria: 'servizi',
    label: 'Come funziona, in tre passi',
    desc: 'Passaggi numerati su fondo grigio',
    blocks: [
      { type: 'steps', data: { titolo: 'Come funziona', items: [
        { icon: 'phone', title: 'Primo passo', text: 'Descrivi qui cosa succede per primo.' },
        { icon: 'calendar', title: 'Secondo passo', text: 'Descrivi qui cosa succede dopo.' },
        { icon: 'check-circle', title: 'Terzo passo', text: 'Descrivi qui come si conclude.' },
      ] }, style: { bg: 'muted', etichetta: 'In breve' } },
    ],
  },
  {
    key: 'galleria_testo', categoria: 'servizi',
    label: 'Galleria con descrizione',
    desc: 'Un testo e, sotto, una galleria da riempire con le tue foto',
    blocks: [
      { type: 'about', data: { title: 'I nostri lavori', text: 'Una breve descrizione che accompagna le immagini qui sotto.' } },
      { type: 'galleria_immagini', data: { titolo: '', images: [], columns: 3 } },
    ],
  },

  // ── Numeri e recensioni ────────────────────────────────────────────────────
  {
    key: 'numeri', categoria: 'prove',
    label: 'Numeri in evidenza',
    desc: 'Fascia scura con quattro numeri grandi',
    blocks: [
      { type: 'stats', data: { titolo: 'I nostri numeri', items: [
        { value: '—', label: 'Anni di attività' },
        { value: '—', label: 'Clienti seguiti' },
        { value: '—', label: 'Scrivi cosa conta questo numero' },
        { value: '—', label: 'Scrivi cosa conta questo numero' },
      ] } },
    ],
  },
  {
    key: 'recensioni', categoria: 'prove',
    label: 'Recensioni dei clienti',
    desc: 'Schede con stelle, testo e autore: da riempire con quelle vere',
    blocks: [
      { type: 'testimonianze', data: { titolo: 'Dicono di noi', items: [
        { author: 'Nome del cliente', location: '', rating: 5, text: 'Scrivi qui la recensione di un tuo cliente.', source: '' },
        { author: 'Nome del cliente', location: '', rating: 5, text: 'Scrivi qui la recensione di un tuo cliente.', source: '' },
        { author: 'Nome del cliente', location: '', rating: 5, text: 'Scrivi qui la recensione di un tuo cliente.', source: '' },
      ] } },
    ],
  },

  // ── Prezzi ─────────────────────────────────────────────────────────────────
  {
    key: 'listino_due', categoria: 'prezzi',
    label: 'Listino su due colonne',
    desc: 'Voci e prezzi in elenco, con una nota sotto',
    blocks: [
      { type: 'listino', data: { titolo: 'Listino prezzi', sottotitolo: 'Una riga che spiega come leggere i prezzi, se serve.', due_colonne: true, nota: 'Scrivi qui una nota: IVA, validità, condizioni.', items: [
        { name: 'Il nome della prima voce', description: '', price: '' },
        { name: 'Il nome della seconda voce', description: 'Una riga che la descrive, se serve.', price: '' },
        { name: 'Il nome della terza voce', description: '', price: '' },
        { name: 'Il nome della quarta voce', description: '', price: '' },
        { name: 'Il nome della quinta voce', description: 'Una riga che la descrive, se serve.', price: '' },
        { name: 'Il nome della sesta voce', description: '', price: '' },
      ] } },
    ],
  },
  {
    key: 'confronto', categoria: 'prezzi',
    label: 'Confronto fra tre proposte',
    desc: 'Tabella con la proposta consigliata in risalto',
    blocks: [
      { type: 'tabella', data: { titolo: 'Scegli la proposta giusta per te', intestazioni: ['', 'Prima proposta', 'Seconda proposta', 'Terza proposta'], evidenzia: 2, nota: 'Scrivi qui una nota sotto la tabella, se serve.', items: [
        { celle: ['Cosa comprende (prima riga)', '✓', '✓', '✓'] },
        { celle: ['Cosa comprende (seconda riga)', '✗', '✓', '✓'] },
        { celle: ['Cosa comprende (terza riga)', '✗', '✗', '✓'] },
        { celle: ['Prezzo', 'Scrivi qui', 'Scrivi qui', 'Scrivi qui'] },
      ] } },
    ],
  },

  // ── Domande ────────────────────────────────────────────────────────────────
  {
    key: 'faq', categoria: 'domande',
    label: 'Domande frequenti',
    desc: 'Domande che si aprono con un tocco',
    blocks: [
      { type: 'faq', data: { titolo: 'Domande frequenti', items: [
        { question: 'Scrivi qui la prima domanda', answer: 'Scrivi qui la risposta.' },
        { question: 'Scrivi qui la seconda domanda', answer: 'Scrivi qui la risposta.' },
        { question: 'Scrivi qui la terza domanda', answer: 'Scrivi qui la risposta.' },
      ] } },
    ],
  },

  // ── Inviti e contatti ──────────────────────────────────────────────────────
  {
    key: 'cta', categoria: 'inviti',
    label: 'Invito, al centro',
    desc: 'Fascia colorata con una frase e un pulsante',
    blocks: [
      { type: 'cta_banner', data: { title: 'Un invito a fare il primo passo', subtitle: 'Una frase che spiega perché farlo adesso.', button_text: 'Contattaci', button_url: '' } },
    ],
  },
  {
    key: 'cta_lato', categoria: 'inviti',
    label: 'Invito, col pulsante a lato',
    desc: 'La frase a sinistra e il pulsante a destra',
    blocks: [
      { type: 'cta_banner', data: { variant: 'split', title: 'Un invito a fare il primo passo', subtitle: 'Una frase che spiega perché farlo adesso.', button_text: 'Prenota', button_url: '' } },
    ],
  },
  {
    key: 'dove_siamo', categoria: 'inviti',
    label: 'Dove siamo',
    desc: 'Indirizzo, telefono, orari e mappa presi dalle Informazioni',
    blocks: [
      { type: 'recapiti', data: { titolo: 'Vieni a trovarci', sottotitolo: '', mostra_mappa: true, nascondi: [] } },
    ],
  },
  {
    key: 'iscrizione', categoria: 'inviti',
    label: 'Iscrizione alla newsletter',
    desc: 'Un campo per l\'email, col consenso alla privacy',
    blocks: [
      { type: 'newsletter', data: { title: 'Resta aggiornato', subtitle: 'Lascia la tua email per ricevere le novità.' } },
    ],
  },
]

// I blocchi di una sezione pronti per entrare in una pagina: una copia, con un
// id per ogni blocco e per ogni elemento di lista, e lo stile che la sezione porta.
export function blocchiDiSezione(sezione, nuovoId) {
  return (sezione?.blocks || []).map(b => {
    const data = JSON.parse(JSON.stringify(b.data || {}))
    for (const lista of ['items', 'slides']) {
      if (Array.isArray(data[lista])) data[lista] = data[lista].map(x => ({ id: nuovoId(), ...x }))
    }
    return { id: nuovoId(), type: b.type, data, ...(b.style ? { style: { ...b.style } } : {}) }
  })
}
