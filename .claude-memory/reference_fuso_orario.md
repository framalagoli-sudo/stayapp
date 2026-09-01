---
name: reference-fuso-orario
description: L'ora di una prenotazione è quella del cliente, non del server — fuso IANA sull'azienda, conto in lib/fuso.js, e le due trappole del cambio d'ora legale
metadata:
  type: reference
---

**Chi prenota scrive «10:00» guardando il proprio orologio.** Il server
costruiva `new Date('2026-09-04T10:00')`, che senza fuso lo legge in quello di
**chi esegue** — e Vercel gira in UTC. Per un'attività italiana quelle 10:00
diventavano le 12:00: il promemoria «24 ore prima» partiva due ore prima del
dovuto, e il termine per disdire si spostava della stessa quantità (si poteva
non riuscire a cancellare avendone diritto). Da un fuso americano: otto ore.

## Come funziona ora (migration 104, live dal 01/09/2026)

- `aziende.fuso_orario`, nome **IANA** («Europe/Rome»), non uno scarto in ore:
  lo scarto cambia due volte l'anno con l'ora legale, il nome no.
- **Sull'azienda, non sull'entità**: un titolare lavora in un posto solo, e
  chiederlo per ogni sede sarebbe una domanda in più con una sola risposta.
- `client-next/lib/fuso.js` è **l'unico posto che fa il conto**. Nessun import:
  lo legge anche il browser.
- Si cambia da **`/admin/impostazioni`**, e la scheda mostra **l'ora di adesso in
  quel fuso**: è la verifica che chiunque può fare senza sapere cosa sia un nome
  IANA. Chi si registra lo porta dal proprio browser — l'unico momento in cui lo
  sappiamo senza chiederlo.

## ⚠️ Le trappole

- **`istanteDi` fa il conto DUE volte.** Il primo scarto è quello dell'istante
  sbagliato: nei due giorni all'anno in cui l'orologio salta, un solo passaggio
  cade dalla parte sbagliata e l'ora esce sfasata di un'ora.
- **Un nome di fuso finisce dentro `Intl`, che su una stringa inventata lancia.**
  Entrando così com'è, ogni prenotazione successiva avrebbe risposto 500. Si
  valida in route (400) e in mancanza si torna al predefinito — **mai** al valore
  ricevuto. Il catalogo chiuso è quello del runtime, non una lista scritta a mano.
- **Corretti due punti, non sei.** `booking/prenota` e `booking/cancella`. Gli
  altri quattro usano `new Date(...T12:00:00)`: **mezzogiorno è deliberato**, per
  stare lontani dai bordi del giorno — lì lo scarto non cambia il risultato.
- **Invisibile in locale**, dove il server ha l'ora italiana e i conti tornano da
  soli: [[feedback_sandbox_non_e_live]].

Sonda `tests/probe-fuso.mjs`: cinque fusi (inclusa la mezz'ora di Adelaide),
entrambi i cambi d'ora legale, e una stringa ostile che non deve far saltare
niente. Vedi [[reference_lavoro_dopo_la_risposta]].
