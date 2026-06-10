---
name: project-session-2026-06-08
description: "Cutover oltrenova.com → oltrenova-next completato, fix middleware domini custom, fondaconarni.com ripristinato"
metadata: 
  node_type: memory
  type: project
  originSessionId: 814df534-7fb3-41f8-b657-a325f7b1931d
---

## Cutover dominio oltrenova.com → oltrenova-next ✅ COMPLETATO

Francesco ha eseguito manualmente stamattina:
- `VERCEL_PROJECT_ID` su Railway aggiornato a `prj_RHAKm3p6UEXzVFm69mo7BvVO42u1` (oltrenova-next)
- Domini spostati da progetto stayapp a oltrenova-next su Vercel

**VERCEL_TOKEN su Railway NON è stato cambiato** — non serve cambiarlo, i token Vercel sono account-wide.

## Fix post-cutover eseguiti (questa sessione)

### 1. QR code mostravano `oltrenova-next.vercel.app`
- **Causa:** alias `*.oltrenova.com` non era ancora sul progetto oltrenova-next
- **Fix:** `npx vercel domains add *.oltrenova.com` → aggiunto a oltrenova-next ✅

### 2. `fondaconarni.com` → DEPLOYMENT_NOT_FOUND
- **Causa:** dominio rimosso da stayapp ma non aggiunto a oltrenova-next
- **Fix:** `npx vercel domains add fondaconarni.com` e `npx vercel domains add www.fondaconarni.com` ✅

### 3. `www.fondaconarni.com` → mostrava homepage OltreNova invece del ristorante
- **Causa:** middleware Next.js chiama `api.oltrenova.com` (via Cloudflare) — Vercel's edge runtime non riesce a raggiungere l'endpoint (bloccato o routing errato da edge verso Cloudflare)
- **Fix:** aggiunto env var `NEXT_INTERNAL_API_URL=https://stayapp-production.up.railway.app` su Vercel production, aggiornato `middleware.js` per usarlo con fallback:
  ```js
  const API_BASE = process.env.NEXT_INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  ```
- **Deploy:** build verde, 67 pagine, middleware 25.3kB ✅

### 4. `fondaconarni.com` senza www → NXDOMAIN ⚠️ PENDENTE
- **Causa:** SiteGround non ha mai avuto un record A esplicito per l'apex (era gestito implicitamente dall'hosting SiteGround quando attivo)
- **Fix necessario:** aggiungere su SiteGround DNS Zone Editor: `A @ 76.76.21.21`
- Il `www` funziona già (CNAME su SiteGround punta a `cname.vercel-dns.com`)

## Stato infrastruttura attuale

| Dominio | Stato | Note |
|---|---|---|
| `oltrenova.com` | ✅ | Vercel oltrenova-next |
| `www.oltrenova.com` | ✅ | Vercel oltrenova-next |
| `*.oltrenova.com` | ✅ | Wildcard su oltrenova-next |
| `www.fondaconarni.com` | ✅ | CNAME SiteGround → Vercel, middleware risolve |
| `fondaconarni.com` | ⚠️ | Nessun record A su SiteGround |
| `api.oltrenova.com` | ⚠️ | Funziona da browser ma NON da Vercel edge runtime |

## Architettura API dopo il fix

- **Client browser (admin):** usa `NEXT_PUBLIC_API_URL` → `api.oltrenova.com` → Cloudflare → Railway
- **Middleware Next.js (server-side edge):** usa `NEXT_INTERNAL_API_URL` → Railway diretto (`stayapp-production.up.railway.app`)
- **Why separati:** Cloudflare blocca/filtra richieste server-to-server da Vercel edge

## Backend Railway

- URL diretto: `https://stayapp-production.up.railway.app`
- Health check: `{"status":"ok","v":"fix-enrichlinks-attivita"}`
- Funziona correttamente

## Fix hero flash (questa sessione — 2026-06-08) ✅

**Bug:** minisiti (struttura/ristorante/attività) mostravano flash della hero default prima che la hero a blocchi caricasse.
**Causa:** `homeBlocks` partiva come `null` → default hero → fetch async → block renderer (flash visibile)
**Fix:** fetch `__home__` blocks lato server nei page.js SSR, passati come `initialHomeBlocks` prop ai componenti client. I componenti partono già con lo stato corretto — nessun flash.

File modificati:
- `client-next/app/s/[slug]/page.js` — fetch SSR `__home__` per struttura
- `client-next/app/r/[slug]/page.js` — fetch SSR `__home__` per ristorante  
- `client-next/app/a/[slug]/page.js` — fetch SSR `__home__` per attività
- `client-next/components/guest/LandingStruttura.jsx` — accetta `initialHomeBlocks`, tri-state (`undefined`=loading, `null`=no blocks, `Array`=render BlockRenderer)
- `client-next/components/guest/LandingRistorante.jsx` — stesso pattern
- `client-next/components/guest/LandingAttivita.jsx` — stesso pattern

**Deploy:** `cd client-next && npx vercel --prod --yes` → build verde ✅

## Deploy command corretto (IMPORTANTE)

Il deploy Next.js va eseguito da `client-next/`:
```bash
cd client-next && npx vercel --prod --yes
```
**NON** dalla root del repo (quella deploya il vecchio Vite `stayapp`).

## Pendenti dalla migrazione Next.js

1. **`fondaconarni.com` apex** — aggiungere A record su SiteGround (1 minuto)
2. **Smoke test** — già aggiornati (37/37 verde) nella sessione precedente
3. **PWA** — next-pwa rimossa durante migrazione, da riconfigurare
4. **api.oltrenova.com** — verificare perché non funziona da Vercel edge (Cloudflare WAF?)
