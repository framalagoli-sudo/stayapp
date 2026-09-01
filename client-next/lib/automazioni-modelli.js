// Le automazioni già scritte, da accendere con un clic.
//
// ⚠️ Il motore esisteva da mesi e **nessuno l'aveva mai usato**: zero
// automazioni configurate in tutta la storia del progetto. Non perché non
// funzionasse — funziona — ma perché per averne una bisognava comporre a mano
// un evento scatenante, un ritardo in ore, un oggetto e un testo. È lavoro da
// chi conosce lo strumento, e chi compra OltreNova ha un ristorante da mandare
// avanti.
//
// Un modello è la stessa cosa, già scritta. Il cliente lo accende, e semmai
// cambia le parole: partire da un testo da correggere è molto più facile che
// partire da un campo vuoto.
//
// ⚠️ Nessun import: questo file lo legge il browser.
//
// I nomi dei campi sono quelli veri dello step (`subject`, `heading`, `text`,
// `cta_text`, `cta_url`): un modello che ne usasse altri creerebbe automazioni
// mute — partono, non scrivono niente, e nessuno capisce perché.

export const MODELLI = [
  {
    id: 'promemoria',
    titolo: 'Promemoria dell’appuntamento',
    a_cosa_serve: 'Un’email il giorno prima. È il modo più semplice di ridurre chi non si presenta.',
    trigger: 'pre_visita',
    steps: [{
      delay_ore: 24,
      subject: 'Ci vediamo domani, {{nome}}',
      heading: 'A domani!',
      text: 'Ciao {{nome}},\n\nti ricordiamo il tuo appuntamento di domani {{data}} alle {{ora}} per {{servizio}}.\n\nSe non riesci a venire, scrivici: liberiamo il posto per qualcun altro.\n\nA presto!',
      cta_text: '', cta_url: '',
    }],
  },
  {
    id: 'ringraziamento',
    titolo: 'Grazie, e com’è andata?',
    a_cosa_serve: 'Un messaggio poche ore dopo, con il link per lasciare una recensione. È il momento in cui le persone rispondono di più.',
    trigger: 'post_visita',
    steps: [{
      delay_ore: 3,
      subject: 'Grazie {{nome}}!',
      heading: 'Grazie di essere passato',
      // ⚠️ `{{link_recensione}}` esiste **solo** dopo la visita: metterlo in un
      // modello «prima» produrrebbe un pulsante che porta nel vuoto.
      text: 'Ciao {{nome}},\n\ngrazie per essere venuto. Speriamo che sia andato tutto bene.\n\nSe hai due minuti, ci farebbe molto piacere sapere come ti sei trovato: per una piccola attività una recensione conta davvero.',
      cta_text: 'Lascia una recensione', cta_url: '{{link_recensione}}',
    }],
  },
  {
    id: 'benvenuto',
    titolo: 'Risposta a chi ti scrive',
    a_cosa_serve: 'Una conferma immediata a chi manda un messaggio dal sito, così sa di essere stato ricevuto.',
    trigger: 'nuovo_contatto',
    steps: [{
      delay_ore: 0,
      subject: 'Abbiamo ricevuto il tuo messaggio',
      heading: 'Grazie per averci scritto',
      text: 'Ciao {{nome}},\n\nabbiamo ricevuto il tuo messaggio e ti rispondiamo al più presto.\n\nA presto!',
      cta_text: '', cta_url: '',
    }],
  },
]

export function modelloDi(id) { return MODELLI.find(m => m.id === id) || null }
