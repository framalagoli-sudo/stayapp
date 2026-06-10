---
name: project-session-2026-06-08b
description: "Fix SW stale → deploy invisibili risolto. PaginaEditorPage fix. Sito web unificato (4 tab) per struttura, ristorante e attività"
metadata: 
  node_type: memory
  type: project
  originSessionId: 814df534-7fb3-41f8-b657-a325f7b1931d
---

## Fix service worker stale → deploy invisibili ✅

**Bug:** dopo un deploy le modifiche non erano visibili (utente vedeva vecchio codice).
**Root cause:** `client-next/public/sw.js` era un file STATICO leftover da quando next-pwa era configurato (poi rimosso). Conteneva `precacheAndRoute([...])` con hash JS hardcodati di una build vecchia (revision `pljCHtuMOQrPHOLHRVv4d`). Il browser installava questo SW che serviva vecchie versioni JS dalla cache — in particolare il chunk di AdminLayout.
**Why versioni precedenti funzionavano:** le modifiche erano su componenti il cui chunk JS non era in quel precache; questa modifica toccava AdminLayout che ERA in precache.
**Fix:** sostituito `public/sw.js` con script minimale che si auto-deregistra:
```js
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.registration.unregister()))
})
```
**How to apply:** Se in futuro i deploy non si vedono, controllare se esiste un `public/sw.js` stale o un service worker attivo con precache hardcodato.

## PaginaEditorPage fix ✅

Fix "Modifica" non funzionava (stuck su loading / no-op su errore):
- `apiFetch` THROWS su `!res.ok` (non restituisce `{error}` objects) → aggiunti `.catch()` con stato `loadError`
- `router.push(-1)` → `router.back()` (in Next.js App Router, push(-1) naviga all'URL letterale "-1")
- `save()` senza try/catch → `setSaving(false)` mai chiamato su errore → aggiunto try/catch/finally

**How to apply:** `apiFetch` lancia sempre eccezioni su errori HTTP — non controllare mai `data?.error` nei `.then()`, usare sempre `.catch()`.

## Unificazione Sito web ✅ (struttura, ristorante, attività)

Prima: due voci sidebar "Sito web" (`/minisito`) e "Pagine CMS" (`/sito`) con UI diverse.
Dopo: unica voce "Sito web" → `/minisito` con 4 tab unificati.

### Struttura nuovi tab (MiniSitoPage.jsx):

| Tab | Contenuto |
|---|---|
| **Pagine** | Gestione pagine CMS (crea, modifica, duplica, elimina, pubblica/bozza, menu). Card homepage a blocchi sempre in cima. |
| **Menu & Aspetto** | Ordinamento menu navigazione (drag & drop, sottopagine, aggiungi/rimuovi). Header (stile, sempre visibile). Footer (colori, sezioni, link extra). |
| **Impostazioni** | Link prenotazione esterno, toggle "Mostra App ospiti", favicon. |
| **SEO & Social** | SEO title/description, Google Search Console, social links, tracking (Meta Pixel, GA4, GTM, TikTok), GEO card. |

### File modificati:
- `client-next/components/admin/MiniSitoPage.jsx` — aggiunto state pagine, operazioni CRUD, renderMenuRow, NewPageModal, makeTemplateBlocks; TABS aggiornati
- `client-next/components/admin/AdminLayout.jsx` — rimosso `{ sub: 'sito', label: 'Pagine CMS' }` da NAV_PROPERTY, STRUTTURA_SUBS, RISTORANTE_SUBS, ATTIVITA_SUBS

### Route `/sito` (SitoPage) ancora esiste ma non è più linkata dalla sidebar. Accessibile via URL diretto se necessario.

## Smoke test

37/37 verde dopo tutti i deploy di questa sessione. La voce "Pagine CMS" non è più in sidebar ma lo smoke test verifica "Sito web" → `/minisito` per tutte e tre le entità.

## Stato pendenti

- **`fondaconarni.com` apex** — A record `@ → 76.76.21.21` su SiteGround ancora da aggiungere
- **PWA** — next-pwa da riconfigurare (sw.js ora deregistra, PWA non funziona finché non riconfigurata)
- **Google Calendar** — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` su Railway
- **Supabase Pro + Vercel Pro** — upgrade manuale $45/mese
- **Stripe** — Sprint 10
