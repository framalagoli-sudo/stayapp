---
name: reference-link-pagamento
description: "Link di pagamento per prenotazioni prese a voce (08/10/2026, eventi e risorse): lib/link-pagamento.js; pagamento_richiesto_il distingue il link del titolare (24 ore, la prenotazione resta) dalla cassa del sito (30 minuti, si annulla); /paga/<sessione> è l indirizzo nostro; in sandbox un conto Standard non si attiva via API"
metadata:
  type: reference
---

Dettaglio in `CLAUDE.md` nota 57 (link) e nota 44 (risorse come gli eventi).

- **Due cose che nel database sembrano uguali**: `non_pagato` + sessione Stripe. `pagamento_richiesto_il` valorizzato = link mandato dal titolare (24 ore, a scadenza torna `non_richiesto`, la prenotazione NON si annulla). Vuoto = la persona è alla cassa del sito (30 minuti, poi si annulla da sola). Ogni punto nuovo che legge `non_pagato` deve sapere quale dei due: `attendePagamento` / `linkInCorso` in `lib/stato-prenotazione.js`.
- `in_attesa` (risorse) e `pending` (eventi) hanno a loro volta due significati: aspetta il pagamento / aspetta il titolare.
- La cifra portata alla cassa sta in `importo_online` (risorse dalla 134, eventi dalla 135): con acconti e link non si ricava più dalla percentuale.
- Il link copiato è `www.oltrenova.com/paga/<sessione>`, non quello di Stripe. Cambiare importo chiude il vecchio; annullare la prenotazione lo ritira.
- Per le risorse si paga online prenotando **solo con conferma automatica**; con l'approvazione a mano il titolare approva mandando il link.
- ⚠️ `puoIncassare` è vero appena esiste `stripe_account_id`, anche col collegamento a metà: la cassa poi non si apre (errore chiaro, prenotazione valida). Da sistemare salvando `charges_enabled`.
- ⚠️ **Sandbox Stripe**: per aprire una cassa il conto deve avere un nome; un conto Standard non si attiva né si cancella via API. Le sonde riusano i conti di prova già esistenti (`stripe.accounts.list`, uno col nome). Non chiamare `/api/stripe/connect` dalle sonde: lascia conti orfani.
- ⚠️ Limiti anti-abuso in locale: chiavi `booking-prenota:::1`, `link-pagamento:::1` nella tabella `rate_limits`; si azzera solo la propria riga.
- Un numero «333 1234567» non ha prefisso: per `wa.me` passare da `normalizzaTelefono`.
- Non provato: pagamento vero da link in produzione; arrivo in casella dell'avviso al titolare.

Collegato: [[reference-eventi-chi-non-paga]], [[reference-stripe-connect]], [[reference-trappole-script-e-sonde]].
