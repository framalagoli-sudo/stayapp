---
name: reference_sonda_misura_sbagliata
description: "Una sonda che misura la cosa sbagliata è peggio di nessuna sonda — manda a cercare un guasto inesistente e ne nasconde uno vero; quando una misura sorprende, stampare la catena degli elementi"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-21T12:05:43.161Z
---

**Il fatto** (25/08/2026, pagina evento). Una sonda cercava «la prima immagine larga più di
100px» per misurare la locandina. Prendeva invece **il logo dentro l'intestazione**.

Risultato: diceva *proporzioni perfette* (quelle del logo, 3.6) e *padding non applicato*
(che invece c'era, 64px). Ho passato **due giri** a sistemare uno spazio che funzionava già,
mentre la locandina — quella vera — restava tagliata.

**La lezione**: una sonda sbagliata non è come non avere una sonda. Non è neutrale — manda
a cercare un guasto che non esiste **e** nasconde quello che c'è. Ci si fida di un numero,
e il numero parla di un'altra cosa.

**Come se ne esce**: quando una misura sorprende (un padding che «non si applica», una
proporzione troppo bella), non ragionare sul codice — **stampare la catena degli elementi
dal basso verso l'alto** con posizione, padding e coordinate. Lì si vede subito che il nodo
misurato sta dentro `.snav` e non nel corpo della pagina.

**In pratica**, un selettore per una misura visiva va sempre ancorato al contesto:
```js
[...document.querySelectorAll('img')]
  .filter(i => !i.closest('.snav') && !i.closest('footer') && !i.hasAttribute('aria-hidden'))
```
Vedi [[feedback_diagnosi_prima_del_deploy]] — vale lo stesso principio: la causa si accerta,
non si deduce.

## Terza volta, stesso schema: l'indirizzo sbagliato (21/09/2026)

`PERCORSO=/a/metodotvb/p/chi-siamo node probe-contrasto.mjs` ha misurato
`/A:/metodotvb/...`: **Git Bash converte un percorso di una sola lettera in una
lettera di unità** (`/a/…` → `A:/…`), diverso dal caso già noto `/r/…` →
`C:/Program Files/Git/r/…`. La sonda ha detto «✓ ogni testo si stacca dal suo
sfondo» misurando **un 404**.

La funzione `percorso()` in `tests/probe-contrasto.mjs` ora rimette a posto
entrambe le forme. ⚠️ Quando una sonda passa **al primo colpo** su una pagina
appena cambiata, guardare la riga dell'indirizzo che stampa prima di esultare.
