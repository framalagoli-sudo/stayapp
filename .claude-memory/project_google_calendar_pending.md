---
name: project-google-calendar-pending
description: "Stato OltreNova post-lancio — cosa è fatto e pendente (aggiornato 2026-06-14)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## Stack attuale — tutto su Vercel + Supabase (2026-06-14)

- oltrenova.com → Vercel (Next.js) ✅
- Railway → freezato ✅
- Vercel Pro ✅
- Smoke test 37/37 ✅

## Completato

- Rename StayApp → OltreNova ✅
- DNS Cloudflare ✅
- Supabase Site URL + Redirect URLs ✅
- Resend dominio verificato → noreply@oltrenova.com ✅
- **Resend bounce webhook** → configurato su resend.com ✅
- SPA routing Next.js ✅
- SW stale fix (deregistra vecchio service worker) ✅
- MFA fix (3 bug) ✅
- SSR fix window.* ✅
- QR code fix (guestFetch) ✅
- Reset password end-to-end ✅
- CI/CD smoke test 37 pagine automatico ✅
- PWA icons migrati in Next.js (icon-192, icon-512, apple-touch-icon, favicon.svg) ✅ 2026-06-14
- BOM fix sistematico tutte le env var ✅ 2026-06-14
- AI Site Builder: ExternalLink fix, maxDuration=60, form_builder ✅ 2026-06-14
- Form Builder: template picker, filtro azienda, newsletter_optin ✅ 2026-06-14
- Newsletter: tag_filter segmentazione ✅ 2026-06-14
- CRM: upsert contatti da booking PWA ✅ 2026-06-14

## Azioni manuali — STATO VERIFICATO a freddo il 17/7

### ✅ RISOLTE / non più rilevanti
- **og-image.png** ✅ presente (`client-next/public/og-image.png`, dal 18/6).
- **Sentry** — ✅ **RIMOSSO del tutto il 23/7** (`@sentry/nextjs` + 4 file config + wiring in next.config.js): era installato ma inerte (mai inizializzato su Next 14), causava 3 vuln Dependabot e pesava sul bundle. Monitoring resta IN-CASA (lib/observability.js: Vercel logs + alert Resend). `SENTRY_DSN` su Vercel è ora una env var orfana (innocua). Ri-aggiungerlo se/quando Next 15/16 = `npm install` + wizard. Vedi [[project_session_2026_07_23]].
- **DEMO_NOTIFY_EMAIL** ✅ su Vercel → gli alert del monitoring in-casa hanno un destinatario e FUNZIONANO.

### ⚠️ ANCORA PENDENTI (verificate 17/7)
- **Google Calendar** ⚠️ CONFERMATO pendente: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` NON presenti su Vercel. Codice = stub. Priorità bassa.
- **fondaconarni.com apex** ⚠️ CONFERMATO + DECISO DI SISTEMARE (è un cliente specifico): `www.fondaconarni.com` → HTTP 200 (ok), ma apex `fondaconarni.com` → HTTP 000. Manca record apex (A `@ → 76.76.21.21` o redirect apex→www). Azione DNS sul pannello dove sta il dominio (SiteGround o Cloudflare — da chiarire con Francesco dove gestisce il DNS di QUEL dominio). Non è codice. Bassa priorità ma reale (cliente).

### ✅ DECISE / chiuse (17/7)
- **GitHub → Vercel auto-deploy**: DECISO di NON farlo. Deploy resta MANUALE via `deploy.ps1` di proposito → così gira sempre lo smoke test integrato (valore, non limite). Tolto dai pending.
- **Cloudflare Bot Fight Mode** ✅ ON (confermato da Francesco 17/7). Deciso: NON toccare il resto del pannello Cloudflare (rischio di rompere il sito per guadagno nullo; regola YAGNI). WAF managed = Pro, non ora.
- **SSL/TLS Cloudflare** ✅ portato da "Full" a **"Full (strict)"** il 17/7 (Francesco). Verificato live che NON ha rotto nulla: oltrenova.com 308→www, www.oltrenova.com 200, www.fondaconarni.com 200, nessun errore SSL. Setup Vercel regge Full(strict). Piccolo hardening anti-MITM CF↔origin.

**How to apply:** Citare solo queste azioni quando Francesco chiede cosa resta da fare manualmente.
