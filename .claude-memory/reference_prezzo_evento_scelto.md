---
name: reference-prezzo-evento-scelto
description: "Il prezzo di un evento lo dichiara il cliente (prezzo_modo, migration 123): «nessuna cifra» non vuol più dire «gratis» — segnalato da Garage 22"
metadata:
  type: reference
---

**Segnalato da Garage 22 (18/09/2026)**: la cena si paga sul posto, il campo prezzo era vuoto, e la pagina dell'evento scriveva **«Gratuito»**. Non estetica: un'informazione falsa a chi prenota.

**La radice era una deduzione**: «nessuna cifra» veniva letto come «è gratis», mentre vuol dire **«nessuno l'ha detto»**. Ora la scelta è esplicita — `eventi.prezzo_modo` (migration **123**): `gratuito` · `cifra` · `testo` · **NULL = non si scrive niente**. Nell'editor sono tre pulsanti, e finché non si sceglie un avviso spiega che non si legge niente.

- `mostra_prezzo` / `mostra_prezzo_pagina` **restano**: dicono DOVE mostrarlo (copertina, pagina), che è un'altra domanda da COSA mostrare.
- La cifra vera resta `price`: `prezzo_modo` riguarda **solo quello che si legge**. Un pacchetto scelto vince su tutto, perché è quello che viene addebitato → [[reference_valore_a_pagamento_accertato]].
- Backfill della migration: `cifra` dove c'era un prezzo, `testo` dove c'era una frase, **NULL** per i due eventi che dicevano «Gratuito» senza averlo scelto (Garage 22 e uno di prova).
- Il valore arriva fino in fondo: whitelist + validazione nelle due route di scrittura, select della lista pubblica e di `lib/evento-pubblico.js`, elenco del pannello (diceva «Gratuito» per la stessa deduzione).

⚠️ Le **offerte** hanno gli stessi campi (`mostra_prezzo`, `prezzo_testo`): in pubblico non dicono «Gratis» quando il prezzo è 0 (il blocco non scrive niente), ma **l'elenco del pannello sì** (`OfferteListPage`). Stessa classe, non ancora sistemata.

Vedi [[reference_eventi_conclusi]], [[feedback_cercare_tutti_i_punti]].
