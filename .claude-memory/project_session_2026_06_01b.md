---
name: session-2026-06-01b-homepage-block-editor
description: "Homepage block editor — unica strada per minisito, migrazione automatica da vecchio sistema"
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Implementato: editor a blocchi come unica strada per la homepage del minisito

**Why:** Due logiche parallele (vecchio sistema sezioni + nuovo editor blocchi) confondevano l'utente. Ora c'è una sola via.

**How to apply:** Il sistema è live su oltrenova.com. Non toccare la logica di fallback nelle landing page senza considerare la retrocompatibilità.

### Architettura finale

**Admin → Minisito** (per struttura, ristorante, attività):
- Toggle attivo/disattivo
- Card scuro "Homepage a blocchi" sempre visibile → pulsante **"Modifica homepage"**
- Tab: solo **Generale** (tagline, booking_url, video, favicon) e **SEO & Social**
- Tab rimossi: highlights, offerte, pacchetti, testimonianze, faq, cta, contenuto, sezioni (dati nel DB, UI rimossa)

**Logica "Modifica homepage":**
1. Cerca pagina `__home__` esistente
2. Se esiste con blocchi → apre direttamente PaginaEditorPage
3. Se esiste vuota → esegue migrazione automatica, poi apre editor
4. Se non esiste → crea pagina + migrazione + apre editor

**Migrazione automatica** (`buildHomeBlocks` in MiniSitoPage.jsx):
- Converte dati `minisito` JSONB in blocchi per il PaginaEditorPage
- Hero sempre primo (cover, tagline, booking_url)
- Segue `section_order` esistente, salta sezioni disabilitate
- Mapping campi: `titolo→title`, `testo→text`, `nome→author`, `stelle→rating` ecc.
- promozioni/pacchetti: aggiunge solo il blocco, i dati restano in `mini` (LandingBlockRenderer li legge da lì)

### Nuovi file creati
- `client/src/components/LandingBlockRenderer.jsx` (825 righe) — renderer condiviso per tutti i tipi blocco nelle landing page

### File modificati
- `client/src/lib/blockTypes.js` — aggiunto tipo `hero`
- `client/src/pages/admin/PaginaEditorPage.jsx` — editor hero + fix previewUrl per __home__
- `client/src/pages/guest/PaginaPage.jsx` — renderer hero
- `client/src/pages/guest/LandingStruttura.jsx` — carica __home__, fallback vecchio layout
- `client/src/pages/guest/LandingRistorante.jsx` — idem
- `client/src/pages/guest/LandingAttivita.jsx` — idem
- `client/src/pages/admin/MiniSitoPage.jsx` — card editor, tab semplificati, buildHomeBlocks, openHomepageBuilder

### Comportamento landing page
- Se `__home__` esiste con blocchi → mostra LandingBlockRenderer (nuovo sistema)
- Altrimenti → fallback vecchio layout (retrocompatibile)

### Nota importante
Il PaginaEditorPage mostra "anteprima" su __home__ aprendo direttamente l'URL base dell'entità (senza `?preview=1`), poiché la pagina è sempre pubblicata.
