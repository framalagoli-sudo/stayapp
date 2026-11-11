---
name: project-session-2026-11-09-10
description: "Sessione 09–10/11/2026: calendario dei prezzi delle risorse a giornate (fase 1) + offerte con sconto/anticipo/last minute/pacchetti (fase 2) per Automax, migration 144–145, due buchi chiusi; pulizia Temp del PC"
metadata:
  node_type: memory
  type: project
  originSessionId: 27aa2cbe-ae25-41b1-bbe3-526896a77fd3
  modified: 2026-11-10T08:23:41.803Z
---

**Richiesta**: Automax (noleggio furgoni) voleva prezzi per stagione, minimi per periodo («sabato e domenica insieme», «minimo 3 giorni») e promozioni/pacchetti. Francesco ha proposto il modello Octorate (ogni giorno il suo prezzo), accolto. Dettaglio tecnico → [[project_tariffe_risorse]], CLAUDE.md nota 92.

**Fatto e LIVE (verificato in produzione)**:
- Fase 1 (commit a716ea52 → f72e8243, migration 144 al 2° tentativo): tabella sparsa `risorse_tariffe`, conto giorno per giorno in un posto solo (`lib/conto-giornaliero.js`), pannello «Prezzi e regole», widget con prezzo nel giorno, `prenotazioni.dettaglio_prezzo`.
- Fase 2 (commit ed0553f3, migration 145): sconto %/importo, in anticipo / last minute (fuso azienda), pacchetto che si ripete (`durata_esatta`), non cumulabili; `datiOffertaPuliti` unica pulizia.
- 🔒 Buchi chiusi: offerta creabile sulla risorsa di un'altra azienda (commit 887abd37, deploy a sé, SECURITY-CHECK 10/11); offerta degli slot nominata dal browser non ricontrollata (`offertaSlotVale`).
- Furgone vero invariato: 23→25 = 360 €, ponte 850 €.
- PC: liberati ~4,6 GB su C: (Temp + vecchio chromium), npm-cache lasciata («senza npm»).

**Incidenti**: deploy della fase 2 fermato dal sistema per memoria dopo Vercel+push+smoke 74/74 → sonde rimaste lanciate a mano, verdi; resto ZZ-SSRF pulito. Script con apici rovinati dalla shell (`'all'offerta'`) → d'ora in poi script su file nella scratchpad, mai `cat` senza heredoc (un `cat >` senza input ha bloccato un comando alla chiusura).

**Aperto**: spiegare ad Automax dove sono «Prezzi e regole» e i tipi di offerta (offerto un messaggio pronto); ~~probe-widget-giornate~~ (sistemata l'11/11, verde) e `probe-registrazione.mjs` (riconoscere il 429); pannello delle fasce orarie per gli slot = dopo, quando un cliente lo chiede.
