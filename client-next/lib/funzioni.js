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
  // ⚠️ Una voce sola al posto di «Attività» ed «Escursioni»: erano parole del
  // mondo alberghiero, da cui OltreNova è nata. Una palestra fa corsi,
  // un'agenzia viaggi, un negozio degustazioni — e a raggruppare sono le
  // **categorie che scrive il cliente**, non due nomi scelti da noi.
  // Gli alias tengono accesa la voce a chi aveva già acceso una delle due.
  { chiave: 'offerte',    sezione: 'offerte',    titolo: 'Offerte',        descrizione: 'Corsi, escursioni, esperienze: quello che i tuoi clienti possono prenotare o richiedere.', alias: ['attivita', 'escursioni', 'activities', 'excursions'] },
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
export const ORDINE_OSPITE = ['menu', 'servizi', 'offerte', 'galleria']

// La chiave di traduzione dell'etichetta, perché le tre app la scrivano uguale.
export const ETICHETTA_OSPITE = {
  menu: 'menu', servizi: 'services_title', offerte: 'offers_tab', galleria: 'gallery',
}

// Quali sezioni mostrare nell'app dell'ospite: la funzione dev'essere accesa
// **e** avere qualcosa dentro. Una scheda vuota è peggio di una scheda assente.
//
// `contenuto` dice, per ogni chiave, se c'è materiale da mostrare: lo sa la PWA,
// che ha i dati in mano, non questo file.
export function sezioniOspite(ent, contenuto = {}) {
  return ORDINE_OSPITE.filter(k => contenuto[k] && funzioneAttiva(ent, k))
}

// Cosa si trova acceso chi apre il pannello per la prima volta: **tutto**.
//
// Prima ogni tipo ne accendeva tre o quattro, e il resto restava invisibile
// finché qualcuno non scopriva la pagina delle Funzioni. Un cliente nuovo si
// trovava un pannello quasi vuoto e nessun modo di sapere cosa mancava — chi
// compra OltreNova deve trovare le sue funzioni, non cercarle.
//
// ⚠️ Accendere tutto **non pubblica niente**: sull'app dell'ospite `sezioniOspite`
// pretende anche che ci sia contenuto dentro, e sul sito le sezioni compaiono
// solo se hanno dati. Cambia cosa il cliente vede nel **suo** pannello, non cosa
// vede il pubblico. Chi non usa una funzione la spegne, e la sua scelta vince
// sempre su questi valori.
const TUTTE_ACCESE = {
  galleria: true, menu: true, servizi: true,
  offerte: true, chatbot: true, sito: true,
}

export const MODULI_PREDEFINITI = {
  struttura:  { ...TUTTE_ACCESE },
  ristorante: { ...TUTTE_ACCESE },
  attivita:   { ...TUTTE_ACCESE },
}

// Il sito pubblico nasce acceso.
//
// Nasceva `null`, e un cliente doveva scoprire da solo un interruttore per
// vedere online la cosa per cui ha comprato OltreNova. Il sito **è** il
// prodotto: chiederne l'attivazione è come consegnare un'auto col motore da
// avviare a mano.
export const MINISITO_INIZIALE = { active: true }
