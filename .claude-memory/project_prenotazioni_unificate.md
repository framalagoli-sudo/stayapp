---
name: project_prenotazioni_unificate
description: "L'unificazione delle prenotazioni — analisi completa, cosa è fatto e cosa resta (in corso dal 28/08/2026)"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-28T08:23:37.135Z
---

# Le prenotazioni: da cinque posti a uno

Analisi chiesta da Francesco il **28/08/2026**: *«a livello di user experience
siamo molto lontani da una soluzione»*. Aveva ragione, e il censimento ha
trovato di peggio del disordine.

## Il censimento (fatto, non a memoria)

| dove finiva | che cos'è | quante |
|---|---|---|
| `prenotazioni` | risorse booking: case, auto, campi, tavoli | 2 |
| `event_bookings` | eventi | 6 |
| `requests` | escursioni, attività, interesse offerta | 6 su 16 |
| `requests` | richieste di servizio (reception, pulizie, guasti) | 10 su 16 |
| `ordini` | shop | 0 |

E **due voci di menu chiamate entrambe «Prenotazioni»**: `/admin/prenotazioni`
(escursioni) e `/admin/booking/prenotazioni` (risorse).

## I due difetti veri che sono emersi

⚠️ **Metà delle prenotazioni non compariva nella pagina «Prenotazioni».** La
pagina le riconosceva cercando `[Prenotazione` all'inizio del messaggio, ma i
componenti scrivevano `Prenotazione escursione:` e `Richiesta prenotazione:`,
**senza la quadra**. Finivano fra reception e guasti. Rotto **due volte in
silenzio**: distinguere un dato dal prefisso di una stringa regge finché
nessuno tocca il testo.

⚠️ **I posti non si consumavano mai.** `posti_occupati` era letto in un punto
solo e incrementato da nessuno: un'offerta con 4 posti ne accettava infiniti.

## Le decisioni prese con Francesco

- **Gli eventi restano fuori**, tabella e prenotazioni comprese. La ragione è
  sua ed è migliore della mia: *«catalogo → offerte → shop sono consequenziali,
  l'evento no»*. Un evento non è una cosa che possiedi e poi metti in offerta:
  è un fatto che accade. Scritto in `CLAUDE.md`.
- **Shop = Ordini + Clienti**, alla Shopify. Un ordine non occupa un posto nel
  tempo, occupa **stock**: è giusto tenerlo separato.
- **Restare generici**: se un campo serve a una sola modalità sta dentro
  `disponibilita` (JSONB); diventa colonna solo se lo usano tutti o se ci si
  deve cercare sopra.
- Nessun dato di prenotazione è vero: **sono tutti di prova**. È la finestra
  buona, come lo era per lo shop.

## L'analisi dei campi (misurata)

- `offerte` conteneva **già tutti** i 28 campi di `eventi` — zero mancanti.
- Delle `risorse` ne mancavano **tre**: `anticipo_ore`, `cancellazione_ore`,
  `conferma_auto`. `visibile_minisito` non serviva: `pubblicata` fa quel lavoro.
- `prenotazioni` era già la più completa: le mancavano `offerta_id`,
  `messaggio` e la prova del consenso. E `risorsa_id` era obbligatorio — una
  prenotazione da offerta non ha una risorsa.

## ✅ Fatto e live (migration 095 eseguita)

- `POST /api/guest/prenota` → le prenotazioni vanno in `prenotazioni` con
  `offerta_id`. Consenso obbligatorio lato server.
- **I posti si ricalcolano contando le righe vive**, non si incrementano: un
  contatore che si somma può divergere e dire «esaurito» a chi poteva
  prenotare. Contare è sempre vero.
- `ActivitiesTab` chiedeva solo la camera — stesso difetto corretto sulle
  escursioni il 26/08 e mai esteso. Ora nome, recapito, consenso.
- La pagina «Prenotazioni» legge la tabella, con filtri e ricerca. Una voce
  sola nel menu; sotto Booking resta «Risorse».
- Sonda: `probe-prenotazioni-unificate.mjs` (14 controlli).

## ⏭️ Cosa resta

1. **Le risorse booking dentro le offerte.** I tre campi sono già nel database
   (migration 095). Servono: migrare le 2 risorse (di prova), portare i campi
   di disponibilità nell'editor offerte, far leggere al `BookingWidget` le
   offerte invece delle risorse, togliere «Risorse» dal menu.
2. **Shop → Ordini e Clienti** (Shopify).
3. **Le pagine vecchie Attività ed Escursioni** nel menu dell'entità scrivono
   ancora nei campi vecchi mentre il sito legge da `offerte`: due porte per la
   stessa stanza, **lo stesso difetto già chiuso sullo shop**.
4. Le vecchie prenotazioni dentro `requests` (6 righe di prova) restano lì; il
   filtro sul prefisso sopravvive **solo** per non mostrarle fra le richieste.
   Quando si esauriscono, quella riga si toglie (annotato nel codice).

Vedi anche [[project_catalogo_strati]] e [[feedback_verificare_il_contesto]].
