---
name: reference_smoke_corse_parziali
description: Gli smoke test danno risultati parziali (37, 54, 58 invece di 66) quando due esecuzioni si sovrappongono — non è l'applicazione
metadata:
  type: reference
---

Se `npm test` in `tests/` restituisce un numero anomalo di test passati ("54 passed · 10 did not run", "37 passed"), **prima di sospettare una regressione, controllare se un'altra esecuzione era in corso**.

Causa accertata il 22/08/2026: la suite usa un utente CI effimero con le credenziali in `tests/.auth/ci-token.json`. Il teardown della **prima** corsa cancella quel file mentre la **seconda** sta ancora girando, e i test rimanenti falliscono in `beforeAll` con:

```
beforeAll: impossibile recuperare IDs entità: ENOENT ... tests/.auth/ci-token.json
[teardown] ci-user.json non trovato — nessun utente da eliminare
```

Stesso effetto se si lancia lo smoke **durante un deploy**: il browser chiede i chunk della versione precedente e la pagina risulta vuota con 404 su risorse statiche (osservato su `/admin/survey`, che aperta subito dopo funzionava perfettamente).

**Regola**: una corsa per volta, e a deploy concluso. La corsa pulita dà **66 passed · 1 skipped**.
