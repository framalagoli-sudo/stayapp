---
name: project_session_2026_09_16
description: "Sessione 16/09/2026 — verifica aziendale Meta approvata, collegamento WhatsApp vero (Embedded Signup v4), numeri per entità, sezione «Messaggi e social» sulla home"
metadata: 
  node_type: memory
  type: project
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-16T17:25:04.351Z
---

Tutto **live e provato in produzione**. Migration eseguite: fino alla **122**.

**Meta**: verifica aziendale **approvata** (era stata respinta il 15/09 perché la ragione sociale non era sul sito). Rimane a Francesco la **verifica dell'accesso** (Tech Provider): testo pronto in italiano e inglese, dichiarato anche l'uso futuro di Pagina e Instagram così non va rifatto. Risposte al modulo: «gestisci più portfolio business?» → **No** (ogni cliente resta proprietario del suo; noi abbiamo solo il nostro); sito → `https://www.oltrenova.com`.

**WhatsApp, il collegamento esiste davvero** → [[project_whatsapp_fase0]], nota 38 in CLAUDE.md:
- Embedded Signup **v4** in `components/admin/CollegaWhatsApp.jsx`; origini Meta confrontate per uguaglianza.
- ⛔ **Due passi obbligatori che mancavano**, emersi solo perché Francesco ha chiesto «ma basta solo quello che hai scritto?»: `subscribed_apps` (senza: nessuno stato di consegna) e `register` col PIN (senza: **ogni invio rifiutato**). Lezione: quando dichiaro finito un pezzo che parla con un fornitore, **la sequenza completa va verificata sulla documentazione**, non solo il pezzo che ho scritto.
- **Un numero per entità** (migration 122) + `lib/whatsapp-account.js` come unico punto. I 4 lettori con `.maybeSingle()` su azienda si sarebbero rotti al primo cliente con due numeri: difetto trovato leggendo tutti i punti prima di scrivere, non dopo.
- Sonda `probe-whatsapp-numeri.mjs` verde in produzione; pagina WhatsApp aperta dal browser, nessun errore JS.

**Home**: nuova sezione **«Messaggi e social»** (`/#canali`, voce nel menu), perché la verifica dell'accesso pretende che il servizio dichiarato si veda sul sito — e WhatsApp compariva una volta sola, come pulsante per scrivere a NOI. Le frasi dicono chi possiede gli account e chi paga: le stesse della dichiarazione a Meta.

**Stato mattutino della piattaforma** (controllato): nessun cron in ritardo, 3 domini custom attivi, consumi AI del mese ~0.

**Aperto**: prova dal vivo del collegamento (unico pezzo **scritto e non provato**) · coesistenza (forse un `featureType` negli extras) · tariffe Meta Italia al posto di quelle Spoki · due video per l'App Review · `META_ES_CONFIG_ID` + chiavi in `.env.local` (le mette Francesco, mai dalla chat) · segreto dell'app da rigenerare.
