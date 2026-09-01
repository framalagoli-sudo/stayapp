---
name: feedback_sandbox_non_e_live
description: "«Funziona in sandbox» NON significa «funziona in live». Provato in un ambiente e dedotto per l'altro: due volte in due giorni, e la seconda è costata tempo a Francesco per niente."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-01T07:30:02.555Z
---

Francesco, **01/09/2026**: *«scrivetele in memoria certe cose cribbio»*. Aveva
ragione: era il secondo caso in due giorni, e il secondo l'avevo causato
ripetendo il ragionamento del primo.

## La regola

**Un comportamento verificato in sandbox non vale in live finché non lo si
verifica in live — o non si legge che vale.** Stripe (e non solo) è
deliberatamente permissivo in test e severo in produzione: è il senso di avere
due ambienti, non un difetto.

**Why**: dedurre da un ambiente all'altro sembra ragionevole e non lo è. Costa
il tempo di Francesco — che agisce sulla mia parola — e nel caso peggiore
produce dati veri che non si possono più togliere.

**How to apply**: prima di far fare qualcosa a Francesco sulla base di una prova
in sandbox, **cercare esplicitamente se in live cambia**. Il messaggio d'errore
di Stripe diceva *«which includes Standard accounts»*: era una regola
documentata, cercabile in un minuto invece che scoperta dopo.

## I due casi, in due giorni

**31/08 — la cassa.** `probe-acconto` lanciata in produzione ha dato 9 falsi
problemi: in **live** Stripe rifiuta di aprire una Checkout Session su un conto
non ancora attivato, mentre **in sandbox la crea lo stesso**. Il codice era
giusto; la sonda leggeva quel rifiuto come un guasto nostro. Peggio: creando
conti per provare, ha lasciato **account Stripe live veri**.

**01/09 — la chiusura.** Ho provato `v2.core.accounts.close()` in sandbox, ha
funzionato, e ho fatto creare a Francesco una chiave live apposta. In live
Stripe risponde:

> *This method may not be used on livemode accounts where
> `controller[losses][payments]=stripe and dashboard=full`, which includes
> Standard accounts.*

Dieci minuti suoi per un risultato che non c'è stato.

## Il corollario che vale sempre

**Le sonde che creano dati non si lanciano in produzione.** In sandbox si
ripuliscono, in live restano. `probe-acconto` ora esce subito se non punta a
localhost — ed è il modello per ogni sonda che crea account, ordini o
pagamenti.

Vedi [[reference_stripe_connect]], [[feedback_verificare_il_contesto]],
[[reference_sonda_misura_sbagliata]].
