---
name: project-session-2026-11-17-19
description: "Sessione 17–19/11/2026 — sito Panoramic, colori del pannello, registrazione/editor evento, DA_FARE.md, export GDPR completo, campo trappola e spam marcato (migration 147) LIVE"
metadata:
  node_type: memory
  type: project
  originSessionId: 27aa2cbe-ae25-41b1-bbe3-526896a77fd3
  modified: 2026-11-19T08:14:11.657Z
---

Chiusa da Francesco il 19/11 («quando ripartiamo prendiamo il file appena scritto» = **DA_FARE.md**).

- **Panoramic** (www.suitepanoramic.it, azienda «Brunetti Giovanni»): sito costruito con `tests/costruisci-panoramic.mjs`, carattere Jost, menu centrale nel layout classico, «Prenota» → WhatsApp, modulo → brunettigio@gmail.com (persona vera: le sonde non usano quel modulo).
- **Pannello leggibile col tema scuro del PC**: `color-scheme: light` fisso, grigi schiariti; sonda `probe-colori-pannello`.
- **Registrazione**: link di conferma `signup` con password (il magiclink la cancellava). **Editor evento**: «Caricamento…» finché i dati non arrivano.
- **DA_FARE.md** = elenco unico delle cose aperte ([[feedback-da-fare-unico]]).
- **Export GDPR** completo dallo schema (`lib/esportazione-azienda.js`); lento con aziende piene (>30 s, annotato in DA_FARE A4).
- **Moduli**: il campo trappola da solo non scarta (la richiesta vera di Panoramic era sparita); lo **spam si marca, non si butta** — migration 147 eseguita il 19/11, deploy dopo, `probe-campo-trappola` verde in produzione anche nel pannello (linguette «Richieste / Possibile spam»).
- Deploy 19/11: smoke 74/74; rossi solo robots di Cloudflare (noto) e un timeout della sonda di enumerazione sull'export (alzato a 65 s per quella porta).
- Corrette in PROGETTO.md tre righe che mentivano (export, registrazione, Tech Provider WhatsApp).

Aperti per Francesco: Turnstile sui siti dei clienti (domini nella chiave Cloudflare), riprovare il modulo Panoramic.
