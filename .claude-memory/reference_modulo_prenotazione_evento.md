---
name: reference_modulo_prenotazione_evento
description: "Il modulo con cui si prenota un evento è FISSO nel codice — campi non configurabili; la colonna note esiste e la route la accetta, ma il sito non la manda mai"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-21T16:30:28.150Z
---

**Verificato il 21/09/2026** leggendo `components/guest/EventoPage.jsx` e
`app/api/guest/eventi/[id]/book/route.js`.

**I campi sono scritti nel componente**, non configurabili da nessuna parte:
- Nome e cognome — **obbligatorio** (controllato anche nella route: 400)
- Email — **obbligatoria** (idem)
- Telefono — facoltativo, e non c'è modo di renderlo obbligatorio
- Per quante persone — numero, minimo 1
- Consenso privacy — **obbligatorio**, e il controllo vero sta nella route
  (`privacy_accettata !== true` → 400), con la formula decisa dal server
- Scelta del pacchetto — compare solo se l'evento ha pacchetti

**Configurabile dall'evento** (non il modulo, ciò che gli sta intorno): testo
del pulsante, condizioni sotto il pulsante, prezzo e modo prezzo, posti,
chiusura delle prenotazioni, lista d'attesa, notifica al titolare, conferma
all'ospite, promemoria.

⚠️ **`notes` è un tubo senza rubinetto**: la colonna esiste in
`event_bookings`, la route la accetta (`notes: notes || null`) e l'admin la
mostra — sia nella prenotazione inserita a mano sia nell'elenco. Ma il modulo
pubblico **non la manda mai**: nessun campo sul sito. È la modifica più
economica se serve un «note / richieste particolari».

Il **Form Builder** ha invece campi definiti dal cliente con `required` per
campo, ma è un sistema a sé: salva `submissions`, non prenotazioni — niente
posti, niente acconto Stripe, niente lista d'attesa. Non è un sostituto.

Vedi [[reference_eventi_notifiche_email]], [[reference_consenso_dati_personali]],
[[reference_motore_senza_porta]].
