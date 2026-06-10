---
name: session-2026-06-01d-menu-tipo-titolo-pwa
description: "Fix menu admin — tipo categoria personalizzato, visibilità voci, multi-menu. Fix PWA — home \"N voci\", document.title = nome entità su tutte e tre le PWA."
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Fix RistoranteMenuPage — tipo categoria + accordion + visibilità + multi-menu

**Why:** L'utente ha chiesto accordion, toggle visibilità per piatto, inclusione piatto in più menu, e campo tipo categoria configurabile. Nella stessa sessione è emerso un bug sul campo "Personalizzato".

**How to apply:** Queste feature sono già in produzione. Se si toccano le categorie del menu, rispettare i pattern qui sotto.

### Pattern implementati

**Accordion categorie (guest PWA)**
- `openCat` state inizializzato con `menu[0]?.id` (prima categoria aperta di default)
- `toggleCat(id)` → `prev === id ? null : id`
- `CatalogoDetail` è un componente separato per avere stato accordion indipendente per ogni catalogo

**Toggle visibilità voce**
- `item.active !== false` — default-true per backward compatibility
- Admin: pulsante 👁/🚫 che fa `onChange({ active: !active })`
- Guest: `(cat.items || []).filter(i => i.active !== false)`

**Tipo categoria**
- Presets: `['piatto', 'vino', 'cocktail', 'pizza', 'dolce', 'birra', 'panino']`
- `CategoryHeader` ha `showCustom` state + `customVal` state
- Bug fix: `showCustom` è locale, non derivato dalla prop — `const [showCustom, setShowCustom] = useState(isCustom)`
- `selectVal = (showCustom || isCustom) ? '__custom' : (tipo || 'piatto')`
- `getTipoLabel(cat, count)` usa `TIPO_SING`/`TIPO_PLUR` per il conteggio nell'accordion header

**Multi-menu (inclusione voce)**
- `shared_from: sourceItemId` nella copia
- `includeItemInCatalogo` controlla duplicati prima di aggiungere
- `<select>` nativo per scegliere il catalogo di destinazione

---

## Fix PWA ristorante — home card Menu

**File:** `client/src/pages/guest/RestaurantApp.jsx` riga ~323

- `sub: \`${menuCount} piatti\`` → `sub: \`${menuCount} voci\`` (generico, non dipende dal tipo)
- Il count dettagliato per tipo appare già nell'header dell'accordion in Esplora

---

## Fix document.title su tutte le PWA

**Why:** Il tab del browser mostrava "OltreNova — Oltre il solito sito." (da index.html) invece del nome dell'entità.

**How to apply:** Ogni PWA imposta `document.title` non appena arrivano i dati. Il nome si configura da admin → Informazioni.

```js
useEffect(() => {
  if (!entity) return
  document.title = entity.name
  return () => { document.title = 'OltreNova — Oltre il solito sito.' }
}, [entity?.name])
```

Applicato a:
- `GuestApp.jsx` — `property.name`
- `RestaurantApp.jsx` — `ristorante.name`
- `AttivitaPWA.jsx` — `attivita.name`

---

## Fix "Scopri anche" — collegamento unidirezionale tra landing

**Why:** Cliccando il link ristorante dalla struttura PWA si arriva a `/r/${slug}` senza `?qr=1`. Se il ristorante ha minisito attivo, mostra `LandingRistorante` che non aveva la sezione "Scopri anche" → il link di ritorno non esisteva.

**How to apply:** La sezione "Scopri anche" deve stare in TUTTE le viste (PWA e landing), non solo nelle PWA. Le landing ricevono già `entity.collegamenti` dall'API.

**Fix:** Aggiunta sezione "Scopri anche" prima del `<footer>` in:
- `LandingRistorante.jsx` — usa `ristorante.collegamenti`
- `LandingStruttura.jsx` — usa `property.collegamenti`

Stessa logica delle PWA: `c.tipo === 'ristorante' ? /r/${c.slug} : /s/${c.slug}`
