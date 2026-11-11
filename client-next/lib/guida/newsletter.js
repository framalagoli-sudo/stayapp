// Guida: «Newsletter». Vedi lib/guida/index.js per le regole.
// Chi cambia una delle `pagine` rilegge questa scheda e aggiorna `rivista`.

export default {
  voce: 'newsletter',
  titolo: 'Newsletter',
  rivista: '2026-11-11',
  percorsi: ['/admin/newsletter'],
  pagine: [
    'components/admin/NewsletterPage.jsx',
    'components/admin/NewsletterEditorPage.jsx',
    'components/admin/NewsletterStatistiche.jsx',
  ],
  pulsanti: [
    'Nuova newsletter', 'Bozze', 'Archivio inviate', 'Duplica',
    'Destinatari', 'Tutti gli iscritti', 'Escludi chi è in…', 'Modello', 'Semplice', 'Promozione', 'Notizie', 'Evento',
    'Oggetto email', 'Testo anteprima (preheader)', '✨ Genera oggetto', '✨ Genera testo',
    'Programmazione invio', 'Rimuovi programmazione', 'Salva bozza', 'Anteprima', 'Computer', 'Telefono',
    'Invia email di test', 'Invia la newsletter', 'Invia ora',
    'Com’è andata', 'Hanno cliccato', 'L’hanno aperta', 'Non arrivate', 'Disiscritti', 'Cosa hanno premuto',
  ],

  aCosaServe: 'Email per le persone che ti hanno detto sì: una serata in arrivo, un’offerta, le novità del mese. Scrivi, vedi come arriva, e dopo l’invio leggi com’è andata.',

  passi: [
    {
      titolo: 'Scriverne una',
      testo: [
        'Premi «Nuova newsletter». L’editor va nell’ordine in cui ci pensi: a chi la mandi, che modello, l’oggetto, il contenuto, quando parte.',
        'In «Destinatari» scegli «Tutti gli iscritti» o una delle liste dei Contatti; sotto leggi subito a quante persone arriverà. Con «Escludi chi è in…» togli una lista (per esempio chi ha già prenotato la serata che stai promuovendo).',
        'Scegli il «Modello»: «Semplice», «Promozione», «Notizie» o «Evento». Se cambi modello resta quello che il nuovo sa mostrare.',
        'Scrivi l’«Oggetto email» e il «Testo anteprima (preheader)», la riga che si legge nella casella accanto all’oggetto. «✨ Genera oggetto» e «✨ Genera testo» ti propongono una bozza con l’AI.',
      ],
    },
    {
      titolo: 'Vedere come arriva',
      testo: [
        'A destra c’è l’anteprima dell’email vera, con la riga com’è nella casella di posta; puoi passare fra «Computer» e «Telefono». Su telefono si alterna col pulsante «Anteprima».',
        '«Invia email di test» te ne manda una copia per vederla nella tua casella.',
      ],
    },
    {
      titolo: 'Mandarla',
      testo: [
        'Subito: «Invia la newsletter» ti dice a quante persone arriva e parte con «Invia ora».',
        'Più tardi: in «Programmazione invio» scegli giorno e ora e premi «Salva bozza». Per tornare all’invio a mano usa «Rimuovi programmazione».',
        'Arriva solo a chi è nella lista scelta e ha dato il consenso. Chi si iscrive o prenota dopo che hai scritto la bozza è contato al momento dell’invio.',
      ],
    },
    {
      titolo: 'Com’è andata',
      testo: [
        'Apri una newsletter dall’«Archivio inviate»: in cima c’è «Com’è andata», con quante sono partite, chi ha cliccato, chi l’ha aperta, quelle non arrivate e chi si è disiscritto.',
        '«Cosa hanno premuto» dice quali link sono stati cliccati. Le aperture sono una stima (alcuni programmi di posta le aprono da soli): il numero che conta sono i clic.',
      ],
    },
  ],

  domande: [
    { d: 'Perché il conto dei destinatari è più basso dei miei contatti?',
      r: 'Perché la newsletter arriva solo a chi ha dato il consenso a ricevere promozioni per email. Avere un contatto non vuol dire poterlo invitare.' },
    { d: 'La newsletter programmata non è partita. Perché?',
      r: 'Di solito perché la lista scelta (o una lista esclusa) non esiste più, o perché non c’è più nessuno a cui mandarla: l’invio si ferma invece di partire verso le persone sbagliate. Resta in «Bozze»: aprila, controlla i destinatari e salvala di nuovo.' },
    { d: 'Posso riusare una newsletter già inviata?',
      r: 'Sì: nell’elenco premi «Duplica». Nasce una bozza uguale, da cambiare e mandare.' },
    { d: 'Chi si disiscrive viene tolto da solo?',
      r: 'Sì. Ogni email ha il link per annullare l’iscrizione, e chi lo usa (o il pulsante del suo programma di posta) non riceve più promozioni. Resta scritto quando e come si è tolto.' },
    { d: 'Una newsletter inviata si può modificare?',
      r: 'No: è partita così. Puoi duplicarla per mandarne una nuova.' },
  ],
}
