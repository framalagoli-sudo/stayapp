// I testi della pagina di un evento, nelle lingue del sito.
//
// Erano scritti fissi in italiano dentro `EventoPage`: su `/en` il titolo e la
// descrizione uscivano tradotti e tutto il resto — modulo, pulsanti, avvisi —
// no. L'italiano qui è parola per parola quello che c'era.
//
// ⚠️ I messaggi che arrivano dalle route (posti finiti, telefono mancante)
// restano in italiano: li scrive il server, che non sa in che lingua si legge.
//
// Nessuna dipendenza: lo legge il browser.
const TESTI = {
  it: {
    nonTrovato: 'Evento non trovato.',
    caricamento: 'Caricamento…',
    tornaIndietro: '← Torna indietro',
    indietro: 'Indietro',
    tornaA: nome => `Torna a ${nome}`,
    tornaAlSito: 'Torna al sito',
    vaiA: nome => `Vai a ${nome}`,
    vaiAlSito: 'Vai al sito',
    postiDisponibili: n => `${n} posti disponibili`,
    esaurito: 'Tutto esaurito',
    gratuito: 'Gratuito',
    perPersona: '/ persona',

    concluso: 'Evento concluso',
    giaSvolto: 'Questo appuntamento si è già svolto.',
    prossimi: ' I prossimi li trovi sul sito.',
    chiuse: 'Prenotazioni chiuse',
    nonRaccogliamo: 'Non raccogliamo altre prenotazioni per questo appuntamento.',
    postiFiniti: 'I posti per questo appuntamento sono finiti.',

    inLista: 'Sei in lista',
    nonPrenotazione: 'Non è una prenotazione: se qualcuno rinuncia ti scriviamo noi. Non serve che tu faccia altro.',
    avvisiamo: 'Vuoi che ti avvisiamo?',
    lasciaContatto: 'Lasciaci un contatto: se qualcuno rinuncia sei il primo a saperlo. Nessun impegno.',
    avvisatemi: 'Avvisatemi se si libera',
    unAttimo: 'Un attimo…',

    prenota: 'Prenota',
    scegliPacchetto: 'Scegli pacchetto',
    gratis: 'Gratis',
    tuoiDati: 'I tuoi dati',
    nome: 'Nome e cognome *',
    email: 'Email *',
    telefono: 'Telefono',
    telefonoServe: 'Telefono *',
    telefonoFacoltativo: 'Telefono (opzionale)',
    quante: 'Per quante persone',
    posti: 'Posti:',
    note: 'Note o richieste particolari (facoltativo)',
    hoLetto: 'Ho letto e accetto',
    informativa: 'l’informativa sulla privacy',
    usoAttesa: 'I miei dati saranno usati per avvisarmi se si libera un posto.',
    usoPrenotazione: 'I miei dati saranno usati per gestire questa prenotazione.',
    invio: 'Invio in corso…',
    prenotaOra: 'Prenota ora',
    inviata: 'Prenotazione inviata!',
    mailSpedita: 'Ti abbiamo spedito una mail di conferma.',
    registrata: 'La tua prenotazione è stata registrata.',

    erNomeEmail: 'Servono nome ed email.',
    erConsenso: 'Serve il consenso al trattamento dei dati.',
    erQuante: 'Indica per quante persone.',
    erRiprova: 'Non è riuscito. Riprova.',
    erNome: 'Inserisci il tuo nome',
    erEmail: 'Inserisci la tua email',
    erTelefono: 'Per questo evento serve un numero di telefono',
    erQuantePrenota: 'Indica per quante persone vuoi prenotare',
  },
  en: {
    nonTrovato: 'Event not found.',
    caricamento: 'Loading…',
    tornaIndietro: '← Go back',
    indietro: 'Back',
    tornaA: nome => `Back to ${nome}`,
    tornaAlSito: 'Back to the website',
    vaiA: nome => `Go to ${nome}`,
    vaiAlSito: 'Go to the website',
    postiDisponibili: n => `${n} ${n === 1 ? 'seat' : 'seats'} available`,
    esaurito: 'Sold out',
    gratuito: 'Free',
    perPersona: '/ person',

    concluso: 'This event has ended',
    giaSvolto: 'This event has already taken place.',
    prossimi: ' You can find the upcoming ones on the website.',
    chiuse: 'Bookings closed',
    nonRaccogliamo: 'We are not taking any more bookings for this event.',
    postiFiniti: 'There are no seats left for this event.',

    inLista: 'You are on the list',
    nonPrenotazione: 'This is not a booking: if someone cancels, we will write to you. There is nothing else you need to do.',
    avvisiamo: 'Shall we let you know?',
    lasciaContatto: 'Leave us a contact: if someone cancels, you will be the first to know. No commitment.',
    avvisatemi: 'Let me know if a seat frees up',
    unAttimo: 'One moment…',

    prenota: 'Book',
    scegliPacchetto: 'Choose package',
    gratis: 'Free',
    tuoiDati: 'Your details',
    nome: 'Full name *',
    email: 'Email *',
    telefono: 'Phone',
    telefonoServe: 'Phone *',
    telefonoFacoltativo: 'Phone (optional)',
    quante: 'For how many people',
    posti: 'Seats:',
    note: 'Notes or special requests (optional)',
    hoLetto: 'I have read and accept',
    informativa: 'the privacy policy',
    usoAttesa: 'My data will be used to let me know if a seat frees up.',
    usoPrenotazione: 'My data will be used to manage this booking.',
    invio: 'Sending…',
    prenotaOra: 'Book now',
    inviata: 'Booking sent!',
    mailSpedita: 'We have sent you a confirmation email.',
    registrata: 'Your booking has been recorded.',

    erNomeEmail: 'Name and email are required.',
    erConsenso: 'Your consent to data processing is required.',
    erQuante: 'Tell us for how many people.',
    erRiprova: 'It did not work. Please try again.',
    erNome: 'Enter your name',
    erEmail: 'Enter your email',
    erTelefono: 'A phone number is required for this event',
    erQuantePrenota: 'Tell us how many people you want to book for',
  },
}

export function testiEvento(lang) {
  return TESTI[lang === 'en' ? 'en' : 'it']
}
