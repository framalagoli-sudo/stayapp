// Guida: «Contatti». Vedi lib/guida/index.js per le regole.
// Chi cambia una delle `pagine` rilegge questa scheda e aggiorna `rivista`.

export default {
  voce: 'contatti',
  titolo: 'Contatti',
  rivista: '2026-11-11',
  percorsi: ['/admin/contatti'],
  pagine: [
    'components/admin/ContattiPage.jsx',
  ],
  pulsanti: [
    'Lista', 'Trattative', 'Importa', 'Esporta', 'Aggiungi', 'Scrivi a questa lista', 'Cerca nome, email, telefono…',
    'Contattabili', 'Tornati più volte', 'In trattativa', 'Email da correggere',
    'Aggiungi etichetta', 'Annulla selezione', 'Le tue note', 'Non in trattativa', 'Può ricevere promozioni',
    'Per email', 'Su WhatsApp', 'Copia il link per la recensione', 'Unisci a questa scheda',
    'Togliere questa persona', 'Elimina contatto', 'Rendi anonimo', 'Salva modifiche',
  ],

  aCosaServe: 'Tutte le persone che sono passate da te, in un posto solo: chi ha prenotato, comprato, scritto dal sito o compilato un modulo entra qui da solo, con la storia di quello che ha fatto.',

  passi: [
    {
      titolo: 'Le liste a sinistra',
      testo: [
        'Le liste si formano da sole da quello che le persone hanno fatto: una per ogni evento, risorsa, offerta o modulo, più «Tornati più volte» e chi si può contattare. Su telefono sono in un menu a tendina in cima.',
        'Ogni etichetta che scrivi diventa una lista. In fondo, se servono, compaiono «Possibili doppioni» ed «Email da correggere».',
        'Sotto il nome della lista leggi quante persone ci sono e quante hanno dato il consenso a ricevere promozioni: avere un contatto non vuol dire poterlo invitare.',
      ],
    },
    {
      titolo: 'Scrivere a una lista',
      testo: [
        'Scegli la lista e premi «Scrivi a questa lista»: nasce una newsletter già indirizzata, che trovi in Newsletter. Il numero sul pulsante è quanti la riceveranno davvero, cioè solo chi ha dato il consenso per email.',
        'Chi entra nella lista dopo, la riceve lo stesso: la lista si ricalcola al momento dell’invio.',
      ],
    },
    {
      titolo: 'La scheda di una persona',
      testo: [
        'Clic su una riga: si apre la scheda con i recapiti da toccare (email, telefono, WhatsApp), da dove arriva e la sua storia.',
        'Puoi scrivere «Le tue note», aggiungere etichette, metterla in una trattativa e, in «Può ricevere promozioni», segnare «Per email» o «Su WhatsApp». Spunta solo se la persona ti ha detto di sì: registriamo che l’hai segnato tu, oggi.',
        '«Copia il link per la recensione» ti dà il link da mandarle per chiederle una recensione. Poi «Salva modifiche».',
      ],
    },
    {
      titolo: 'Le trattative',
      testo: [
        'Il pulsante «Trattative» in alto mostra solo chi stai seguendo, in colonne (Da contattare, Contattato, In trattativa, Concluso, Perso); trascina una scheda per cambiarle colonna.',
        'Entra da solo chi ti chiede qualcosa (un messaggio dal sito, un preventivo); chi prenota o compra no. Chiunque altro lo metti tu dalla sua scheda.',
      ],
    },
    {
      titolo: 'Più persone insieme, importare, esportare',
      testo: [
        'Su computer spunta le righe: compare una barra per «Aggiungi etichetta», «Esporta» o eliminare, e «Annulla selezione» per uscire.',
        '«Importa» carica un file CSV; «Esporta» scarica in CSV i contatti della lista che stai guardando. «Aggiungi» crea un contatto a mano.',
      ],
    },
  ],

  domande: [
    { d: 'La stessa persona compare due volte. Come le unisco?',
      r: 'Apri una delle due schede: in basso c’è «Unisci a questa scheda», dove cerchi l’altra per nome, email o telefono. Restano i dati della scheda aperta; dell’altra si prende quello che manca. Non si può disfare, quindi controlla che sia davvero la stessa persona.' },
    { d: 'Una persona mi chiede di cancellare i suoi dati. Cosa faccio?',
      r: 'Nella sua scheda apri «Togliere questa persona» e premi «Rendi anonimo»: nome, email e telefono spariscono dalla scheda, dalle sue prenotazioni e dai moduli; i numeri delle serate restano giusti. Gli ordini del negozio no: sono documenti di vendita.' },
    { d: 'Che differenza c’è fra «Elimina contatto» e «Rendi anonimo»?',
      r: '«Elimina contatto» toglie la scheda e la sua storia, ma le prenotazioni restano col nome. «Rendi anonimo» toglie i dati personali ovunque. Per una richiesta di cancellazione usa il secondo.' },
    { d: 'Perché «Scrivi a questa lista» è grigio?',
      r: 'Perché nessuno in quella lista ha dato il consenso a ricevere email. Il consenso si chiede nei moduli di prenotazione con la casella facoltativa per le promozioni.' },
    { d: 'Entrare fra i contatti iscrive alla newsletter?',
      r: 'No. Una persona riceve promozioni solo se ha detto di sì, o se l’hai segnato tu perché te l’ha detto.' },
  ],
}
