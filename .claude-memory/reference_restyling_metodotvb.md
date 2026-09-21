---
name: reference-restyling-metodotvb
description: "21/09/2026: rifatto il design di metodotvb dai suoi stessi dati, via API. Come ripristinarlo, e i due difetti di contrasto che ha fatto emergere"
metadata:
  type: reference
---

**Autorizzato da Francesco il 21/09/2026**: «mantieni i dati che già ci sono e fallo su metodotvb, design tipo i due siti di riferimento».

**Cosa è cambiato** (nessuna parola del cliente toccata):
- tema: fondo `#0B0F14`, testo `#EAF0F4`, titoli **Sora**, primario `#21B5CE` (il loro ciano acceso), accento **oro `#C8A96E`** (era già il loro secondario);
- hero: alone del colore tema, e «in **Umbria**» in oro — stesse parole, dentro `<mark>`;
- etichette numeriche `01` `02` `03` sopra le sezioni. ⚠️ **Solo numeri, non parole**: i titoli dicono già «Chi Siamo», «Perché Sceglierci» — scriverne altre vorrebbe dire mettere parole in bocca al cliente;
- CTA finale con alone oro; **barra a pillola** (`header_cfg.style: 'pillola'`).

**RIPRISTINO** — versione salvata **prima**: `site_snapshots` id **`dee807f6-e7ba-437b-a812-3800be12e62a`**, etichetta «Prima del restyling — 21/09/2026», entità `metodotvb` (attivita). Due strade: dal pannello **Sito web → Versioni**, oppure chiedendolo a me (`POST /api/sito-snapshots/<id>/restore`). Il ripristino è **a sua volta annullabile**: salva prima lo stato corrente.

**Come si fa** (vale per qualsiasi sito): versione di sicurezza → leggi `pagine.blocks` del `__home__` → aggiungi `style` ai blocchi → `PATCH /api/pagine/[id]` e `PATCH /api/<tipo>/[id]` per tema e header. **Sempre passando dalle route**, mai scrivendo nel database: così attraversa gli stessi controlli del pannello.

⛔ **Due difetti veri trovati solo guardando la pagina**:
1. Il paragrafo del blocco `about` era **`#444` su fondo scuro: contrasto 1,84**, illeggibile. Il ripiego stava dentro `cBody || textColorFor(...) || '#444'`, che la sostituzione del 18/09 non aveva agganciato (cercava `cBody || '#444'`).
2. Il pulsante **«Accetto» del banner cookie**: bianco su colore tema chiaro, **2,45**. Ora il testo lo decide il colore sotto (`readableOn`).

⛔ **E la sonda li aveva dati per buoni**: `probe-contrasto` confrontava due luminanze con una **soglia inventata da me**. Ora calcola il contrasto WCAG vero (con gamma) e usa 4,5 / 3,0. **Una sonda che passa non vuol dire niente se la soglia se l'è inventata chi l'ha scritta.**

Idea di prodotto emersa: **«Rinnova l'aspetto»** — il cliente clicca, l'AI propone un altro registro sui suoi contenuti, lui tiene o butta. La rete di sicurezza esiste già ed è questa.

Vedi [[reference_registro_visivo_siti]], [[reference_sonda_misura_sbagliata]].
