// Il catalogo delle funzioni che un'entità può accendere.
//
// Sta in un file suo, separato da `lib/entita.js`, per una ragione precisa: il
// pannello e le app ospite sono codice che gira nel browser, mentre
// `lib/entita.js` apre la connessione con la chiave di servizio. Tenerli insieme
// trascina codice server dentro il bundle del browser — oggi senza danni
// (Next non vi inlina i segreti), ma è il tipo di vicinanza da cui nasce una
// fuga di chiavi al primo refactor distratto.
//
// Qui dentro: nessun import, nessun accesso ai dati. Solo il catalogo e la
// regola che decide se una funzione è accesa.

// ── Le funzioni che un'entità può accendere ─────────────────────────────────
//
// Questo è il catalogo, ed è UNO SOLO per tutti i tipi: è il senso
// dell'unificazione. Un hotel che apre il ristorante interno accende il menù;
// una palestra accende servizi e prenotazioni; un avvocato lascia acceso solo
// l'essenziale. Il `tipo` decide cosa si trova acceso il primo giorno, non cosa
// si può accendere.
//
// `sempre: true` = fa parte dell'ossatura e non si spegne (senza, il cliente
// resterebbe senza informazioni o senza sito).
export const FUNZIONI = [
  { chiave: 'info',       sezione: 'info',       titolo: 'Informazioni',   descrizione: 'Nome, contatti, indirizzo, orari.', sempre: true },
  { chiave: 'galleria',   sezione: 'gallery',    titolo: 'Galleria',       descrizione: 'Le foto che raccontano il posto.' },
  { chiave: 'menu',       sezione: 'menu',       titolo: 'Menù',           descrizione: 'Piatti e prezzi, divisi per categoria. Non solo per i ristoranti: anche un hotel con cucina o un bar.' },
  { chiave: 'servizi',    sezione: 'services',   titolo: 'Servizi',        descrizione: 'Cosa offri: prestazioni, dotazioni, comodità.' },
  { chiave: 'attivita',   sezione: 'activities', titolo: 'Attività',       descrizione: 'Corsi, esperienze, appuntamenti ricorrenti.' },
  { chiave: 'escursioni', sezione: 'excursions', titolo: 'Escursioni',     descrizione: 'Uscite ed eventi con data, prezzo e posti.' },
  { chiave: 'vetrine',    sezione: 'vetrine',    titolo: 'Vetrine',        descrizione: 'Cataloghi: immobili, veicoli, prodotti, viaggi.' },
  { chiave: 'sito',       sezione: 'sito',       titolo: 'Sito web',       descrizione: 'Le pagine pubbliche.', sempre: true },
  { chiave: 'chatbot',    sezione: 'chatbot',    titolo: 'Assistente',     descrizione: 'Risponde ai visitatori con i tuoi dati.' },
]

// Per il menu laterale: la funzione è accesa per questa entità?
export function funzioneAttiva(ent, chiave) {
  const f = FUNZIONI.find(x => x.chiave === chiave)
  if (!f) return false
  if (f.sempre) return true
  const m = ent?.moduli
  // Chiave assente = mai deciso: vale il preset del tipo, così le entità create
  // prima di questa pagina continuano a mostrare quello che mostravano.
  if (!m || !(chiave in m)) return !!MODULI_PREDEFINITI[ent?.tipo]?.[chiave]
  return !!m[chiave]
}

// Preset per tipo: cosa si trova acceso chi crea una nuova entità.
// Sono suggerimenti di partenza, non vincoli — si cambiano dal pannello.
export const MODULI_PREDEFINITI = {
  struttura:  { galleria: true, servizi: true, attivita: true, escursioni: true, chatbot: true },
  ristorante: { galleria: true, menu: true, chatbot: true },
  attivita:   { galleria: true, servizi: true, chatbot: true },
}
