---
name: reference-eventi-chi-non-paga
description: "Eventi con pagamento: la prenotazione nasce pending e diventa confirmed al webhook; cassa Stripe con expires_at 31 min; cron chiude le casse e dice perché; retrieve(id, {}, {stripeAccount}) — la forma a due argomenti faceva tacere il cron (01/10/2026)"
metadata:
  type: reference
---

**Segnalazione di Francesco, 01/10/2026** (Garage 22): «se paghi sei prenotato, invece restano tutte le prenotazioni che inviano al carrello di Stripe». Misurato: Luca Zesi Live Show, 5 non pagate «confermate», 17/60 posti.

**Tre difetti in fila**: nasceva `confirmed`; cassa senza `expires_at` (Stripe → 24 h, il cron a 30 min sentiva «aperta» e saltava); `checkout.sessions.retrieve(id, { stripeAccount })` → con ogni probabilità interrogava il conto della piattaforma, falliva, e il `catch` restituiva «ignoto» in silenzio (una del 22/09 rimasta 9 giorni, liberata al primo giro della forma `retrieve(id, {}, { stripeAccount })`). Deduzione dai fatti, non visto in un messaggio d'errore.

**Ora**: `pending` → `confirmed` al webhook; `creaCheckout({ minutiPerPagare })`; cron `sessions.expire` prima di liberare; motivo degli «incerti» per email; avviso titolare + automazioni in `lib/evento-prenotato.js` (mai all'apertura della cassa); promemoria e scheduler solo `confirmed`; «Conferma» del titolare = `non_richiesto` (paga sul posto).

**Lezioni**: un `catch` che restituisce «non so» senza scrivere il perché è un guasto silenzioso ([[reference_guasti_silenziosi]]). Le opzioni di Stripe Connect vanno sempre nel TERZO argomento delle chiamate con id. In locale la chiave Stripe è di TEST: le sessioni live non si interrogano da qui, e `vercel env pull` restituisce `[SENSITIVE]` (giusto così).

✅ 08/10/2026: lo stesso schema vale per le RISORSE (`lib/prenotazione-risorsa.js`, `liberaRisorseNonPagate`, migration 134 `importo_online`). Lì `in_attesa` vuol dire due cose (aspetta il pagamento / aspetta il titolare): `lib/stato-prenotazione.js`. Si paga online solo con conferma automatica. In sandbox un conto Standard non si attiva via API: la sonda riusa i conti di prova esistenti (uno col nome → cassa vera).

Collegati: [[reference_valore_a_pagamento_accertato]], [[reference_stripe_connect]], [[reference_posti_riservati_eventi]].
