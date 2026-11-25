---
name: project-session-2026-11-25
description: "25/11/2026: backup verificato, consigli «Come arriva nella casella» nella newsletter, «Mostra quanti posti restano» sugli eventi (migration 149) LIVE e verificato; deploy fermato per memoria, resti CI tolti. Domande aperte: acconti a passi di 5, ZZ-ENUM."
metadata:
  node_type: memory
  type: project
  originSessionId: d09b33e7-1ae1-47da-8d70-17e8498ffdf1
  modified: 2026-11-25T18:18:36.205Z
---

**Fatto il 25/11/2026** (sessione chiusa da Francesco: «chiudi sessione e salva tutto e poi quando riprendiamo riprendiamo da qui»).

1. **Backup** verificato sano dopo il guasto del 24/11.
2. **Newsletter — «Come arriva nella casella»** (`f507fec1`, sonda `probe-newsletter-consigli` verde in produzione `67f2c798`): consigli mentre si scrive, non bloccano. CLAUDE.md nota 56.
3. **Eventi — «Mostra quanti posti restano»** (`344b5d6c` + correzione `fa45b7c3`, migration 149 eseguita da Francesco, colonne verificate). Sempre / Quando stanno finendo (% occupati, 1–99, proposta 80, posti del telefono = occupati) / Mai; «Esaurito» sempre; per opzione. Server decide, esce solo `posti_visibili`. CLAUDE.md nota 95.
   - Bug trovato dalla sonda nuova `tests/probe-mostra-posti.mjs`: il campo soglia aveva `min=1 step=5` → il browser bloccava il salvataggio con 80/70. Corretto (step 1), sonda tutta verde in produzione.
4. **Il secondo deploy (`fa45b7c3`) è stato fermato dal sistema per memoria** durante gli smoke (Vercel e push fatti). Ha lasciato un `ci-…@playwright.internal` **super_admin** e le aziende ZZ-CI-SEC-TEST/-B: tolti subito con `cancellaAziendaDiProva` + deleteUser; resta un solo super_admin (Francesco). Smoke e sonde da rilanciare a PC libero (DA_FARE A5).
5. Mio errore del giorno: `next build` lanciato con il dev server acceso (vietato); fermato il server, detto a Francesco.

**Domande aperte a Francesco (DA_FARE B):** acconti con `step=5` (stesso blocco silenzioso a 33%; proposta step 1) · togliere o tenere ZZ-ENUM-A/B.
**Da dire a Garage 22 (DA_FARE C3):** l'opzione nuova; sulla serata del 26/11 ora si legge «Restano 27 posti» sotto l'opzione con posti contati.

Lezione: con un deploy da bash in sottofondo il sistema lo uccide per memoria quando la sessione è ferma → dopo, controllare **sempre** utenti `@playwright.internal` e aziende ZZ-CI (vedi [[reference_smoke_corse_parziali]]).
