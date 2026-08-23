---
name: reference_valore_a_pagamento_accertato
description: "Punti, gift card, crediti e posti si consumano SOLO a pagamento accertato e in modo idempotente — invariante 11 di SECURITY.md, nato dal buco loyalty del 23/08"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-23T17:41:03.967Z
---

Invariante 11 di `SECURITY.md`, imparato sul campo il 23/08/2026.

**Il difetto**: punti fedeltà e gift card venivano riscattati e accreditati alla **creazione** dell'ordine — quando nessuno ha ancora pagato. Il webhook Stripe si limitava a marcare lo stato. Da quello scollegamento discendevano quattro cose: ordini mai pagati **accreditavano punti** (sconti veri fabbricati dal nulla, fino al tetto del rate limit); chi conosceva un codice gift card poteva **azzerarlo senza pagare**; i punti si spendevano cercando il cliente **per sola email**, quindi a nome di chiunque; lo sconto **non arrivava a Stripe** (`line_items` a prezzo pieno), così il cliente pagava tutto e si vedeva consumare punti e gift card lo stesso.

**La regola**: il valore si consuma solo dove il pagamento è **accertato** — webhook firmato o conferma esplicita del titolare — e in modo **idempotente**, perché gli eventi Stripe si ripetono. Doppia guardia usata in `finalizzaLoyaltyOrdine`: scambio atomico sullo stato dell'ordine (`.neq('stato','pagato')` sull'update, che non aggiorna nulla la seconda volta) **più** controllo dei movimenti già registrati per quell'ordine. Ricalcolare sul saldo reale al momento del pagamento, mai sotto zero.

Dettagli pratici: Stripe **non accetta sessioni da zero euro** — se lo sconto copre tutto, saltare il checkout e lasciare la conferma al titolare. Lo sconto si porta in cassa come `coupon` (`amount_off`) nei `discounts`.

**Perché A1 non l'aveva trovato**: la sonda di autorizzazione chiede *"questa richiesta è permessa?"* ed è **cieca** su ciò che passa da richieste perfettamente legittime. Creare un ordine è lecito; il buco stava nella logica, non nei permessi. È il motivo per cui il check di sicurezza è diviso in classi (vedi `SECURITY-CHECK.md`).

Vale per ogni flusso futuro: **booking, eventi, abbonamenti**, quando ci si collegherà Stripe.

Sonda: `tests/probe-loyalty-denaro.mjs` (scenario completo: programma attivo, 5000 punti, gift card da 50€, articolo da 100€; tre ordini mai pagati non devono produrre nulla).

Vedi [[project_session_2026_08_23_check_A]], [[feedback_sicurezza_priorita]].
