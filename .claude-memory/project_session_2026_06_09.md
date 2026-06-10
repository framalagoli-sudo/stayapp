---
name: project-session-2026-06-09
description: RistoranteMenuPage — collapse/accordion, DnD a 3 livelli, include categoria, icone catalogo
metadata:
  node_type: memory
  type: project
  originSessionId: 814df534-7fb3-41f8-b657-a325f7b1931d
---

## RistoranteMenuPage.jsx — refactor completo (2026-06-09) ✅

### 1. Collapse / accordion
- Cataloghi collassati di default. Click chevron → toggle apri/chiudi.
- Categorie dentro un catalogo aperto: accordion — una sola aperta per volta.
- Legacy single-mode: stesso accordion per categorie.
- Stato: `openCatalogos` (Set<id>), `openCategory` ({ [catalogoId]: categoryId }), `openSingleCatId` (string|null).

### 2. Drag & drop — 3 livelli annidati
- **Livello 1 — Cataloghi**: `DndContext` + `SortableContext` wrapper della lista cataloghi.
- **Livello 2 — Categorie** (dentro ogni catalogo aperto): `DndContext` + `SortableContext` annidati. `handleCategoryDragEnd(ci)` fa `arrayMove` su `categories[ci]`.
- **Livello 3 — Piatti** (dentro ogni categoria aperta): `DndContext` + `SortableContext` ulteriormente annidati. `handleItemDragEnd(ci, catIdx)` fa `arrayMove` su `categories[ci].items[catIdx]`.
- Legacy single-mode: DnD per categorie (`handleSingleCatDragEnd`) + DnD per piatti dentro categoria (`handleSingleItemDragEnd(ci)`).
- Pattern: `SortableItem` definito a livello modulo con render-prop `children(listeners, attributes)`. Grip `GripVertical` nel render-prop. `activationConstraint: { distance: 5 }` evita drag su click.
- `ItemRow` accetta `dragListeners`/`dragAttrs` opzionali; se presenti mostra grip a sinistra con `e.stopPropagation()` per non aprire il form piatto.

### 3. "Includi in altro catalogo" — dropdown con optgroup
- Dropdown `<select>` con `<optgroup label={cat.name}>` per ogni catalogo diverso dal corrente.
- Mostra solo altri cataloghi (non lo stesso). Ogni optgroup lista le categorie disponibili nel catalogo target.
- Label: "Includi in un altro catalogo".

### 4. "Copia categoria in altro catalogo"
- Bottone `<select>` viola "Copia in…" nel header di ogni categoria (solo in multi-catalogo).
- `includeCategoryInCatalogo(sourceCi, sourceCatIdx, targetCi)`: duplica l'intera categoria + tutti i piatti con `shared_from` nell'item copiato, aggiunta in fondo al catalogo target.
- Non appare in single-mode (nessun altro catalogo disponibile).

### 5. Icone selezionabili per cataloghi
- 25 icone Lucide coprenti tutti i casi d'uso: Ristorante, Menu, Pizza, Vini, Cantina, Birre, Cocktail, Soft drinks, Drinks, Caffè, Pranzo/Panini, Insalate, Pesce, Carne, Grill/BBQ, Chef special, Gelati/Dolci, Snack, Vegan/Green, Pool Bar, Lunch, Dinner, Aperitivo, Premium, Speciale.
- Stored come `catalogo.icon` (string key, es. `"pizza"`, `"waves"`, `"moon"`).
- UI: bottone icona cliccabile accanto al chevron → apre griglia 5×5 con label sotto ogni icona. Icona attiva evidenziata in viola `#7c3aed`. Picker chiude su `onBlur` o selezione.
- `CATALOGO_ICONS` array a livello modulo con `{ key, Icon, label }`.
- `updateCatalogo(ci, patch)` funzione generica per aggiornare qualsiasi campo del catalogo.
- Default: se `catalogo.icon` non è impostato, mostra `Utensils`.

### 6. Fix icone catalogo in PWA cliente (MenuTab.jsx)
- **Bug:** `MenuTab.jsx:336` aveva `<Utensils />` hardcodata — ignorava completamente `c.icon`.
- **Fix:** aggiunta `CATALOG_ICON_MAP` (25 chiavi, specchio di `CATALOGO_ICONS` in RistoranteMenuPage) + `const Icon = CATALOG_ICON_MAP[c.icon] || Utensils` nel render della catalog card.
- Importati gli stessi icon components in `MenuTab.jsx`.

### File modificati
- `client-next/components/admin/ristorante/RistoranteMenuPage.jsx`
- `client-next/components/MenuTab.jsx`

### Smoke test
- 37/37 verde dopo ciascuno dei deploy di questa sessione ✅

**Why:** UX multi-menu era inutilizzabile senza collapse. DnD a tutti i livelli = riordinamento completo del catalogo. Icone per distinguere visivamente cataloghi diversi (Pool Bar, Ristorante, Pizza, Enoteca…).
**How to apply:** Pattern DnD render-prop `SortableItem` riusabile ovunque. [[project-session-2026-06-08b]]
