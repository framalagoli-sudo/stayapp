---
name: project_session_2026_06_12
description: "PWA installability — InstallButton fisso nel header + InstallBanner fix iOS Chrome, smoke 37/37"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Implementata PWA installability completa con opzione B+C scelta dall'utente.

**Opzione B** — iOS Chrome escluso dal banner (`InstallBanner.js` e `InstallButton.js`: `getPlatform()` restituisce `null` per `isIOSChrome`). Motivazione: `navigator.share()` non apre Safari automaticamente, UX confusa.

**Opzione C** — `InstallButton.js` (nuovo componente) aggiunto nel `AppHeader` di tutte e tre le PWA (GuestApp, RestaurantApp, AttivitaPWA). Icona cerchio semitrasparente `top:10, right:10` nel header, visibile sempre (non dismissable). Comportamento per piattaforma:
- Android Chrome → `beforeinstallprompt` → dialogo nativo
- iOS Safari → modal a 3 step (Condividi → Aggiungi → Conferma)
- iOS Chrome → nascosto
- Già installata (standalone) → nascosto

**File modificati:**
- `client-next/components/guest/InstallButton.js` (NEW)
- `client-next/components/guest/InstallBanner.js` — rimosso caso `ios-chrome`
- `client-next/components/guest/GuestApp.jsx` — aggiunto `<InstallButton>` in AppHeader
- `client-next/components/guest/RestaurantApp.jsx` — aggiunto `<InstallButton>` in AppHeader
- `client-next/components/guest/AttivitaPWA.jsx` — aggiunto `<InstallButton>` in AppHeader

**Smoke test:** 37/37 ✅
**Deploy:** oltrenova.com ✅

**Why:** deploy.ps1 già include git push come primo step (vedi [[feedback_deploy]]).

**Pending:** 
- test manuale su iOS Safari reale (utente ha Chrome iOS)
- `/icons/icon-192.png` e `/icons/icon-512.png` non esistono ancora (fallback per entità senza logo nel manifest dinamico)
