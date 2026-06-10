---
name: session-2026-06-01c-pwa-unificata
description: PWA ristorante e attività unificate alla struttura — stessa UX Home/Esplora/Richiesta/Info/Chat
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Implementato: PWA ristorante e attività con struttura identica alla PWA struttura

**Why:** L'utente ha chiesto di uniformare tutte le PWA (struttura/ristorante/attività) alla stessa usabilità, personalizzando solo i campi specifici per tipo di entità.

**How to apply:** Tutte le PWA ora seguono lo stesso pattern architetturale. Non introdurre differenze strutturali tra le tre senza una buona ragione.

---

### Architettura PWA unificata

Tutte e tre le PWA hanno:
- Nav: **Home / Esplora / [Azione] / Info / Chat**
- Compact bar (appare dopo scroll > 120px)
- Chip bar nella tab Esplora
- Chatbot sempre montato (`display: none/flex`), attivato con `active_app ?? active`
- CSS prefisso per entità: `g-*` (struttura), `r-*` (ristorante), `a-*` (attività)
- Desktop mockup: 390px, border-radius 44px

---

### RestaurantApp.jsx — riscritta

**Nav:** Home / Esplora / Prenota / Info / Chat

**RHomePage** (nuova):
- Welcome card con `description` + `schedule`
- Feature cards: Menu, Galleria, Prenota (griglia 2 colonne)
- Scopri anche (collegamenti)

**REsploraPage** (nuova):
- Chip tabs: Menu / Galleria
- MenuTab e GalleriaTab spostati qui (contenuto invariato)

**PrenotaTab / InfoTab**: invariati nel contenuto, ora tab di primo livello

**Moduli rispettati:** `rModules.booking` (Prenota), `rModules.info` (Info), `rModules.gallery`, `rModules.allergens`

**home_sections** per ristorante: `menu`, `galleria`, `prenota` (letti da `rModules.home_sections`)

---

### AttivitaPWA.jsx — riscritta

**Nav:** Home / Esplora / Richiesta / Info / Chat

**AHomePage** (nuova):
- Welcome card con `description` + `schedule` + `address`
- Feature cards: Servizi, Galleria

**AEsploraPage** (nuova):
- Chip tabs: Servizi / Galleria
- `AServiziContent`: lista servizi con stile card

**ARichiestaTab** (nuova):
- CTA rapide: Chiama, WhatsApp, Email
- Form contatto (nome, email, messaggio) → `POST /api/guest/contact`

**AInfoPage** (nuova):
- Orari, contatti strutturati, link privacy/cookie

**Chatbot:** `active_app ?? active` anche per attività

---

### AttivitaModuliPage.jsx — creata

File: `client/src/pages/admin/attivita/AttivitaModuliPage.jsx`

- Toggle "App Clienti attiva" → salva su `attivita.pwa.active`
- Schede in evidenza (Home): Servizi, Galleria con toggle + ▲▼ riordino
- Salva su `attivita.pwa.modules.home_sections` + `home_section_order`

---

### AttivitaApp.jsx — aggiornato

Ora usa logica QR identica a struttura/ristorante:
- `isQR` via `useSearchParams`
- `pwaOn = attivita.pwa?.active === true`
- `miniOn = attivita.minisito?.active !== false`
- QR + pwaOn → PWA; miniOn → Landing; nessuno → offline

---

### Admin aggiornato

- `AdminLayout.jsx` ATTIVITA_SUBS: aggiunta voce `{ sub: 'moduli', label: 'App Clienti', icon: Layers }`
- `App.jsx`: aggiunta route `attivita/:id/moduli` + import AttivitaModuliPage
- `Breadcrumb.jsx`: aggiunta label `moduli: 'App Clienti'` in ATTIVITA_SUB_LABELS

---

### Blocchi condivisi precedente sessione

- `blockTypes.js`: aggiunto tipo `clienti` (carosello loghi partner, grayscale→color hover)
- `PaginaEditorPage.jsx`: editor per blocco clienti
- `PaginaPage.jsx` + `LandingBlockRenderer.jsx`: renderer con CSS @keyframes infiniti

### UX/UI admin rinominato

- "Moduli attivi" → "App Clienti" ovunque (AdminLayout, Breadcrumb, RistoranteModuliPage, PropertyModulesPage)
- "Minisito" → "Sito web" ovunque
- Chatbot: toggle singolo → due toggle separati (`active_app` PWA / `active_sito` minisito)
- `PropertyModulesPage` ricostruita: sezione Tab toggles + sezione Schede in evidenza con ▲▼
