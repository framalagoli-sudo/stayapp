---
name: project_session_2026_06_14d
description: "Session 2026-06-14d — BOM fix sistematico, ExternalLink AI Builder, maxDuration AI routes, icone PWA Next.js"
metadata:
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## BOM fix sistematico — COMPLETO ✅

Vercel inietta U+FEFF in env var. Applicate protezioni `.trim()` su TUTTE le var critiche in tutta la codebase.

**Var protette:** `RESEND_API_KEY`, `RESEND_FROM`, `ANTHROPIC_API_KEY`, `CLIENT_URL`, `APP_URL`, `ABSTRACT_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY/WEBHOOK_SECRET`

**File corretti (sessione):**
- `app/api/form-builder/public/[token]/submit/route.js`
- `app/api/guest/recensione/[token]/route.js`
- `app/api/guest/sitemap/[tipo]/[slug]/route.js`
- `app/api/newsletter/[id]/test/route.js`
- `app/api/shop/public/[azienda_id]/ordine/route.js`
- `app/api/users/[id]/resend-invite/route.js`
- `lib/automazioni-scheduler.js`
- + `lib/ai-helpers.js`, `lib/newsletter-send.js`, `app/api/guest/book/route.js` (sessioni precedenti)

## Fix AI Site Builder

- **ExternalLink non importato** → crash schermata "Sito creato!" — aggiunto a import lucide-react in `AiSiteBuilderPage.jsx`
- **maxDuration = 60** aggiunto a tutte e 7 le route AI: `generate-site`, `content-studio/caption`, `content-studio/piano`, `content-studio/strategia`, `ai/blog-auto`, `ai/genera`, `ai/social-post`
- **form_builder invece di contatti** in tutti i prompt e OBIETTIVO_CONFIGS (sessione precedente)

## Icone PWA migrate Vite → Next.js ✅

Mancavano in `client-next/public/icons/`. Copiate da `client/public/icons/`:
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.svg`
- `manifest.json` aggiornato con apple-touch-icon

## Form Builder (sessione precedente — recap)
- Template picker modal (5 template con icone Lucide flat)
- Filtro azienda per super_admin
- Feedback "Salvato ✓" dopo save
- `newsletter_optin` toggle: chi compila con GDPR consent → `iscritto_newsletter: true`

## Newsletter tag_filter (sessione precedente — recap)
- Campo `tag_filter: text[]` sulla newsletter
- `lib/newsletter-send.js` usa `.overlaps('tags', nl.tag_filter)` per filtrare destinatari

## Smoke test: 37/37 ✅ (3 deploy in questa sessione)

## Stato infrastruttura confermato
- Vercel Pro ✅ (confermato da Francesco)
- Railway freezato ✅
- Resend bounce webhook configurato ✅
- NEXT_PUBLIC_API_URL="" su Vercel ✅
