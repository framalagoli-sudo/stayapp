---
name: feedback-chiusura-sessione
description: "A OGNI chiusura di sessione aggiornare TUTTI i file di progetto (CLAUDE.md, FEATURES.md, PROGETTO.md, SECURITY.md, gli altri .md in root, memoria + backup .claude-memory, todo di ripresa)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 6473d404-e9d1-4c54-a639-5864c6f60bbb
  modified: 2026-09-22T23:44:07.220Z
---

Quando Francesco dice «chiudi sessione», si aggiornano **tutti** i file di progetto, non solo quelli che sembrano toccati:
`CLAUDE.md` (note numerate), `FEATURES.md`, `PROGETTO.md`, `SECURITY.md`/`SECURITY-CHECK.md` se c'è una classe di sicurezza, gli altri `.md` in root se il tema li riguarda, la nota di sessione, `todo_prossima_sessione.md`, `MEMORY.md`, e la copia della memoria in `.claude-memory/` nel repo. Poi commit + push (via `deploy.ps1` se c'è codice da pubblicare).

**Why:** parole sue (23/09/2026): «a ogni chiusura di sessione aggiorna TUTTI i file di progetto che abbiamo così non ci perdiamo niente». Già successo che PROGETTO.md e FEATURES.md restassero indietro di settimane → [[reference_documento_che_mente]].

**How to apply:** per ogni file, aprirlo e chiedersi «c'è qualcosa di oggi che qui manca o che ora è falso?». Se la risposta è no, va bene lasciarlo, ma dopo averlo guardato, non per supposizione.
