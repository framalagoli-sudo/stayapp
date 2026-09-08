---
name: reference_intervalli_date_booking
description: "Booking a giornate: (giorno, giorno) è l'intervallo VUOTO e non tocca niente; e con conta_giorno_uscita il giorno di riconsegna è occupato"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-08T21:07:18.144Z
---

Nel booking a giornate gli intervalli sono **semi-aperti**: `[dal, fine)`. Da lì
vengono due difetti misurati sul Furgone di Automax l'08/09/2026, entrambi
invisibili perché **non danno errore: danno «libero»**.

## 1 · `(giorno, giorno)` è l'intervallo vuoto

Chiedere «il giorno G è occupato?» come `siSovrappongono(G, G, …)` non tocca mai
niente. Il calendario perdeva **il primo e l'ultimo giorno** di ogni
prenotazione, e una prenotazione corta — dal 24 al 25 — sta tutta negli estremi:
spariva del tutto. Era il sintomo che Francesco aveva segnalato («inserisco una
prenotazione manuale e la tabella non si aggiorna»).

Un giorno solo si scrive `[giorno, giornoDopo(giorno))`, o meglio si usa
`unitaLibereNelGiorno`. Lo stesso difetto stava in **tre** punti, compreso
`periodoBloccato(blocchi, G, G)` — che rendeva invisibili anche le **chiusure**
segnate dal cliente.

## 2 · `conta_giorno_uscita`: l'ultimo giorno è occupato

`siSovrappongono` usa la semantica dell'albergo — chi esce il 10 libera la
stanza, un altro entra il 10. **Giusta per una casa, falsa per un furgone**, dove
l'ultimo giorno si paga perché il mezzo è fuori. Risultato: chi aveva il furgone
dal 24 al 25 pagava il 25, e il sito vendeva 23→24 a un altro e 25→26 a un
terzo. Lo stesso mezzo a due clienti nello stesso giorno, e passava anche
`capienza.js`, che è l'ultimo muro.

`fineOccupazione(risorsa, dal, al)` va applicata a **tutti e due i lati** del
confronto: su uno solo la sovrapposizione si vede da una direzione e non
dall'altra.

⚠️ Il caso da non rompere è l'opposto: per una **casa** il giorno dell'uscita
resta affittabile, o si perde una notte a ogni cambio. `probe-booking-giornate.mjs`
prova tutti e due i mondi.

## 3 · La parola segue la risorsa

«Notti» usciva anche verso chi prenota (messaggi di errore, email di conferma),
non solo nell'admin. La decide `conta_giorno_uscita`, che è la stessa domanda:
l'ultimo giorno si paga o no.

⚠️ I limiti (`minimo_notti`, `massimo_notti`) sono salvati **in notti** anche per
chi conta i giorni: il pannello mostra in giorni e salva in notti
(`limiteInUnita` / `limiteInNotti`). Cambiare solo l'etichetta metterebbe un
numero falso accanto alla parola.
