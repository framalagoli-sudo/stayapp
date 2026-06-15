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

## Azioni manuali ancora pendenti

### Google Calendar ⚠️
`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` da aggiungere su **Vercel** env vars (non più Railway).
Redirect URI da aggiornare su Google Cloud Console: `https://oltrenova.com/api/google-calendar/callback`

### Sentry ⚠️
Codice già deployato (guarded by env var). Da fare:
1. Crea account sentry.io free
2. Crea 2 progetti: Next.js + Node (ma ora tutto su Next.js)
3. Aggiungi `SENTRY_DSN` su Vercel env vars
4. Redeploy

### Cloudflare Bot Fight Mode ⚠️
Dashboard CF → Security → Bots → ON (1 click, gratis, non fatto)

### og-image.png
Non ancora creata. Serve immagine 1200×630px per Open Graph condivisioni social.

### fondaconarni.com apex
Aggiungere A record `@ → 76.76.21.21` su SiteGround (non verificato se fatto)

### GitHub → Vercel auto-deploy
Non ancora collegato. Deploy manuale con `.\deploy.ps1` dalla root.

**How to apply:** Citare solo queste azioni quando Francesco chiede cosa resta da fare manualmente.
