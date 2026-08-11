---
name: reference-grid-liste-admin
description: "Liste in display:grid senza gridTemplateColumns si dimensionano sul contenuto: la riga sfora la scheda e i puntini di troncamento non scattano — usare minmax(0, 1fr)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 7defb6ab-c608-4221-b1b5-1731818ba405
  modified: 2026-08-11T12:27:28.377Z
---

Negli editor admin (inline styles, niente CSS framework) le liste sono spesso
`<div style={{ display: 'grid', gap: 8 }}>`. **Senza `gridTemplateColumns`, la
colonna implicita si dimensiona sul contenuto (min-content), non sul
contenitore.** Se una riga contiene testo `whiteSpace: 'nowrap'` (tipico dei
nomi in elenco), quel testo impone la larghezza minima e la riga si allarga
oltre la scheda.

Due sintomi che sembrano bug diversi ma hanno questa unica causa:
1. **Gli elementi a destra della riga finiscono fuori dal riquadro** (campi,
   pulsanti icona) e sembrano "non modificabili" perché invisibili.
2. **Il testo non viene troncato con i puntini**: `overflow:hidden` +
   `textOverflow:ellipsis` + `minWidth:0` non bastano se il contenitore si
   allarga invece di stringersi — l'ellipsis scatta solo quando c'è compressione.

**Fix:** `gridTemplateColumns: 'minmax(0, 1fr)'` sulla lista (e
`minmax(0, 1fr) <fissa>` sulle griglie a più colonne, es. nome + prezzo).
`1fr` da solo NON basta: equivale a `minmax(auto, 1fr)` e conserva il minimo
automatico.

Trovato in `RistoranteMenuPage.jsx` (11/08/2026, fix `fd2023e5`): la riga
piatto era 764px in uno spazio da 622px, sforando la scheda di 107px. Sospetto
iniziale sbagliato: sembrava un bug della duplicazione menu, ma il catalogo non
modificabile era l'**originale** — la duplicazione aveva solo aggiunto
annidamento, facendo emergere uno sforo latente.

**Come applicarlo:** controllare questo pattern in ogni editor admin con liste
annidate (pagine CMS, vetrine, form builder), soprattutto dove i nomi sono
lunghi. Vale la pena verificarlo misurando dal vivo (`scrollWidth` vs
`clientWidth`, posizione dell'elemento rispetto alla scheda), non a occhio.

Vedi [[feedback_diagnosi_prima_del_deploy]].
