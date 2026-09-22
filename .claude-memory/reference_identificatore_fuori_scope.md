---
name: reference_identificatore_fuori_scope
description: "Un componente definito fuori dal renderer che usa una funzione interna → 500 in SSR; il build non lo vede e nemmeno una GET, se il ramo è spento dai dati"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-22T10:14:53.293Z
---

**Il fatto** (22/09/2026, home di inlingua Terni). Ho messo un link su una
slide dell'hero e la pagina è andata in **500**:

    ReferenceError: siteHref is not defined
      at HeroSlider (components/LandingBlockRenderer.jsx)

`HeroSlider` e `Carousel` sono componenti dichiarati **fuori** da
`LandingBlockRenderer`, ma usavano `siteHref`, che è definita **dentro**.
Corretto passandola come prop, con un ripiego innocuo nel valore predefinito.

## Perché non se n'era accorto nessuno per mesi

Il ramo era dietro `s.cta1_text && s.cta1_url`, e **tutti gli slider avevano
`cta1_url` vuoto**: la condizione era sempre falsa, quindi quella riga non
veniva mai eseguita. Il difetto era nel codice da sempre, invisibile finché
qualcuno non riempiva quel campo.

## La lezione, che è più larga del caso

`next build` **non vede un identificatore fuori scope** (nota 32 di CLAUDE.md,
già imparata con `AEsploraPage`). Ma qui c'è un secondo strato: **non lo vede
nemmeno una GET di controllo**, se i dati non accendono quel ramo. Un sito può
rispondere 200 per mesi e rompersi il giorno che un cliente compila un campo
che nessuno aveva mai compilato.

Quindi: quando si aggiunge un componente **fuori** dal renderer principale,
controllare cosa usa che non riceve come prop. E quando si scrive il primo dato
che accende un ramo mai usato, **aprire la pagina** — quello è il momento in
cui il difetto esce.

⚠️ Corollario operativo: cercare **tutti** i punti. Il carosello aveva lo
stesso difetto, ancora mai innescato.

Vedi [[feedback_verificare_il_contesto]], [[project_inlingua_terni]].
