---
name: reference_errori_che_legge_ospite
description: "guestFetch buttava via il messaggio della route e mostrava all'ospite «guestFetch /api/guest/…: 400» — l'indirizzo della nostra API al posto della spiegazione"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-22T14:12:10.937Z
---

**Il fatto** (22/09/2026, segnalato da Francesco su un evento di Garage 22).
Prenotando su un evento quasi pieno, sul sito compariva:

    guestFetch /api/guest/eventi/5c994162-a929-4c20-b2a2-00826f162660/book: 400

Sembrava un log da sviluppatore. **Era quello che leggeva l'ospite.**

    if (!res.ok) throw new Error(`guestFetch ${path}: ${res.status}`)

`lib/api.js` scartava il corpo della risposta e costruiva l'errore con il
percorso dell'API e il codice di stato. Tutti i messaggi scritti con cura nelle
route — «Per prenotare serve il consenso al trattamento dei dati», «Per questo
evento serve un numero di telefono», «Posti esauriti» — **non arrivavano a
nessuno**. Valeva per ogni pagina pubblica che usa `guestFetch`: eventi, form,
recensioni, disiscrizione, shop.

Ora `guestFetch` legge il JSON, usa `corpo.error` e allega all'errore gli altri
campi della risposta (`posti_liberi`, `lista_attesa`), così chi chiama può
**reagire** e non solo scrivere una frase: la pagina dell'evento, quando i posti
finiscono mentre si compilava, si ricarica e mostra «tutto esaurito» con la
lista d'attesa invece di una riga rossa sotto un modulo che non funzionerà più.

## Due difetti trovati con lo stesso filo

⛔ **Chi è in lista d'attesa occupava posti** nel controllo anti-overbooking:
`confermaPostiEvento` filtrava solo `cancelled`, mentre `recomputeEventSeats`
escludeva anche `waitlist`. Su un evento con gente in attesa, una prenotazione
valida veniva **ritirata dopo essere stata creata**. Due regole sullo stesso
concetto devono dire la stessa cosa, o il numero che si mostra e il numero che
decide divergono.

⚠️ **Il rate limit è 10 prenotazioni/ora per IP** (`evento-book`). Provando a
mano si satura in fretta, e un 429 **non è un guasto del prodotto**: la sonda
`probe-posti-ultimo.mjs` ora lo dichiara («questo controllo non è stato
misurato») invece di segnare una croce.

Vedi [[reference_posti_riservati_eventi]], [[reference_modulo_prenotazione_evento]],
[[reference_sonda_misura_sbagliata]].
