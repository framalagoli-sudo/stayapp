---
name: feedback_niente_fatti_inventati_ai
description: "L'AI che scrive sui siti dei clienti non inventa fatti (prezzi, numeri, nomi, recensioni): lo garantisce il codice, non il prompt. Recensioni inventate: proposta di Francesco del 12/10, rifiutata da me, non decisa"
metadata:
  type: feedback
---

Quando l'AI scrive contenuti che finiscono sul sito di un cliente, prezzi, numeri,
nomi di persone e recensioni restano solo se stanno nella richiesta o nei dati
dell'attività; altrimenti va una frase che dice cosa scriverci. Il controllo sta
nel codice (`ripulisci` in `lib/ai-blocco.js`), non solo nel prompt.

**Why:** 12/10/2026, «Chiedi all'AI» nell'editor. Francesco ha approvato galleria
vuota e niente prezzi inventati, e sulle recensioni ha scritto: «meglio un
inserisci qui la tua recensione — a meno che la richiesta è quella di scrivere
anche le recensioni… inventarle potrebbe essere interessante non credi?». Ho
risposto di no: una recensione falsa sul sito di un'impresa è una pratica
commerciale scorretta (direttiva Omnibus / Codice del Consumo — detto a memoria,
non verificato sul testo), e la multa la prende il cliente. Lui non ha replicato.

**How to apply:** non costruire recensioni inventate di mia iniziativa e non
riproporre il tema. Se Francesco lo richiede, serve prima una verifica legale
vera, non la mia memoria. Per ogni funzione AI nuova che scrive su un sito:
catalogo chiuso + fatti controllati contro la fonte. Vedi [[project_ai_consumi]].
