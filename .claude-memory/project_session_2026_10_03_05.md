---
name: project-session-2026-10-03-05
description: "Sessione 03–05/10 (chiusa): riepilogo prima della cassa e gruppi nelle prenotazioni evento; contatti rifatti dalle fondamenta (porta unica, registro, liste, Trattative); consenso alle promozioni; newsletter per lista con editor nuovo, anteprima vera, miniature; disiscrizione con traccia. Migration 130–133 eseguite"
metadata:
  node_type: memory
  type: project
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-05T16:59:58.183Z
---

Sessione lunga, tutta nata da Garage 22 e chiusa il 05/10/2026. Tutto LIVE e provato in produzione.

**Eventi (03–04/10)** — note 44 e 55 di CLAUDE.md
- Campo «numero di persone» riscrivibile (chi voleva 5 posti ne prenotava 15); riepilogo prima di Stripe, solo se si paga online, con «la prenotazione è valida solo dopo il pagamento»; pagina evento in inglese.
- Pannello: gruppi dentro l'evento, eventi nella pagina «Prenotazioni», pulsanti rinominati (tabella approvata da Francesco).
- Decisione di Francesco: le 9 `pending` di agosto di Garage 22 NON si toccano («non c'è motivo»).
- Controllo dei conti su Garage 22 (sola lettura): Luca Zesi 9 pagate / 10 posti / 300 €, coerente.

**Contatti (04–05/10)** — nota 56, [[reference-contatti-porta-unica]]
- Parole di Francesco: «devono entrare tutti in contatti: la forza di OltreNova deve essere questa» → STRATEGIA §4.5-ter.
- Sue decisioni: «chi prenota o compra non ha senso [in pipeline] ma perché privarci di una possibilità?» → si entra a mano dalla scheda; «le note ci servono? serve l'origine del contatto e categorizzarlo in una lista»; «i collaboratori non usano i contatti»; `/api/guest/book` rimossa («meglio farlo ora»).
- Script eseguiti con `--esegui`: `ricostruisci-attivita-contatti` (140 righe di storia), `riordina-contatti` (69 note ripulite, 114 fuori dalle trattative).

**Consenso, newsletter, disiscrizione (05/10)** — [[reference-newsletter-editor-e-disiscrizione]]
- Frasi approvate da Francesco: «Avvisatemi delle prossime serate» (eventi) · «Avvisatemi di novità e offerte» (risorse, offerte, negozio).
- «Scrivi a questa lista»; editor riordinato (a chi → modello → oggetto → contenuto → quando), anteprima vera sempre accesa, quattro miniature, campo tag tolto (ok suo; nessuna newsletter lo usava).
- Francesco ha verificato in Gmail che «Annulla iscrizione» compare con l'email di prova.
- Sua domanda sul builder unico sito/newsletter: risposto «stesso editor sì, stesso motore di disegno no»; lui: «andiamo per pezzi». Non approvato come lavoro: è un parere.

**Miei errori in questa sessione**
- Ho lanciato una sonda in catena subito dopo il deploy senza leggerne l'esito: il deploy era fallito e i rossi erano del codice vecchio → [[reference-trappole-script-e-sonde]].
- Regressione mia: «Rendi anonimo» lasciava `telefono_e164` (corretta subito).
- Avevo fatto aprire una trattativa anche ai moduli; i dati dicevano che 40 invii su 42 erano iscrizioni a un gioco → tolto.
- `next build` con il dev server acceso ha rotto il dev di Francesco (riparato con `touch next.config.js`).

**Numeri al 05/10**: 8 aziende, 11 entità, 118 contatti (44 iscritti), 141 righe di registro, 2 bozze di newsletter e nessuna inviata. Nessuna azienda ZZ rimasta.
