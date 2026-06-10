---
name: session-2026-06-02-allergeni-menu-landing
description: "Sistema allergeni EU strutturato (admin + PWA + sito), menu completo nel minisito, icone Lucide per allergeni, fix SW + QR Code + collegamenti landing."
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Fix "Scopri anche" nelle landing (bidirezionalità collegamenti)

**Fix:** Aggiunta sezione prima del `<footer>` in:
- `LandingRistorante.jsx` — usa `ristorante.collegamenti`
- `LandingStruttura.jsx` — usa `property.collegamenti`

---

## Pagina QR Code — super_admin + attività

**File:** `client/src/pages/admin/QRCodePage.jsx`

- `super_admin`: fetch diretto `Promise.all([/api/properties, /api/ristoranti, /api/attivita])`
- Attività aggiunta con `tipo: 'attivita'`, URL `/a/${slug}?qr=1`, colore `#7c3aed`
- Spostato in "Sito & App" per admin_azienda/staff; in "Account" per super_admin

---

## Fix Service Worker — primo accesso QR

**File:** `client/vite.config.js`

- Rimosso `html` da `globPatterns` → solo `{js,css,ico,png,svg}`
- Aggiunto `NetworkFirst` per navigazioni → HTML sempre dalla rete

**How to apply:** Non riaggiungere mai `html` a `globPatterns`. Le navigazioni SPA usano `NetworkFirst`.

---

## Sistema allergeni strutturato EU 14 — completo

### Struttura dati

```js
// item.allergens → array chiavi EU: ['glutine', 'latte', ...]
// item.dietary   → array flag: ['vegetariano', 'vegano', 'senza_glutine', ...]
const BLANK_ITEM = { ..., allergens: [], dietary: [], ... }
```

`normalizeAllergens(val)` — backward compat: converte vecchie stringhe in array.

### Admin (`RistoranteMenuPage.jsx`)

- 14 chip compatti con abbreviazione (`Gl`, `Cr`, `La`, `Mo`...) — toggle diretto, amber attivi
- 5 chip "Caratteristiche" (Vegetariano/Vegano/Senza glutine/Senza lattosio/Piccante) — verdi attivi

### Componente condiviso (`client/src/components/MenuTab.jsx`)

**Unica sorgente di verità** importata da `RestaurantApp.jsx` (PWA) e `LandingRistorante.jsx` (sito).

**EU_ALLERGENS con icone Lucide:**
| Allergene | Icona |
|---|---|
| Glutine | `Wheat` |
| Crostacei | `Shrimp` |
| Uova | `Egg` |
| Pesce | `Fish` |
| Arachidi | `Nut` |
| Soia | `Bean` |
| Latte | `Milk` |
| Frutta a guscio | `Nut` |
| Sedano | `LeafyGreen` |
| Senape | `Flower2` |
| Sesamo | `Sprout` |
| Solfiti | `Wine` |
| Lupini | `Bean` |
| Molluschi | `Shell` |

**Componenti guest:**
- `AllergenChip({ label, icon })` — badge amber con icona Lucide + label
- `DietaryBadge({ flag })` — verde per Veg/Vegan/GF/LF; arancio + `Flame` per piccante
- `AllergenFilterBar` — scroll orizzontale 14 allergeni con icona+label; chip selezionato = esclude dal menu
- `MenuItem` — dietary badges separati dagli allergeni; micro-label "ALLERGENI" sopra i chip allergeni
- `MenuTab` — gestisce menu singolo e multi-catalogo; `excluded` state per filtro

### Minisito (`LandingRistorante.jsx`)

- `menu_preview` ora usa `<MenuTab>` identico alla PWA (max-width 720px, centrato)
- `showAllergens = ristorante.modules?.allergens !== false`
- `menuRadius` derivato da `theme.borderStyle`
- Rimosso vecchio teaser (6 cat × 2 piatti) → menu completo con accordion, foto, badges, filtro

### Deploy

- I deploy senza `--force` dopo modifiche al `MenuTab.jsx` fallivano (cache corrotta Vercel)
- **How to apply:** usare `npx vercel --prod --yes --force` se la build fallisce con exit 127
