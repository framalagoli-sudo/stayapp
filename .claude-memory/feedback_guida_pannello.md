---
name: feedback-guida-pannello
description: "Ogni volta che cambio una pagina del pannello aggiorno la sua scheda di guida (client-next/lib/guida) nello stesso commit — lo pretende verifica-guida.mjs in deploy"
metadata:
  type: feedback
---

Francesco, 11/11/2026: «perché non facciamo una guida interna? andrebbe fatto per ogni voce del menu» e «crea una procedura che se aggiorniamo cose aggiorni anche la guida».

Regola: toccando una pagina del pannello (o aggiungendo/rinominando un pulsante, o una voce di menu) apro la scheda in `client-next/lib/guida/<voce>.js`, la rileggo, la correggo se serve, aggiorno `rivista` e la metto nello stesso commit. Una voce di menu nuova nasce con la sua scheda (e si toglie da DA_SCRIVERE in tests/verifica-guida.mjs). I `pulsanti` citati devono essere scritti esattamente come nelle pagine.

**Why:** la pagina Aiuto di maggio non era mai stata aggiornata e a novembre diceva cose false. Vedi [[reference_documento_che_mente]]. CLAUDE.md nota 93 e regola 10.

**How to apply:** `node tests/verifica-guida.mjs` prima del commit; il deploy lo lancia da solo e si ferma se una pagina è più nuova della sua scheda. Le schede si scrivono guardando la pagina vera (nomi dei pulsanti con grep), mai a memoria. Restano 48 voci da scrivere a gruppi: [[project_tariffe_risorse]] per Automax è stato il primo.
