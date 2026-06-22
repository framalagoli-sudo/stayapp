// Sezioni predefinite (pattern): array di blocchi già pre-compilati, inseribili
// in un click. "Parti da bello, non da bianco" — pensato per chi fa da sé.
// Gli id dei blocchi vengono generati al momento dell'inserimento.

export const BLOCK_PATTERNS = [
  {
    key: 'chi_siamo',
    label: 'Chi siamo',
    desc: 'Titolo + paragrafo di presentazione',
    blocks: [
      { type: 'about', data: { title: 'Chi siamo', text: 'Racconta qui chi sei, cosa offri e cosa ti rende diverso. Bastano poche righe sincere.' } },
    ],
  },
  {
    key: 'servizi_3',
    label: 'Tre punti di forza',
    desc: 'Griglia di 3 card con icona',
    blocks: [
      { type: 'paragrafi', data: { titolo: 'Perché sceglierci', items: [
        { icon: 'star',  title: 'Qualità', text: 'Descrivi qui il primo punto di forza.' },
        { icon: 'heart', title: 'Cura',    text: 'Descrivi qui il secondo punto di forza.' },
        { icon: 'award', title: 'Esperienza', text: 'Descrivi qui il terzo punto di forza.' },
      ] } },
    ],
  },
  {
    key: 'faq',
    label: 'Domande frequenti',
    desc: 'Accordion con 2 domande',
    blocks: [
      { type: 'faq', data: { titolo: 'Domande frequenti', items: [
        { question: 'Prima domanda?', answer: 'Scrivi qui la risposta.' },
        { question: 'Seconda domanda?', answer: 'Scrivi qui la risposta.' },
      ] } },
    ],
  },
  {
    key: 'galleria_testo',
    label: 'Galleria + descrizione',
    desc: 'Testo seguito da una galleria immagini',
    blocks: [
      { type: 'about', data: { title: 'La nostra realtà', text: 'Una breve descrizione che accompagna le immagini qui sotto.' } },
      { type: 'galleria_immagini', data: { titolo: '', images: [], columns: 3 } },
    ],
  },
  {
    key: 'cta',
    label: 'Invito all’azione',
    desc: 'Banner + pulsante per contatti/prenotazione',
    blocks: [
      { type: 'cta_banner', data: { title: 'Pronto a iniziare?', subtitle: 'Contattaci oggi, ti rispondiamo subito.', button_text: 'Contattaci', button_url: '' } },
    ],
  },
]
