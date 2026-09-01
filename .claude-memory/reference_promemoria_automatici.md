---
name: reference-promemoria-automatici
description: "I promemoria delle prenotazioni — modelli pronti che nascono attivi, canale email/WhatsApp per step, e i tre vincoli Meta che decidono se il messaggio parte davvero"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-01T12:52:05.639Z
---

**Il promemoria dell'appuntamento parte 24 ore prima della visita, per email e —
quando le condizioni ci sono — su WhatsApp.**

Il motore esisteva da mesi con ZERO automazioni configurate: la storia di come
si apre una funzione senza porta sta in [[reference_motore_senza_porta]]. Qui c'è
come funziona il pezzo, e cosa può fermarlo.

## I pezzi

- `lib/automazioni-modelli.js` — i tre modelli che si accendono con un clic dallo
  stato vuoto di `/admin/automazioni`. **Nascono attivi.**
- `lib/automazioni-canali.js` — il canale dello step e i valori del template.
  **Nessun import**: lo legge il browser.
- `lib/guest-utils.js` → `triggerAutomazione` — mette in coda. Uno step
  «Email e WhatsApp» lascia **due righe**, una per canale.
- `lib/automazioni-scheduler.js` — il cron le raccoglie e invia.
- `GET /api/guest/canali/{tipo}/{id}` — dice al modulo di prenotazione se ha
  senso mostrare la spunta WhatsApp. Pubblica, restituisce **un solo booleano**.
- Migration `103` — `automazioni_log.canale` + `contact_telefono`, e
  `contact_email` diventa opzionale.

## ⚠️ Su WhatsApp non viaggia il testo che scrive il cliente

Un messaggio che parte da noi — non una risposta a chi ci ha scritto — richiede
un **template approvato da Meta**. Perciò lo step con canale WhatsApp non porta
un testo: porta la **scelta** di quale messaggio del catalogo usare
(`wa_template`, oggi `promemoria_appuntamento`). I buchi si riempiono dalle
stesse variabili dell'automazione. Non è una nostra limitazione.

**Tre condizioni, tutte necessarie**, e se ne manca una parte solo l'email:
1. il numero WhatsApp dell'azienda è collegato (`whatsapp_account.stato`);
2. quel template è approvato **su quell'account** (sono asset del singolo numero);
3. la persona ha dato il **consenso** e ha lasciato il numero.

L'editor le dice tutte e tre in chiaro, invece di lasciarle scoprire dal
messaggio mai arrivato.

## Il consenso: si raccoglie dove serve, e si verifica al momento dell'invio

Prima non lo raccoglieva nessuno lungo il percorso di prenotazione — quindi il
canale non sarebbe mai partito, di nuovo un motore senza porta. Ora:

- la spunta compare nel modulo **solo se un avviso partirebbe davvero** (route
  `guest/canali`): *un consenso che non serve a niente non si chiede*, ed è
  esattamente ciò che il GDPR chiama raccolta eccessiva;
- si salva la **prova** — quando e da dove (`whatsapp_optin_il`,
  `whatsapp_optin_fonte: 'modulo di prenotazione'`), come in
  [[reference_consenso_dati_personali]];
- ⚠️ **il contatto si tocca solo se il consenso è stato dato.** Prenotare non è
  iscriversi a niente: chi non spunta resta com'era;
- 🔒 il consenso si ricontrolla **all'invio**, non solo in coda: fra la
  prenotazione e il promemoria passano ore, e nel frattempo si può revocare.

## Due difetti trovati facendo questo, che valgono da soli

- **Il branding delle email automatiche leggeva le tabelle vecchie**
  (`properties`/`ristoranti`/`attivita`), ferme dalla migration 079. Le entità
  create dopo lì non esistono: l'email partiva firmata **«OltreNova»** invece che
  col nome del cliente. Nessun errore, nessun log — solo la firma sbagliata.
  Misurate 2 entità su 15, e **tutte** quelle future. Vedi
  [[reference_entita_unificata]].
- **Il super_admin non poteva creare un'automazione**: vedi
  [[reference_super_admin_senza_azienda]].
