---
name: reference_dato_riservato_a_monte
description: Un dato riservato non si toglie a valle, non si legge a monte — e cercare un segreto nell'HTML confrontando pochi caratteri dà falsi positivi
metadata:
  type: reference
---

**Regola** (invariante 13 in SECURITY.md, dal 25/08/2026): se un campo è riservato, la
query non deve chiederlo per i rami che non ne hanno diritto. Toglierlo dopo funziona
finché qualcuno non aggiunge un ramo nuovo — e non se ne accorge nessuno.

Caso reale: `wifi_password` veniva letto da `getStruttura()` per **tutti** i chiamanti e
rimosso solo nel ramo del minisito. Risultato misurato in produzione su un cliente vero:
la password era nel payload di `/s/<slug>`, `/s/<slug>/privacy`, `/s/<slug>/cookie` e
del manifest PWA, e nessuna di quelle pagine aveva `noindex`. Ora la chiede solo il ramo
dell'app ospite: `getStruttura(slug, { ospite: true })`. Sonda: `tests/probe-wifi-privacy.mjs`.

**Corollario sul metodo di misura** — cercare un segreto dentro l'HTML confrontando pochi
caratteri produce **falsi positivi**:
- i primi ~40 caratteri di un JWT sono l'header base64, **identico** fra service key e anon key;
- una password corta come `214` si trova dentro un path SVG o un timestamp.

Confrontare la **coda** della stringa e stampare il contesto intorno all'occorrenza prima
di dichiarare un'esposizione. Il primo giro di questa verifica ha prodotto due allarmi:
uno vero, uno falso.

Vale anche al contrario: la sonda deve verificare che il dato **resti** dove serve, o si
"ripara" la privacy rompendo la funzione.
