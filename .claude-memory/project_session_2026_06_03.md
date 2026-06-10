---
name: project-session-2026-06-03
description: "Session 2026-06-03 — AI Site Builder v2, fix salvataggio menu, fix EntityLogo, PWA icons"
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Completato in questa sessione

### Fix RistoranteMenuPage — salvataggio girava a vuoto
- `menuRef` (useRef) tiene sempre lo stato aggiornato del menu
- Reset ottimistico: `setDirty(false)` prima di `await save()`, ripristino su errore
- `saveError` visualizzato in UI

### Fix EntityLogo (GuestApp + RestaurantApp)
- Componente `EntityLogo` con `useState` per errore immagine
- Mostra logo O emoji fallback, mai entrambi (PNG trasparente su sfondo bianco era invisibile)

### PWA icons
- `client/public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` creati
- `client/index.html` aggiornato con link rel

### AI Site Builder — Phase 2 (completo)
**Server (`server/src/routes/ai.js`):**
- `callClaude` con timeout 90s via AbortController
- Rate limit generate-site: 10/ora per userId (`genRateMap`)
- 6 `OBIETTIVO_CONFIGS`: lead_gen, vendita, vetrina, prenotazioni, portfolio, evento
- 3 `TEMPLATE_CONFIGS`: essential, complete, narrative
- Sanitizzazione input con `sanitizeStr` + `MAX_LENGTHS`
- Whitelist validation su mode/obiettivo/template → 400 su valori sconosciuti
- Safety caps: max 4 pagine, max 12 blocchi/pagina
- Timeout error handling: AbortError → messaggio specifico

**Client (`client/src/pages/admin/AiSiteBuilderPage.jsx`) — riscrittura completa:**
- Step 0: Obiettivo — 6 card 2×3 con emoji
- Step 1: Template — 3 card con MiniWireframe colorato (preview blocchi struttura)
- Step 2: Tipo (landing/sito) + Entità
- Step 3: Business — 8 preset settore (chip pre-compilano campi), nome, settore, descrizione
- Step 4: Contenuto (servizi, punti forza, CTA) + Stile (tono, target) + riepilogo
- `EntitySelector`: bug `useState(() => {}, [])` → `useEffect` corretto con cleanup
- `canNext` per ogni step blocca avanzamento senza dati obbligatori

## Deploy
- Commit `5ffec94` su main
- Railway riavviato automaticamente (server aggiornato)
- Vercel production deployato → `oltrenova.com` ✅

**Why:** Sprint 6 completato. AI Site Builder ora è uno strumento professionale con obiettivi ottimizzati, template wireframe visuali e preset di settore.
**How to apply:** AI Site Builder accessibile su /admin/ai-site-builder (solo super_admin). Richiede `ANTHROPIC_API_KEY` su Railway.
