// Catalogo dei messaggi WhatsApp: è NOSTRO e uguale per tutti i clienti.
//
// Perché non li scrive il cliente: ogni template va approvato da Meta, e un testo
// scritto male viene rifiutato (con il cliente che chiama te) o, peggio, fa
// segnalare i messaggi e limitare il suo numero. Il cliente sceglie e riempie i
// buchi; il testo è collaudato una volta e vale per tutti.
//
// I template sono asset del singolo account WhatsApp, quindi non si condividono:
// al collegamento del numero queste definizioni vengono create sull'account del
// cliente via API (lib/whatsapp.js).
//
// ⚠️ Modificare il testo di un template già approvato NON aggiorna le copie
// esistenti: si alza `versione` e si creano nuove copie. La vecchia resta finché
// tutti non sono migrati.

// Le categorie decidono il prezzo e le regole: "utility" (conferme, promemoria,
// aggiornamenti su qualcosa che il cliente ha chiesto) costa meno ed è meglio
// tollerata; "marketing" (promozioni) costa di più e va usata con parsimonia.
export const CATEGORIE = { UTILITY: 'UTILITY', MARKETING: 'MARKETING' }

export const CATALOGO = [
  {
    // La conferma di una prenotazione a un evento, sul telefono.
    //
    // È «utility» e non «marketing» perché arriva **subito dopo** che la persona
    // ha prenotato: è la ricevuta di una cosa che ha chiesto lei. Meta tratta
    // questa categoria meglio e costa meno — ma vale finché il messaggio resta
    // una conferma. Infilarci dentro una promozione lo farebbe segnalare, e a
    // pagarne il prezzo sarebbe il numero del cliente.
    key: 'conferma_prenotazione',
    versione: 1,
    categoria: CATEGORIE.UTILITY,
    titolo: 'Conferma di prenotazione',
    descrizione: 'Arriva sul telefono appena qualcuno prenota: cosa, quando, per quante persone. È la stessa cosa che dice l’email, dove la gente la legge davvero.',
    // {{1}} nome · {{2}} evento · {{3}} data e ora · {{4}} persone
    corpo: 'Ciao {{1}}, la tua prenotazione per {{2}} è confermata: {{3}}, per {{4}}. Se qualcosa cambia rispondi pure a questo messaggio.',
    variabili: [
      { chiave: 'nome', etichetta: 'Nome di chi prenota', esempio: 'Mario' },
      { chiave: 'titolo', etichetta: 'Cosa ha prenotato', esempio: 'A cena con Chiara e Daniele' },
      { chiave: 'quando', etichetta: 'Quando', esempio: 'giovedì 12 settembre alle 20:00' },
      { chiave: 'persone', etichetta: 'Per quante persone', esempio: '2 persone' },
    ],
  },
  {
    key: 'promemoria_appuntamento',
    versione: 1,
    categoria: CATEGORIE.UTILITY,
    titolo: 'Promemoria appuntamento',
    descrizione: 'Ricorda al cliente l’appuntamento del giorno dopo. Riduce chi non si presenta.',
    // {{1}} nome · {{2}} data · {{3}} ora · {{4}} luogo
    corpo: 'Ciao {{1}}, ti ricordiamo il tuo appuntamento di {{2}} alle {{3}} presso {{4}}. Se non puoi venire, rispondi a questo messaggio: ci organizziamo diversamente.',
    variabili: [
      { chiave: 'nome', etichetta: 'Nome del cliente', esempio: 'Mario' },
      { chiave: 'data', etichetta: 'Data', esempio: 'domani' },
      { chiave: 'ora', etichetta: 'Ora', esempio: '15:30' },
      { chiave: 'luogo', etichetta: 'Dove', esempio: 'Garage 22, via Roma 1' },
    ],
  },
  {
    key: 'preventivo_pronto',
    versione: 1,
    categoria: CATEGORIE.UTILITY,
    titolo: 'Preventivo pronto',
    descrizione: 'Avvisa che il preventivo è disponibile, con il link per aprirlo.',
    corpo: 'Ciao {{1}}, il preventivo che ci hai chiesto è pronto. Puoi vederlo qui: {{2}}. Per qualsiasi dubbio rispondi pure a questo messaggio.',
    variabili: [
      { chiave: 'nome', etichetta: 'Nome del cliente', esempio: 'Mario' },
      { chiave: 'link', etichetta: 'Link al preventivo', esempio: 'https://…' },
    ],
  },
  {
    key: 'nuovo_in_vetrina',
    versione: 1,
    categoria: CATEGORIE.MARKETING,
    titolo: 'Novità in vetrina',
    descrizione: 'Segnala un nuovo arrivo a chi ha dato il consenso. Per concessionari, agenzie, negozi.',
    corpo: 'Ciao {{1}}, è appena arrivato: {{2}}. Guarda i dettagli qui: {{3}}. Se non ti interessa più ricevere queste novità, scrivici STOP.',
    variabili: [
      { chiave: 'nome', etichetta: 'Nome del cliente', esempio: 'Mario' },
      { chiave: 'titolo', etichetta: 'Cosa è arrivato', esempio: 'Golf 1.6 TDI del 2019' },
      { chiave: 'link', etichetta: 'Link alla scheda', esempio: 'https://…' },
    ],
  },
  {
    key: 'richiesta_recensione',
    versione: 1,
    categoria: CATEGORIE.UTILITY,
    titolo: 'Richiesta recensione',
    descrizione: 'Dopo il lavoro o il soggiorno, chiede un parere con un link diretto.',
    corpo: 'Ciao {{1}}, grazie per aver scelto {{2}}. Se hai un minuto, ci lasceresti un tuo parere? Ecco il link: {{3}}. Per noi conta molto.',
    variabili: [
      { chiave: 'nome', etichetta: 'Nome del cliente', esempio: 'Mario' },
      { chiave: 'attivita', etichetta: 'Nome della tua attività', esempio: 'Garage 22' },
      { chiave: 'link', etichetta: 'Link alla recensione', esempio: 'https://…' },
    ],
  },
  {
    key: 'riattivazione',
    versione: 1,
    categoria: CATEGORIE.MARKETING,
    titolo: 'Torna a trovarci',
    descrizione: 'Per chi non si fa vedere da un po’: un promemoria con un motivo per tornare.',
    corpo: 'Ciao {{1}}, è passato un po’ dall’ultima volta da {{2}}. {{3}} Ti aspettiamo! Se preferisci non ricevere più questi messaggi, scrivici STOP.',
    variabili: [
      { chiave: 'nome', etichetta: 'Nome del cliente', esempio: 'Mario' },
      { chiave: 'attivita', etichetta: 'Nome della tua attività', esempio: 'Garage 22' },
      { chiave: 'motivo', etichetta: 'Il motivo per tornare', esempio: 'Fino a fine mese il tagliando è scontato del 20%.' },
    ],
  },
]

export const trovaTemplate = key => CATALOGO.find(t => t.key === key) || null

// Nome del template sull'account Meta: deve essere minuscolo con underscore e
// univoco per account. La versione entra nel nome, così due versioni convivono
// mentre i clienti migrano.
export const nomeMeta = (key, versione) => `oltrenova_${key}_v${versione}`

// Sostituisce i segnaposto con i valori scelti dal cliente: serve all'anteprima,
// perché nessuno deve inviare un messaggio senza aver visto come arriva davvero.
export function anteprima(key, valori = {}) {
  const t = trovaTemplate(key)
  if (!t) return ''
  return t.variabili.reduce(
    (testo, v, i) => testo.replaceAll(`{{${i + 1}}}`, valori[v.chiave] || `[${v.etichetta.toLowerCase()}]`),
    t.corpo,
  )
}

// Struttura richiesta da Meta per creare il template sull'account del cliente.
export function definizioneMeta(t) {
  return {
    name: nomeMeta(t.key, t.versione),
    language: 'it',
    category: t.categoria,
    components: [
      {
        type: 'BODY',
        text: t.corpo,
        example: { body_text: [t.variabili.map(v => v.esempio)] },
      },
    ],
  }
}
