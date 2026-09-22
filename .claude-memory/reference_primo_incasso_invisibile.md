---
name: reference_primo_incasso_invisibile
description: "il primo pagamento vero funzionava in tutto tranne che nel mostrarsi: pagina di ritorno cieca, nessuna pastiglia nel pannello, «Pagamenti» che non elencava pagamenti"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-22T15:52:51.662Z
---

**Il fatto** (22/09/2026, Garage 22 — primo incasso reale della piattaforma).
Agnese paga 1 € per un posto a un evento di prova. Webhook di Stripe arrivato,
`event_bookings.pagamento_stato = 'pagato'`, `pagamento_id = cs_live_a15TDI…`,
soldi sul conto del cliente. **Tutto giusto.** E Francesco: *«dopo il pagamento
arriva la notifica ma è cieca… nella piattaforma che succede? nulla… il cliente
è smarrito e non ci raccapezza un cazzo»*.

Aveva ragione su tutto. Il pagamento era registrato e **invisibile in tre punti**.

## ⚠️ La lezione di metodo

La tentazione era cercare il guasto nel webhook. **La riga nel database diceva
di no.** Leggere il dato vero prima di ipotizzare il meccanismo ha risparmiato
un giro intero — ed è lo stesso motivo per cui la diagnosi va fatta alla radice
*prima* di toccare qualsiasi cosa.

## I tre punti

⛔ **La pagina dopo il pagamento chiedeva all'endpoint sbagliato.**
`/checkout/successo` interrogava `/api/shop/public/esito`, che cerca **solo
negli ordini del negozio**. Prenotazioni ed eventi cadevano sempre nel ramo
«non trovato», e quel ramo parlava lo stesso di «ordine». Chi aveva pagato un
posto a una cena leggeva «Il tuo ordine è stato registrato»: niente nome
dell'evento, niente nome del locale, **nessun link per tornare indietro**.
→ `lib/esito-pagamento.js` cerca nei tre posti **nello stesso ordine del
webhook**. Due risposte diverse alla stessa domanda sono un modo per divergere
in silenzio. Il link di ritorno usa `hostUfficiale`, cioè il dominio **del
cliente**, non il nostro percorso interno.

⛔ **Nel pannello la riga mostrava `€1` e basta**, identica a quella di chi
paga sul posto. Il vocabolario degli stati esisteva già, ma **solo dentro
`ShopPage`**: una scala scritta in un componente è una scala che gli altri due
punti in cui si incassa non hanno. → `components/admin/StatoPagamento.jsx`.
⚠️ `non_richiesto` **non** significa «non pagato»: con un importo è «paga sul
posto», senza non si scrive niente. «Da pagare» su un evento gratuito sarebbe
una richiesta inventata — stesso errore di [[reference_prezzo_evento_scelto]],
dove «nessuna cifra» veniva letto come «gratis».

⛔ **«Pagamenti» non elencava pagamenti**: era solo il collegamento del conto
(collega / stato / riprendi). → `GET /api/stripe/incassi` + lista in pagina.

## La scelta sui dati di pagamento

La lista si legge dalle **nostre** righe già segnate pagate: zero chiamate a
Stripe. Deliberato, non pigrizia — **non tocchiamo nessun dato di carta, e ciò
che non si chiede non si può perdere** ([[reference_dato_riservato_a_monte]]).
Ricevute, rimborsi e saldo stanno sulla dashboard Stripe, dove il cliente entra
col suo account.

Vedi [[reference_stripe_connect]], [[reference_motore_senza_porta]] (un motore
che funziona e non si vede vale zero), [[feedback_verificare_il_contesto]].
