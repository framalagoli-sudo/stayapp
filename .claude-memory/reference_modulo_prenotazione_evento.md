---
name: reference_modulo_prenotazione_evento
description: "Il modulo con cui si prenota un evento è FISSO nel codice — campi non configurabili; la colonna note esiste e la route la accetta, ma il sito non la manda mai"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-21T19:00:50.560Z
---

**Verificato il 21/09/2026** leggendo `components/guest/EventoPage.jsx` e
`app/api/guest/eventi/[id]/book/route.js`.

**I campi sono scritti nel componente**, non configurabili da nessuna parte:
- Nome e cognome — **obbligatorio** (controllato anche nella route: 400)
- Email — **obbligatoria** (idem)
- Telefono — facoltativo, **oppure obbligatorio** se chi organizza accende «Chiedi il telefono per forza» (migration 125). Controllo anche nella route.
- Per quante persone — numero, minimo 1
- Consenso privacy — **obbligatorio**, e il controllo vero sta nella route
  (`privacy_accettata !== true` → 400), con la formula decisa dal server
- Scelta del pacchetto — compare solo se l'evento ha pacchetti

**Configurabile dall'evento** (non il modulo, ciò che gli sta intorno): testo
del pulsante, condizioni sotto il pulsante, prezzo e modo prezzo, posti,
chiusura delle prenotazioni, lista d'attesa, notifica al titolare, conferma
all'ospite, promemoria.

✅ **Il campo «Note o richieste particolari» ora c'è** (21/09/2026), su
entrambe le porte — pagina dell'evento e app del QR. Era «un tubo senza
rubinetto»: la colonna in `event_bookings` e la sua riga nell'admin esistevano
da sempre, mancava solo il campo dove scriverle.

⛔ **E il modulo dentro l'app del QR era rotto**: non mandava
`privacy_accettata`, che la route pretende dal 25/08 → **400 a ogni
prenotazione**, senza nessuna spunta da mettere. Un vicolo cieco, in silenzio
per un mese, scoperto cercando altro e riprodotto con una chiamata vera prima
di correggerlo.

Il **Form Builder** ha invece campi definiti dal cliente con `required` per
campo, ma è un sistema a sé: salva `submissions`, non prenotazioni — niente
posti, niente acconto Stripe, niente lista d'attesa. Non è un sostituto.

## Dal pannello si corregge e si cancella (22/09/2026)

⛔ Prima si poteva solo cambiare **stato** e note: una prenotazione presa male
— «per 15 invece che per 5», Garage 22 — si poteva solo annullare e riscrivere
a mano, perdendo data originale e prova del consenso.

Ora la PATCH accetta anche `seats`, `guest_name`, `guest_email` e `guest_phone`,
ed esiste una **DELETE** che cancella davvero (per «annullata» i dati personali
restavano a vita: non è una cancellazione ai sensi dell'art. 17 GDPR).
- Il **totale si rilegge** dal prezzo dell'evento o del pacchetto, mai dalla
  richiesta; se la prenotazione risulta pagata il pannello avvisa che l'incasso
  non cambia.
- Il tetto di chi corregge è la **capienza piena**: i posti riservati al
  telefono sono suoi.
- `recomputeEventSeats` gira anche quando cambiano solo i posti.
- Sonda `probe-prenotazione-correzione.mjs`: 10 controlli su un evento creato e
  cancellato dalla sonda stessa, email spente, casi ostili compresi.

Vedi [[reference_eventi_notifiche_email]], [[reference_consenso_dati_personali]],
[[reference_motore_senza_porta]].
