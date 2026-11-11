// Guida: «Calendario e risorse». Vedi lib/guida/index.js per le regole.
// Chi cambia una delle `pagine` rilegge questa scheda e aggiorna `rivista`.

export default {
  voce: 'booking',
  titolo: 'Calendario e risorse',
  rivista: '2026-11-11',
  percorsi: ['/admin/booking'],
  pagine: [
    'components/admin/booking/BookingCalendarioPage.jsx',
    'components/admin/booking/BookingRisorsePage.jsx',
    'components/admin/booking/CalendarioPrezzi.jsx',
    'components/admin/booking/BookingPrenotazioniPage.jsx',
    'components/admin/ModificaPrenotazione.jsx',
  ],
  // Ogni nome qui deve comparire scritto così in una delle pagine: se un
  // pulsante cambia nome, la guida non può continuare a citarlo.
  pulsanti: [
    '+ Nuova risorsa', 'Crea risorsa', 'Salva risorsa', 'A giornate (case, auto, camere, attrezzature)',
    'Sì — l’ultimo giorno resta occupato', 'Prezzi e regole', 'Cambia un periodo', 'Applica al periodo',
    'Riporta al prezzo base', 'Copia il', 'Calcola', 'Niente ritiro', 'Niente riconsegna',
    'Offerte', '+ Nuova offerta', 'Che tipo di offerta?', 'Sconto in percentuale', 'Pacchetto (es. weekend lungo)',
    'Quando si prenota', 'In anticipo (almeno … giorni prima)', 'Last minute (al massimo … giorni prima)', 'Salva offerta',
    'Prenota per un cliente', 'Tutte le prenotazioni', 'Modifica', 'Segna completata', 'Elimina',
  ],

  aCosaServe: 'Qui metti quello che i clienti prenotano dal tuo sito (un furgone, una casa, un campo, un tavolo), decidi prezzi e regole giorno per giorno, e vedi sul calendario chi ha prenotato cosa.',

  passi: [
    {
      titolo: 'Crea quello che si prenota',
      testo: [
        'Apri «Calendario e risorse» → «Risorse» e premi «+ Nuova risorsa».',
        'Scegli la modalità. Per un mezzo o una casa che si prende per più giorni: «A giornate (case, auto, camere, attrezzature)».',
        'Rispondi alla domanda sull’ultimo giorno. Per un noleggio scegli «Sì — l’ultimo giorno resta occupato»: chi prende il furgone sabato e lo riporta domenica paga due giorni, e la domenica nessun altro può prenotarlo.',
        'Metti il prezzo base al giorno, poi «Crea risorsa». Il prezzo base vale tutti i giorni in cui non scrivi altro.',
      ],
    },
    {
      titolo: 'Prezzi diversi in certi giorni (stagioni, weekend, ponti)',
      testo: [
        'Sulla risorsa premi «Prezzi e regole»: vedi il calendario con il prezzo di ogni giorno.',
        'In «Cambia un periodo» scegli dal… al…, se vuoi solo alcuni giorni della settimana (per esempio sabato e domenica), e scrivi il prezzo. Premi «Applica al periodo».',
        'Nello stesso riquadro puoi mettere un minimo di giorni per chi inizia in quei giorni (per esempio 7 a Ferragosto), oppure «Niente ritiro» / «Niente riconsegna» in certi giorni.',
        'Per vendere solo il weekend intero: sui sabati «Niente riconsegna», sulle domeniche «Niente ritiro». Così sabato e domenica si prendono insieme.',
        '«Riporta al prezzo base» cancella prezzi e regole del periodo scelto. «Copia il … sul …» ricopia tutto l’anno sull’anno dopo, con i sabati che restano sabati.',
        'Prima di salvare puoi controllare: in fondo scegli due date e premi «Calcola». È lo stesso conto che vedrà chi prenota dal sito, offerte comprese.',
      ],
    },
    {
      titolo: 'Offerte, sconti e pacchetti',
      testo: [
        'Sulla risorsa premi «Offerte», poi «+ Nuova offerta».',
        'In «Che tipo di offerta?» scegli: un prezzo speciale, uno «Sconto in percentuale», uno sconto di un importo, oppure un «Pacchetto (es. weekend lungo)» — per esempio venerdì → lunedì a 300 €, valido ogni settimana.',
        'In «Quando si prenota» puoi limitarla a chi prenota «In anticipo (almeno … giorni prima)» o «Last minute (al massimo … giorni prima)».',
        'Sotto vedi un esempio di quanto pagherà chi prenota. Poi «Salva offerta».',
      ],
    },
    {
      titolo: 'Il calendario e le prenotazioni prese al telefono',
      testo: [
        'In «Calendario» ogni giorno mostra se la risorsa è libera o occupata. Tocca un giorno per vedere chi c’è.',
        'Per segnare una prenotazione presa al telefono: tocca il giorno e premi «Prenota per un cliente». Il prezzo lo calcola il sistema, come sul sito.',
        'Su ogni prenotazione: «Modifica» (date, dati del cliente, totale), «Conferma», «Annulla», «Segna completata», «Elimina». «Tutte le prenotazioni» le mostra in elenco con i filtri.',
      ],
    },
  ],

  domande: [
    { d: 'Un cliente vuole il furgone per un giorno solo. Si può?',
      r: 'Sì: ritiro la mattina e riconsegna la sera dello stesso giorno. Sul sito si tocca il giorno due volte. Se invece hai messo un minimo di giorni su quel giorno (per esempio nei weekend), il sito lo rifiuta e dice qual è il minimo.' },
    { d: 'Perché il sabato da solo non si prenota?',
      r: 'Perché in «Prezzi e regole» quel sabato ha un minimo di giorni, oppure «Niente riconsegna». Lo vedi sul calendario dei prezzi: sotto il giorno compare «min» e il numero di giorni.' },
    { d: 'Se cambio un prezzo, cambia anche per chi ha già prenotato?',
      r: 'No. Ogni prenotazione tiene il conto del momento in cui è stata fatta. Se vuoi cambiarlo, apri la prenotazione e usa «Modifica».' },
    { d: 'Se valgono due offerte insieme, si sommano?',
      r: 'No: si applica la più conveniente per chi prenota.' },
    { d: 'Che differenza c’è tra «Annulla» ed «Elimina»?',
      r: '«Annulla» libera il posto e tiene la prenotazione nello storico. «Elimina» la cancella per sempre: usala solo per un errore di inserimento.' },
    { d: 'Posso fare un’eccezione al minimo per un cliente al telefono?',
      r: 'Sì, con «Modifica» su una prenotazione: tu puoi andare sotto il minimo o usare un giorno senza ritiro. Non puoi solo sovrapporti a un’altra prenotazione o usare un giorno chiuso.' },
  ],
}
