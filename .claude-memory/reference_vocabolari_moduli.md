---
name: reference_vocabolari_moduli
description: I moduli delle entità hanno nomi storici diversi dal catalogo nuovo (gallery≠galleria, restaurant, .modules annidato) — funzioneAttiva conosce gli alias, e le PWA vanno provate con un browser
metadata:
  type: reference
---

**Il fatto** (misurato sui dati veri il 25/08/2026): il campo `moduli` non è mai stato
uniforme. Nella radice ci sono nomi ereditati da tre epoche diverse:
- strutture: `chat`, `info`, `wifi`, `reception`, `upselling`, `restaurant`, `housekeeping`
- ristoranti: `info`, `booking`, `gallery`, `allergens`, `pwa_active`
- attività: `active`, **e tutto il resto annidato dentro `.modules`**

Il catalogo nuovo (`lib/funzioni.js`) usa `galleria`, `menu`, `servizi`, `attivita`,
`escursioni`. Quindi `gallery` e `galleria` sono due chiavi per la stessa cosa nello
stesso oggetto — ci sono cascato aggiungendo il pannello Funzioni, e per mezza giornata
l'interruttore Galleria non parlava con quello che l'app leggeva davvero.

**La regola**: `funzioneAttiva(ent, chiave)` è l'unica risposta, e l'ordine è
chiave nuova → `alias` storici → `home_sections` → `MODULI_PREDEFINITI[tipo]`.
`moduliDi(ent)` appiattisce l'annidamento delle attività. Aggiungendo una funzione al
catalogo: **controllare se esiste già con un altro nome nei dati** prima di sceglierne uno.

**Corollario sul come si verifica**: le PWA sono client component. Un identificatore
fuori scope non lo segnala `next build` né si vede con `curl` — la pagina si monta e poi
esplode nel browser. `AEsploraPage` non riceveva `surfaceBg` ed è emerso solo aprendola
con Playwright. Dopo ogni modifica alle PWA: `tests/probe-app-ospite.mjs`.

Vedi [[reference_entita_unificata]] e [[project_session_2026_08_25_moduli]].
