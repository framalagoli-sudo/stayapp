// Guida: «Eventi». Vedi lib/guida/index.js per le regole.
// Chi cambia una delle `pagine` rilegge questa scheda e aggiorna `rivista`.

export default {
  voce: 'eventi',
  titolo: 'Eventi',
  rivista: '2026-11-25',
  percorsi: ['/admin/eventi'],
  pagine: [
    'components/admin/eventi/EventiListPage.jsx',
    'components/admin/eventi/EventoEditPage.jsx',
    'components/admin/eventi/EventoPrenotazioniPage.jsx',
    'components/admin/ChiediPagamento.jsx',
  ],
  pulsanti: [
    'Nuovo evento', 'In programma', 'Passati', 'Prenotazioni →', 'Crea evento', 'Salva modifiche', 'Copertina',
    'Il prezzo, come lo vede chi guarda', 'Gratuito', 'Una cifra', 'Lo scrivo io', 'Cosa comprende il prezzo',
    'Il pulsante di prenotazione', 'Posti disponibili', 'Di cui tenuti per il telefono', 'Quanto si paga prenotando (%)',
    'Mostra quanti posti restano', 'Sempre', 'Quando stanno finendo', 'Mai',
    'Pubblicato', 'Chiedi il telefono per forza', 'Non accetto piu prenotazioni',
    'Chi ha prenotato può annullare da solo', 'Quando si libera un posto, offrilo al primo in lista',
    'Avvisami di ogni prenotazione', "Manda conferma all'ospite", 'Più proposte con prezzi diversi', 'Opzioni e prezzi', 'Aggiungi opzione', 'Post social',
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
        'In «Cosa comprende il prezzo» scrivi in una riga cosa si compra (per esempio «Cena + spettacolo dal vivo»): si legge sotto il prezzo, nel riepilogo prima di pagare, alla cassa e nell’email di conferma.',
        'Perché il pubblico lo veda accendi «Pubblicato» e salva con «Salva modifiche».',
      ],
    },
    {
      titolo: 'Posti e pagamenti',
      testo: [
        'In «Posti disponibili» metti la capienza vera. Se una parte la vendi al telefono, scrivila in «Di cui tenuti per il telefono»: il sito vende solo il resto e poi dice «esaurito».',
        '«Quanto si paga prenotando (%)»: 0 si paga all’ingresso, 100 si paga tutto subito, 30 è un acconto. Per incassare online serve un conto collegato in Pagamenti; senza, la prenotazione si registra e si paga sul posto.',
        'Più proposte nella stessa serata (per esempio «Cena & spettacolo» ai tavoli e «Ingresso + drink» al bancone): premi «Più proposte con prezzi diversi». Il prezzo e i posti di adesso diventano la prima opzione, e se c’erano già prenotazioni vanno lì.',
        'In «Opzioni e prezzi» ogni opzione ha nome, prezzo, posti (vuoto = senza limite), quanti tenerne per il telefono e quanto si paga prenotando: per esempio la cena al 100% e l’ingresso allo 0%, sul posto. I posti dell’evento sono la somma delle opzioni, li calcoliamo noi. Con «Aggiungi opzione» ne metti un’altra.',
        'Chi prenota sceglie quante di ognuna (1 cena e 2 ingressi, solo cene, solo ingressi) e vede il totale. Paga adesso la somma delle quote, il resto sul posto. Un’opzione esaurita si chiude da sola mentre le altre restano prenotabili, e chi la voleva si mette in lista d’attesa per quella.',
        'Con più proposte «Cosa comprende il prezzo» si scrive dentro ogni opzione (se l’avevi già scritto, passa nella prima): chi prenota legge solo quello dell’opzione che sceglie, anche alla cassa e nell’email.',
        'Come si paga non serve scriverlo: sotto il prezzo di ogni opzione la pagina dice da sola «Si paga sul posto», «30% alla prenotazione, il resto sul posto» o «Si paga alla prenotazione», dalla percentuale che hai messo. Senza un conto collegato in Pagamenti dice sempre «Si paga sul posto», perché è quello che succede.',
        'Un’opzione che ha già delle prenotazioni non si può togliere: prima annullale o spostale con «Modifica».',
        '«Mostra quanti posti restano» decide se sul sito e nell’app del QR si legge il numero dei posti liberi. «Sempre» lo scrive fin dall’inizio («48 posti disponibili»). «Quando stanno finendo» non scrive niente finché è occupata la percentuale che scegli (da 1 a 99, per esempio 80%), poi «Restano 6 posti»: utile perché una sala che sembra vuota non invoglia. I posti tenuti per il telefono contano come occupati. «Mai» non lo scrive mai. «Esaurito» si vede in ogni caso, e con più proposte la scelta vale per ognuna, sui suoi posti.',
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
        'Dall’elenco premi «Prenotazioni →». In cima trovi posti presi, numero di prenotazioni e quanto vale la serata (e quanto è già incassato online). Se l’evento ha più opzioni, sotto c’è il conto di ognuna — quante cene, quanti ingressi, quanti in lista — e ogni prenotazione dice cosa ha preso.',
        'Le persone sono divise in gruppi: «Confermate» (in ordine alfabetico, è l’elenco della porta), «Attendono il pagamento», «Da confermare», «Lista d’attesa», «Non andate a buon fine».',
        'Una prenotazione presa al telefono si segna con «Segna prenotazione»; subito dopo puoi premere «Chiedi il pagamento» per mandarle un link.',
        '«Scrivi a chi ha prenotato» manda un messaggio a tutti quelli che hanno lasciato un’email: un promemoria, o un cambio d’orario.',
      ],
    },
    {
      titolo: 'Cambiare una prenotazione',
      testo: [
        'Sotto ogni prenotazione c’è il pulsante del gesto principale: «Conferma prenotazione» (o «Conferma: paga sul posto» per chi stava pagando online), «Assegna un posto» per chi è in lista, «Annulla prenotazione», «Ripristina prenotazione».',
        '«Modifica» corregge nome, recapiti, posti e note, e ti dice prima quanti posti aggiungi o liberi. Con più opzioni cambi la quantità di ognuna.',
        '«Elimina definitivamente» cancella la prenotazione con tutti i suoi dati: per una disdetta usa «Annulla prenotazione», che la tiene nello storico.',
      ],
    },
  ],

  domande: [
    { d: 'Apro un evento e per un attimo vedo «Caricamento…»: è normale?',
      r: 'Sì: è il momento in cui arrivano i dati dell’evento, e il modulo compare solo quando ci sono tutti — così quello che scrivi non viene sovrascritto. Se invece leggi «Evento non trovato», l’evento è stato eliminato.' },
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
