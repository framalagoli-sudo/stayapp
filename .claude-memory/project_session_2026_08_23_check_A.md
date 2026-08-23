---
name: project-session-2026-08-23-check-a
description: "Sessione 23/08/2026: check sicurezza A1 (202 route, multi-tenant integro) + 4 buchi chiusi + buco loyalty (valore consumato senza pagamento) + webhook Resend risuscitato; roadmap A1-A8 in SECURITY-CHECK.md"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-23T17:41:24.708Z
---

Sessione del 23/08/2026, tutto live e verificato in produzione. Commit da `a8826530` a `e725b3a5`.

## A1 — Autorizzazione e multi-tenant ✅

Sonda `tests/probe-security-sweep.mjs`: due aziende effimere che bussano a **tutte le 202 route** senza token e col token dell'altra azienda. **Il muro regge**: 92 liste interrogate da un'azienda estranea, zero perdite; nessuna risorsa altrui leggibile, modificabile o cancellabile.

**Quattro buchi chiusi** (commit `a8826530`):
1. **`?preview=1` apriva le bozze a chiunque** — pagine, home ed elementi vetrina non pubblicati, con URL indovinabile, verificato su bozze reali in produzione. Ora token HMAC firmato → [[reference_anteprima_bozze_token]]
2. `select('*')` sul catalogo shop pubblico → campi espliciti
3. saldo fedeltà che rivelava se un'email fosse cliente → risposta identica per chiunque
4. codici gift card da `Math.random()` (prevedibile, e valgono denaro) → `crypto.randomBytes`

## A2 — Logica di valore 🔶 shop/loyalty fatti

Il buco più grave della sessione, che **A1 non poteva trovare** perché ogni richiesta era legittima: punti e gift card si consumavano alla creazione dell'ordine, non al pagamento → punti fabbricati dal nulla e gift card altrui bruciabili. Chiuso (commit `1a8a352d`) → [[reference_valore_a_pagamento_accertato]]

Restano booking, eventi e preventivi: **il booking è l'unico di questi moduli davvero in uso dai clienti**.

## Webhook Resend risuscitato

Muto dal 9/7 al 23/8, due cause sovrapposte (URL sull'apex → 308, ed endpoint disabilitato). Riparato da Francesco sul dashboard, verificato end-to-end: 5 secondi. → [[reference_webhook_url_www]]

## Stato misurato in produzione (utile per calibrare le priorità)

- **shop e loyalty: zero utilizzo** — 0 prodotti, 0 ordini, 0 gift card, 0 programmi attivi. I buchi erano bombe innescate, non attacchi in corso.
- **`STRIPE_SECRET_KEY` non è configurata**: il codice dello shop è integrato ma **in produzione Stripe non incassa**. La documentazione diceva "già integrato" — vero per il codice, non per l'esercizio.
- 49 contatti in tutto, 0 marcati `email_non_valida`.

## Decisioni di Francesco

- «**Massima protezione e privacy dei dati**» quando la scelta è di prodotto e non tecnica.
- Sul saldo fedeltà: chiuso l'accesso pubblico anche se il modulo è spento.
- Roadmap del punto A **prima** di passare al punto B (revisione funzionale).

Vedi [[todo_prossima_sessione]] per il punto di ripartenza.
