---
name: project_sezioni_universali
description: "Sezioni condivise LIVE dal 12/10/2026 (migration 136): una sezione scritta una volta e usata su più pagine — scelte prese, limiti, cosa resta"
metadata:
  type: project
---

**Da dove nasce** (21/09/2026): Francesco voleva la stessa CTA su quattro pagine
di metodotvb, e l'unico modo era copiare i blocchi. Parole sue: *«potremmo creare
delle sezioni "universali" da mettere su pagine a scelta»*.

**Fatto il 12/10/2026**, live, provato in produzione con `tests/probe-sezioni.mjs`.
Dettaglio tecnico: `CLAUDE.md` nota 66. Francesco **non le ha ancora provate lui**.

**Le tre scelte** (proposte da me, prese col suo «vai procedi» del 12/10):
- tabella nuova `sezioni`, non un flag sulle pagine;
- **identica ovunque**: nessuna sovrascrittura per pagina (è la strada che negli
  altri prodotti diventa ingestibile);
- una sezione **in uso non si elimina**: prima la si stacca dalle pagine.

**Why:** una sezione eliminata lascerebbe un buco in pagine che nessuno sta guardando.

**How to apply:**
- Un punto nuovo che legge `pagine.blocks` per mostrarli passa da `espandiSezioni`
  (`lib/sezioni.js`); la pagina salva solo il riferimento (`soloRiferimenti`).
- La sezione si cerca solo fra quelle della stessa entità.
- In `PaginaEditorPage.jsx` niente `new Map()`: `Map` è l'icona di lucide
  ([[reference_lucide_global_shadow]]).

**Limiti detti a Francesco, non ancora decisi:**
- i testi di una sezione condivisa non si scrivono cliccandoli sulla pagina (voluto);
- le versioni salvate del sito non contengono le sezioni;
- in inglese ogni pagina traduce la sua copia: correzioni a mano pagina per pagina;
- l'AI non conosce il tipo `sezione`.

**Primo uso vero, 12/10** (ok di Francesco): metodotvb ha due sezioni condivise —
il pulsante «Scopri i progetti in corso» (4 pagine) e il banner «Pronto a
Diversificare il Tuo Capitale?» (4 pagine). Due e non una perché non stanno sempre
vicine. HTML identico prima e dopo, anche in inglese. Copia delle pagine di prima:
`progetti/backup-pagine-tvb-fondaco-2026-10-12.json`, fuori dal repo.
