// Guida: «Prenotazioni». Vedi lib/guida/index.js per le regole.
// Chi cambia una delle `pagine` rilegge questa scheda e aggiorna `rivista`.

export default {
  voce: 'prenotazioni',
  titolo: 'Prenotazioni',
  rivista: '2026-11-11',
  percorsi: ['/admin/prenotazioni'],
  pagine: [
    'components/admin/BookingsPage.jsx',
    'components/admin/ModificaPrenotazione.jsx',
    'components/admin/ChiediPagamento.jsx',
  ],
  pulsanti: [
    'Da guardare', 'Tutte', 'Modifica', 'Conferma', 'Annulla', 'Segna completata', 'Chiedi il pagamento',
    'Avvisa il cliente via email con i dati nuovi', 'Col listino le date nuove costano', 'Copia link',
    'Oppure mandalo per email', 'Quanto chiedi',
  ],

  aCosaServe: 'Tutto quello che i tuoi clienti hanno prenotato, in un posto solo: eventi, risorse (un furgone, una casa, un campo) e offerte. In cima trovi quello che aspetta un tuo gesto.',

  passi: [
    {
      titolo: 'Cosa guardare per primo',
      testo: [
        'Se c’è qualcosa da fare, in cima compare il riquadro «Da guardare»: prenotazioni da confermare, persone che stanno pagando, liste d’attesa degli eventi.',
        'Le schede in alto («Tutte», «Eventi», «Offerte», «Risorse») filtrano l’elenco; la ricerca trova per nome, email, telefono o cosa è stato prenotato.',
        'Gli eventi compaiono con i loro numeri; i nomi di chi viene li trovi aprendo l’evento.',
      ],
    },
    {
      titolo: 'Cambiare una prenotazione',
      testo: [
        'Premi «Modifica» sulla prenotazione. Puoi cambiare le date (per le risorse a giornate), nome, telefono, email, note e totale.',
        'Se cambi le date, prima di salvare leggi «Col listino le date nuove costano …»: è il conto fatto con i tuoi prezzi. Se vuoi un prezzo diverso, scrivilo nel campo del totale: resta quello.',
        'Il cliente non viene avvisato da solo. Se vuoi che riceva un’email con i dati nuovi, spunta «Avvisa il cliente via email con i dati nuovi».',
      ],
    },
    {
      titolo: 'Confermare, annullare, chiudere',
      testo: [
        '«Conferma» compare sulle richieste che approvi tu: il cliente riceve la conferma.',
        '«Annulla» libera il posto; la prenotazione resta nello storico come annullata.',
        '«Segna completata» quando il servizio è stato fatto (per esempio il furgone è tornato).',
      ],
    },
    {
      titolo: 'Farsi pagare una prenotazione presa al telefono',
      testo: [
        'Premi «Chiedi il pagamento». In «Quanto chiedi» trovi proposta la cifra: l’acconto o il totale, e puoi cambiarla.',
        'Poi «Copia link» per incollarlo dove vuoi (WhatsApp, SMS), oppure usa «Oppure mandalo per email».',
        'Il link vale un giorno. Se il cliente non paga, la prenotazione resta com’è e si paga sul posto.',
      ],
    },
  ],

  domande: [
    { d: 'Perché su una prenotazione non c’è «Modifica»?',
      r: 'Perché è annullata (se il cliente la vuole ancora, creane una nuova) oppure perché il cliente sta pagando online proprio in quel momento: ha mezz’ora, poi o ha pagato o si libera da sola.' },
    { d: 'Ho cambiato le date di una prenotazione già pagata: cambia il totale?',
      r: 'No. Su una prenotazione già pagata online le date e i dati si cambiano, il totale no. Se c’è una differenza da incassare usa «Chiedi il pagamento»; un rimborso si fa dalla tua dashboard di Stripe.' },
    { d: 'Posso spostare una prenotazione su giorni già occupati?',
      r: 'No: il sistema lo rifiuta e la prenotazione resta com’era. Prima sposta o annulla quella che occupa quei giorni.' },
    { d: 'Il cliente ha ricevuto qualcosa quando ho modificato?',
      r: 'Solo se hai spuntato «Avvisa il cliente via email con i dati nuovi». Dopo il salvataggio la finestra ti dice se l’email è partita; se non c’è un indirizzo, avvisalo tu al telefono.' },
    { d: '«Attende il pagamento» e «Da confermare» sono la stessa cosa?',
      r: 'No. «Attende il pagamento»: il cliente sta pagando dal sito, non devi fare niente. «Da confermare»: tocca a te approvarla o annullarla.' },
  ],
}
