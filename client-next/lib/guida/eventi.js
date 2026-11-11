// Guida: «Eventi». Vedi lib/guida/index.js per le regole.
// Chi cambia una delle `pagine` rilegge questa scheda e aggiorna `rivista`.

export default {
  voce: 'eventi',
  titolo: 'Eventi',
  rivista: '2026-11-11',
  percorsi: ['/admin/eventi'],
  pagine: [
    'components/admin/eventi/EventiListPage.jsx',
    'components/admin/eventi/EventoEditPage.jsx',
    'components/admin/eventi/EventoPrenotazioniPage.jsx',
    'components/admin/ChiediPagamento.jsx',
  ],
  pulsanti: [
    'Nuovo evento', 'In programma', 'Passati', 'Prenotazioni →', 'Crea evento', 'Salva modifiche', 'Copertina',
    'Il prezzo, come lo vede chi guarda', 'Gratuito', 'Una cifra', 'Lo scrivo io',
    'Il pulsante di prenotazione', 'Posti disponibili', 'Di cui tenuti per il telefono', 'Quanto si paga prenotando (%)',
    'Pubblicato', 'Chiedi il telefono per forza', 'Non accetto piu prenotazioni',
    'Chi ha prenotato può annullare da solo', 'Quando si libera un posto, offrilo al primo in lista',
    'Avvisami di ogni prenotazione', "Manda conferma all'ospite", 'Aggiungi pacchetto', 'Post social',
    'Segna prenotazione', 'Scrivi a chi ha prenotato', 'Confermate', 'Attendono il pagamento', 'Da confermare',
    'Lista d’attesa', 'Non andate a buon fine', 'Conferma prenotazione', 'Conferma: paga sul posto', 'Assegna un posto',
    'Annulla prenotazione', 'Ripristina prenotazione', 'Modifica', 'Chiedi il pagamento', 'Elimina definitivamente',
  ],

  aCosaServe: 'Le tue serate, i corsi, le degustazioni: tutto quello che succede in un giorno e a un’ora precisi. Ogni evento ha la sua pagina sul sito, dove le persone prenotano; qui vedi chi viene e quanti posti restano.',

  passi: [
    {
      titolo: 'Creare un evento',
      testo: [
        'Premi «Nuovo evento», scrivi titolo, data e ora, descrizione e luogo, e premi «Crea evento». La «Copertina» si carica dopo il primo salvataggio.',
        'In «Il prezzo, come lo vede chi guarda» scegli cosa si legge sul sito: «Gratuito», «Una cifra» (quella del prezzo base) oppure «Lo scrivo io» (per esempio «alla carta»). Se non scegli niente, il prezzo non compare.',
        'Perché il pubblico lo veda accendi «Pubblicato» e salva con «Salva modifiche».',
      ],
    },
    {
      titolo: 'Posti e pagamenti',
      testo: [
        'In «Posti disponibili» metti la capienza vera. Se una parte la vendi al telefono, scrivila in «Di cui tenuti per il telefono»: il sito vende solo il resto e poi dice «esaurito».',
        '«Quanto si paga prenotando (%)»: 0 si paga all’ingresso, 100 si paga tutto subito, 30 è un acconto. Per incassare online serve un conto collegato in Pagamenti; senza, la prenotazione si registra e si paga sul posto.',
        'Con «Aggiungi pacchetto» crei varianti con prezzi diversi (solo ingresso, cena inclusa…).',
      ],
    },
    {
      titolo: 'Le regole della prenotazione',
      testo: [
        '«Il pulsante di prenotazione»: scegli cosa c’è scritto sul pulsante e le condizioni da leggere sotto.',
        '«Chiedi il telefono per forza» rende obbligatorio il telefono. «Non accetto piu prenotazioni» toglie il modulo ma lascia online la pagina, con un messaggio tuo.',
        '«Chi ha prenotato può annullare da solo» mette nella conferma un link per annullare, valido fino a quante ore prima decidi tu. Se aveva pagato online, il rimborso lo fai tu da Stripe: ti avvisiamo.',
        '«Quando si libera un posto, offrilo al primo in lista» manda un’email al primo della lista d’attesa, che ha un’ora per prenderlo (mezz’ora se l’evento è oggi).',
      ],
    },
    {
      titolo: 'Chi viene: le prenotazioni dell’evento',
      testo: [
        'Dall’elenco premi «Prenotazioni →». In cima trovi posti presi, numero di prenotazioni e quanto vale la serata (e quanto è già incassato online).',
        'Le persone sono divise in gruppi: «Confermate» (in ordine alfabetico, è l’elenco della porta), «Attendono il pagamento», «Da confermare», «Lista d’attesa», «Non andate a buon fine».',
        'Una prenotazione presa al telefono si segna con «Segna prenotazione»; subito dopo puoi premere «Chiedi il pagamento» per mandarle un link.',
        '«Scrivi a chi ha prenotato» manda un messaggio a tutti quelli che hanno lasciato un’email: un promemoria, o un cambio d’orario.',
      ],
    },
    {
      titolo: 'Cambiare una prenotazione',
      testo: [
        'Sotto ogni prenotazione c’è il pulsante del gesto principale: «Conferma prenotazione» (o «Conferma: paga sul posto» per chi stava pagando online), «Assegna un posto» per chi è in lista, «Annulla prenotazione», «Ripristina prenotazione».',
        '«Modifica» corregge nome, recapiti, posti e note, e ti dice prima quanti posti aggiungi o liberi.',
        '«Elimina definitivamente» cancella la prenotazione con tutti i suoi dati: per una disdetta usa «Annulla prenotazione», che la tiene nello storico.',
      ],
    },
  ],

  domande: [
    { d: 'Se annullo una prenotazione, il cliente viene avvisato?',
      r: 'No: «Annulla prenotazione» libera i posti ma non manda niente. Avvisalo tu. Se aveva pagato online, il rimborso si fa dalla tua dashboard di Stripe.' },
    { d: 'Ho spento «Manda conferma all\'ospite»: cosa succede?',
      r: 'Chi prenota non riceve nessuna email, e chi confermi dalla lista d’attesa non sa di essere entrato. La pagina delle prenotazioni te lo ricorda con un riquadro giallo.' },
    { d: 'Che differenza c’è fra «Attendono il pagamento» e «Da confermare»?',
      r: '«Attendono il pagamento»: la persona sta pagando dal sito, ha mezz’ora, poi o ha pagato o il posto si libera da solo. «Da confermare»: tocca a te confermarla o annullarla; intanto il posto è tenuto.' },
    { d: 'L’evento è pieno ma voglio lasciare la pagina online. Come faccio?',
      r: 'Accendi «Non accetto piu prenotazioni» e scrivi cosa leggerà chi arriva (per esempio che tieni una lista d’attesa). La pagina resta, sparisce solo il modulo.' },
    { d: 'Un evento senza associazione dove compare?',
      r: 'È un evento dell’azienda: compare sui siti di tutte le tue attività. Se lo associ a una, compare solo lì.' },
  ],
}
