---
name: reference_blocco_team_varianti
description: "Il blocco team ha tre varianti (griglia/ritratti/editoriale) — e in CSS grid `order` sposta l'elemento anche di COLONNA, non solo di posto"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-21T12:05:55.710Z
---

**Le tre varianti** (21/09/2026, `d.variant` nel blocco `team`, come per
testimonianze/stats/highlights):
- **`griglia`** — il blocco storico: foto piccole (96px tonde se `formato` non è
  scelto), testo centrato, bio 13px. **È il predefinito quando la chiave manca**,
  quindi i siti già online non cambiano faccia.
- **`ritratti`** — foto grandi che riempiono la colonna (4/5 se era «cerchio»),
  testo a sinistra, ruolo in accento, nome 22px, bio 14,5px. **È il predefinito
  dei blocchi NUOVI** (`BLOCK_DEFAULTS.team` + il blocco starter in `SitoPage`).
- **`editoriale`** — una persona per riga, ritratto 400px che si alterna di lato,
  nome fino a 34px, bio 16px su misura di 60 caratteri, filetto fra le persone.
  Nato per Metodo TVB, dove ogni socio ha 600+ caratteri di biografia.

Documentato anche all'AI in `lib/ai-blocks.js`, così i siti generati non nascono
con la griglia vecchia.

## ⚠️ In CSS grid `order` cambia la TRACCIA, non solo l'ordine

Nella variante editoriale le righe pari si invertono. Fatto con il solo `order`
(come `.lbr-ft`, che però ha due colonne uguali `1fr 1fr`) il risultato era
sbagliato: con `grid-template-columns: 400px 1fr`, l'elemento con `order: 0`
finisce **nella prima traccia**. Nella riga invertita ci andava il testo, e il
ritratto si prendeva la colonna larga diventando enorme.

La correzione è invertire le **colonne**: `.lbr-team-ed.inv { grid-template-columns: 1fr 400px }`.

Visto in uno **screenshot**, non leggendo il codice: il difetto non dà errore,
non rompe il layout, sembra solo «una foto un po' grande». Vedi
[[feedback_verificare_il_contesto]] e [[reference_grid_liste_admin]].
