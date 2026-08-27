---
name: project_session_2026_08_28
description: "Sessione 28/08 — calendario booking (admin + front-end), prenotazione a mano, flusso prodotti unificato; e il rimprovero di Francesco sugli errori ripetuti"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-27T20:58:17.941Z
---

## Il calendario del booking (i 5 punti chiesti)

Vista **mensile** sul modello del piano editoriale, al posto della griglia
settimanale per risorsa: buona per confrontare più risorse in pochi giorni,
inutile per chi affitta — che vuole vedere «com'è messo il mese» su una cosa.

- Colori con legenda: **verde libero, giallo in parte occupato, rosso pieno**.
  Non verde/rosso secco: a slot e a coperti un giorno può essere mezzo pieno, e
  dipingerlo di rosso per una prenotazione a pranzo direbbe una cosa falsa.
- Clic su un giorno: chi c'è, con conferma / annulla / completa / **elimina**.
  «Annulla» ed «Elimina» restano separati — uno libera il posto lasciando
  traccia, l'altro toglie dai conti per sempre.
- Front-end: il visitatore sceglie il periodo **cliccando sul calendario**, i
  giorni presi sono spenti e barrati (non solo colorati: uno su dodici uomini
  non separa il verde dal rosso).

⚠️ **Il difetto che il calendario ha fatto emergere è più grave della vista**:
un affitto dal 10 al 14 risultava occupato **solo il 10**, perché occupancy ed
elenco del giorno chiedevano `data = X`. Il titolare avrebbe riaffittato la
stessa casa. Trovato guardando i colori, non ragionando.

⚠️ L'endpoint pubblico `?mese=YYYY-MM` risponde **solo con le date occupate**:
davanti c'è un visitatore, e l'elenco dei clienti di un'attività non lo
riguarda. La sonda controlla il **corpo grezzo**, non i campi attesi.

## Prenotazione a mano

`POST /api/booking/prenotazioni` non esisteva: il titolare che riceveva una
telefonata doveva dire «vada sul sito». E io avevo messo un pulsante che
puntava lì.

## Flusso unificato (segnalato da Francesco)

Percorrendo catalogo → prodotti → shop → offerte gli sembravano due strade. La
simulazione gliel'ha dato ragione: dallo shop il prodotto finiva in `prodotti`,
dal catalogo in `vetrina_elementi`. **L'avevo peggiorato io** creando le route
mancanti dello shop il giorno prima.

Ora: lo shop rimanda ai Prodotti, e «Nuova offerta» chiede da cosa partire —
un prodotto che hai già, o qualcosa di nuovo.

## Il rimprovero, e cosa ne ho fatto

*«fai ragionamenti prima di prendere decisioni che poi, ultimamente, toppi
tutte»*. Ha ragione. Ho scritto [[feedback_verificare_il_contesto]] con la
radice comune (consegno il pezzo senza guardare la giunzione con quello che
c'era) e le quattro domande da farsi prima, e le ho messe anche nel
`CLAUDE.md` globale perché valgano in ogni sessione.

## Sonde nuove

`probe-calendario-booking.mjs` (15 controlli), `probe-flusso-unico.mjs` (9),
`probe-widget-giornate.mjs` esteso al calendario pubblico e alla privacy
dell'endpoint mese.
