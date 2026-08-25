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
  { chiave: 'galleria',   sezione: 'gallery',    titolo: 'Galleria',       descrizione: 'Le foto che raccontano il posto.', alias: ['gallery'] },
  { chiave: 'menu',       sezione: 'menu',       titolo: 'Menù',           descrizione: 'Piatti e prezzi, divisi per categoria. Non solo per i ristoranti: anche un hotel con cucina o un bar.' },
  { chiave: 'servizi',    sezione: 'services',   titolo: 'Servizi',        descrizione: 'Cosa offri: prestazioni, dotazioni, comodità.' },
  { chiave: 'attivita',   sezione: 'activities', titolo: 'Attività',       descrizione: 'Corsi, esperienze, appuntamenti ricorrenti.' },
  { chiave: 'escursioni', sezione: 'excursions', titolo: 'Escursioni',     descrizione: 'Uscite ed eventi con data, prezzo e posti.' },
  { chiave: 'vetrine',    sezione: 'vetrine',    titolo: 'Vetrine',        descrizione: 'Cataloghi: immobili, veicoli, prodotti, viaggi.' },
  { chiave: 'sito',       sezione: 'sito',       titolo: 'Sito web',       descrizione: 'Le pagine pubbliche.', sempre: true },
  // L'assistente non ha un interruttore qui: si accende nella sua pagina, dove
  // si scrive anche cosa deve sapere. Un secondo interruttore che dice "acceso"
  // mentre il bot è spento sarebbe una promessa falsa.
  { chiave: 'chatbot',    sezione: 'chatbot',    titolo: 'Assistente',     descrizione: 'Risponde ai visitatori con i tuoi dati.', sempre: true },
]

// Dove stanno davvero gli interruttori di un'entità.
//
// Tre punti diversi, tutti ancora vivi nei dati dei clienti (misurato il
// 25/08/2026): le strutture e i ristoranti tengono le chiavi in cima a
// `moduli`, le attività dentro `moduli.modules`, e l'editor dell'app ospite
// scriveva in `home_sections`. Appiattirli qui è l'unico modo per non dover
// ricordare la storia in ogni punto che fa una domanda.
export function moduliDi(ent) {
  const m = ent?.moduli || ent?.modules || ent?.pwa || {}
  if (!m || typeof m !== 'object') return {}
  return { ...m, ...(m.modules && typeof m.modules === 'object' ? m.modules : {}) }
}

// Questa funzione è acceso per questa entità? È l'unica risposta alla domanda,
// e la usano sia il pannello sia le app ospite.
//
// L'ordine conta: una scelta esplicita del cliente vince sempre su un
// automatismo, e un nome storico vale quanto quello nuovo — altrimenti un
// ristorante che aveva spento `gallery` se la vedrebbe ricomparire.
export function funzioneAttiva(ent, chiave) {
  const f = FUNZIONI.find(x => x.chiave === chiave)
  if (!f) return false
  if (f.sempre) return true
  const m = moduliDi(ent)
  if (chiave in m) return !!m[chiave]
  for (const a of f.alias || []) if (a in m) return !!m[a]
  const hs = m.home_sections
  if (hs && typeof hs === 'object') {
    if (chiave in hs) return !!hs[chiave]
    for (const a of f.alias || []) if (a in hs) return !!hs[a]
  }
  // Mai deciso: vale il preset del tipo, così le entità create prima di questa
  // pagina continuano a mostrare quello che mostravano.
  return !!MODULI_PREDEFINITI[ent?.tipo]?.[chiave]
}

// L'ordine in cui le sezioni compaiono nell'app dell'ospite.
export const ORDINE_OSPITE = ['menu', 'servizi', 'attivita', 'escursioni', 'galleria']

// La chiave di traduzione dell'etichetta, perché le tre app la scrivano uguale.
export const ETICHETTA_OSPITE = {
  menu: 'menu', servizi: 'services_title', attivita: 'activities_title',
  escursioni: 'excursions_title', galleria: 'gallery',
}

// Quali sezioni mostrare nell'app dell'ospite: la funzione dev'essere accesa
// **e** avere qualcosa dentro. Una scheda vuota è peggio di una scheda assente.
//
// `contenuto` dice, per ogni chiave, se c'è materiale da mostrare: lo sa la PWA,
// che ha i dati in mano, non questo file.
export function sezioniOspite(ent, contenuto = {}) {
  return ORDINE_OSPITE.filter(k => contenuto[k] && funzioneAttiva(ent, k))
}

// Preset per tipo: cosa si trova acceso chi crea una nuova entità.
// Sono suggerimenti di partenza, non vincoli — si cambiano dal pannello.
export const MODULI_PREDEFINITI = {
  struttura:  { galleria: true, servizi: true, attivita: true, escursioni: true, chatbot: true },
  ristorante: { galleria: true, menu: true, chatbot: true },
  attivita:   { galleria: true, servizi: true, chatbot: true },
}
