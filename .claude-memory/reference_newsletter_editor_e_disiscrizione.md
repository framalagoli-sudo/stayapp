---
name: reference-newsletter-editor-e-disiscrizione
description: "Newsletter dal 05/10/2026: anteprima e miniature disegnate dallo stesso costruttore dell'invio; destinatari per lista coi numeri veri; List-Unsubscribe su www (l'apex dà 308 alla POST); revoca con data e modo; in locale RESEND_API_KEY non c'è, quindi l'invio vero si prova solo in produzione verso delivered@resend.dev"
metadata:
  node_type: memory
  type: reference
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-05T17:00:19.312Z
---

- **Un solo disegno dell'email**: `buildNewsletterHtml` (`lib/newsletter-html.js`, nessuna dipendenza → il browser lo importa). Lo usano invio, email di prova, anteprima e miniature. Prima l'editor aveva una copia sua, nascosta dietro un pulsante e diversa dall'email vera: Francesco alla prima apertura, «non si capisce niente».
- L'anteprima fedele ha fatto emergere due difetti dell'email VERA: tabella a 600px fissi (su telefono usciva dal bordo: `max-width:100%` su una tabella dentro una cella non conta) e `image_url` grezzo dentro `src`.
- **Destinatari**: `GET /api/newsletter/liste` → titoli e conteggi (persone / raggiungibili), mai nomi. `newsletters.lista = { chiave, titolo }`: la chiave, non le persone. Se la lista non esiste più l'invio si FERMA (non ripiega su «tutti»).
- Il campo «Filtra per tag» è stato tolto dall'editor (ok di Francesco, nessuna newsletter lo usava); `tag_filter` resta rispettato dall'invio.
- **Disiscrizione** (`lib/disiscrizione.js`): link nel piede (GET) + pulsante dei programmi di posta (POST, `List-Unsubscribe` + `List-Unsubscribe-Post`). ⛔ L'indirizzo dell'intestazione sta su `www`: sull'apex la POST riceve 308. `marketing_revoca_il/_fonte` (migration 133); la prova del sì non si cancella; un nuovo sì chiude il no.
- Un blocco di email rifiutato da Resend non si conta più fra le inviate e manda l'allarme (prima `sent += batch.length` comunque).
- ⚠️ **In locale non c'è `RESEND_API_KEY`**: le email sono spente. L'invio vero si prova in produzione, verso `delivered@resend.dev` (il pozzo di Resend, non una persona): lo fa `probe-disiscrizione.mjs`.
- ⚠️ Non verificato da nessuno: come si vede in Outlook per Windows (c'è la tabella condizionale standard).
- Aperto, scelta di Francesco: doppia conferma via email per chi spunta la casella nei moduli.
- Parere dato, non approvato come lavoro: newsletter a blocchi con lo stesso editor del sito ma motore di disegno separato; il valore sta nei blocchi collegati ai dati (evento, offerta).

Sonde: `probe-newsletter-anteprima.mjs`, `probe-disiscrizione.mjs`, `probe-consenso-e-liste.mjs`. Collegato: [[reference-contatti-porta-unica]], [[reference-webhook-url-www]], [[reference-email-resend]].
