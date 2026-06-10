---
name: project-google-calendar-pending
description: Stato lancio OltreNova (oltrenova.com) — cosa è fatto e cosa rimane
metadata: 
  node_type: memory
  type: project
  originSessionId: cec93190-01ca-4d21-8dee-f2fbb856e166
---

## Completato in sessione 2026-05-22

- Rename StayApp → OltreNova in 42 file ✅
- DNS Cloudflare (CNAME @ e www proxy OFF, api proxy ON) ✅
- Vercel custom domain oltrenova.com ✅
- Railway env vars (CLIENT_URL, STAYAPP_DOMAIN, RESEND_FROM) ✅
- Supabase Site URL + Redirect URLs aggiornati ✅
- Resend dominio verificato — email partono da noreply@oltrenova.com ✅
- Landing page OltreNova — nuovo design palette petrolio/ambra/oro/beige ✅
- Pannello /admin/seo-geo con Meta SEO, llms.txt, Robots AI bot, JSON-LD ✅
- Migration 042_landing_seo eseguita su Supabase ✅
- /llms.txt e /robots.txt serviti dinamicamente da Supabase via Vercel functions ✅

**Why:** Lancio oltrenova.com completato. SEO e GEO ora gestibili dall'admin senza deploy.

## Ancora da fare (azioni manuali)

1. **Google Calendar** — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` su Railway (redirect URI: `https://api.oltrenova.com/api/google-calendar/callback`)
2. **og-image.png** — creare immagine 1200×630px → `client/public/og-image.png` → deploy
3. **Favicon PNG PWA** — creare `icon-192.png` (192×192) e `icon-512.png` (512×512) con sfondo `#0F7B6C` e testo "ON" bianco → `client/public/icons/` → deploy. Suggerimento: favicon.io → Text → "ON"

## Migrations eseguite su Supabase
- 039 Google Calendar ✅ (2026-05-27)
- 040 Loyalty ✅ (2026-05-27)
- 044 require_2fa ✅

## Migrations ancora da eseguire su Supabase ⚠️
— nessuna pendente al 2026-05-31

## Migrations eseguite (aggiornamento 2026-05-31)
- 045 idee_editoriali ✅
- 046 piano_editoriale_v2 ✅
- 047 piano_editoriale_autore ✅
- 054 ristoranti_modules ✅ — colonna modules aggiunta a ristoranti, bug Borgo del Lago risolto

## Migrations eseguite (aggiornamento 2026-05-28)
- 048 piano_editoriale_design_url ✅ (2026-05-28)

## Migrations eseguite (aggiornamento 2026-05-29)
- 052 pe_campagne ✅
- 053 pe_commenti ✅

## Feature completate (sessione 2026-05-28)
- vercel.json SPA routing fix ✅
- favicon.svg OltreNova ✅
- Firma autore piano editoriale (server + UI) ✅
- "Reinvia invito" collaboratori ✅
- CLIENT_URL → https://www.oltrenova.com (Railway) ✅
- ResetPasswordPage: race condition fix + error hash detection ✅
- AcceptInvitePage: pagina intermedia anti-email-scanner ✅
- Git pushato, Railway aggiornato ✅

## Azioni manuali pendenti (Francesco)
- **Sentry** — codice già scritto e deployato (guarded by env var). Fare: (1) crea account sentry.io free, (2) crea 2 progetti: Node.js + React, (3) aggiungi `SENTRY_DSN` su Railway e `VITE_SENTRY_DSN` su Vercel env vars, (4) redeploy Vercel. Senza queste var l'app gira normalmente senza Sentry attivo.
- **Google Calendar** — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` su Railway ancora da configurare
- **ANTHROPIC_API_KEY** — necessaria su Railway per AI Site Builder (già in uso per altri endpoint AI)

## Feature completate (sessione 2026-06-03/04)
- AI Site Builder v2 — wizard 5 step, obiettivi, template wireframe, preset settore ✅
- AI Site Builder — icone Lucide flat (no emoji), attività in EntitySelector ✅
- Fix salvataggio menu ristorante (menuRef + reset ottimistico) ✅
- Fix EntityLogo PWA (fallback immagine) ✅
- PWA icons (icon-192, icon-512, apple-touch-icon) ✅
- Deploy commit 94383cc → oltrenova.com live ✅

## Feature completate (sessione 2026-06-04b)
- Fix critico QR code: guestFetch su tutte le 12 pagine guest ✅ (commit d095374)
- Causa: apiFetch → supabase.auth.getSession() bloccava caricamento iniziale se sessione admin scaduta nel browser

## Migrazione Next.js (sessione 2026-06-06/07) ⭐
- `client-next/` deployata su `https://oltrenova-next.vercel.app` ✅
- MFA fix completo (3 bug: bypass guard, router crash, AdminLayout) ✅
- SSR fix window.* (6 file: LandingRistorante, LandingStruttura, LandingBlockRenderer, PaginaPage, ArticoloPage, PolicyPage) ✅
- Fix 500 su `/r/fondaco-narni`: `openGraph.type: 'restaurant'` → `'website'` ✅ (commit c0b6cc4)
- smoke test 406: `.maybeSingle()` in AuthContext + auth middleware ✅

### Cutover oltrenova.com → Next.js ✅ COMPLETATO (2026-06-08)
- `oltrenova.com` ora punta a `oltrenova-next` Vercel project ✅
- `VERCEL_PROJECT_ID` su Railway aggiornato ✅
- Middleware domini custom funzionante ✅
- `NEXT_INTERNAL_API_URL` aggiunto su Vercel per bypass Cloudflare da edge ✅

### Stato post-cutover (aggiornato 2026-06-09b)
1. **Smoke test** ✅ — 37/37 verde, punta a oltrenova.com (Next.js)
2. **SW stale** ✅ — `public/sw.js` sostituito con script deregistrante (era la causa di deploy invisibili)
3. **Sito web unificato** ✅ — MiniSitoPage ora ha 4 tab: Pagine, Menu & Aspetto, Impostazioni, SEO & Social
4. **RistoranteMenuPage refactor** ✅ — collapse accordion, DnD a 3 livelli (catalogo/categoria/piatto), copia categoria, icone catalogo (25 icone Lucide)
5. **Footer responsive** ✅ — `repeat(auto-fit, minmax(200px, 1fr))` + `<style>` media query
6. **CI users stale fix** ✅ — 21 utenti `@playwright.internal` rimossi, pre-cleanup in globalSetup
7. **PWA** ⚠️ — next-pwa da riconfigurare (sw.js ora deregistra, PWA non funziona)
8. **`fondaconarni.com` apex** ⚠️ — aggiungere A record `@ → 76.76.21.21` su SiteGround
9. **api.oltrenova.com da edge** — workaround con `NEXT_INTERNAL_API_URL` già attivo ✅

## Feature pendenti (prossimi sprint)
- **Sprint 10** — Stripe billing (checkout booking + abbonamenti SaaS)
- **Sprint 11** — WhatsApp + Push notifications
- **Vercel Pro / Supabase Pro** — verificare upgrade ($20+$25/mese)
- **GitHub → Vercel auto-deploy** — collegare il repo per deploy automatici

**How to apply:** Ricordare a Francesco ogni volta che chiede cosa c'è da fare.
