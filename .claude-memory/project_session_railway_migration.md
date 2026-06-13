---
name: project-session-railway-migration
description: "Stato migrazione Railway → Vercel Next.js App Router — tutte le route portate, cron configurati"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Migrazione Railway → Vercel completata al 100% (route portate).

**Why:** Eliminare Railway ($5/mese + complessità) centralizzando tutto su Vercel Next.js.

**Stato corrente (2026-06-13):**

Tutti i route Express.js sono stati portati come Next.js App Router API routes (`export async function GET/POST/PATCH/DELETE(request, { params })`).

**File lib creati/aggiornati:**
- `client-next/lib/automazioni-scheduler.js` — `runAutomazioniScheduler()` (porta da `server/src/lib/automazioni.js`)
- `client-next/lib/blog-scheduler.js` — `calcNextRun` + `runBlogScheduler` (porta da `server/src/lib/blogScheduler.js`)
- `client-next/lib/newsletter-send.js` — `sendNewsletterById` + `runScheduledSends` (già esisteva)
- `client-next/lib/newsletter-html.js` — `buildNewsletterHtml` + `personalize` (già esisteva)
- `client-next/lib/guest-utils.js` — `triggerAutomazione` CORRETTA: usa `trigger_evento` (non `trigger`), stores `step_index`, `contact_email`, `contact_nome`, `vars` in automazioni_log
- `client-next/lib/newsletter-scheduler.js` — **DUPLICATO** di newsletter-send.js, NON importato da nessuna route (dead code, da eliminare)

**Cron routes create:**
- `client-next/app/api/cron/newsletter/route.js` → chiama `runScheduledSends` ogni 1 min
- `client-next/app/api/cron/automazioni/route.js` → chiama `runAutomazioniScheduler` ogni 1 min
- `client-next/app/api/cron/blog/route.js` → chiama `runBlogScheduler` ogni ora
- `client-next/app/api/cron/backup/route.js` → chiama `runBackup` alle 03:00 UTC
- Tutti protetti con `Authorization: Bearer ${CRON_SECRET}` (Vercel lo setta automaticamente)

**vercel.json aggiornato:**
```json
"crons": [
  { "path": "/api/cron/newsletter",  "schedule": "* * * * *" },
  { "path": "/api/cron/automazioni", "schedule": "* * * * *" },
  { "path": "/api/cron/blog",        "schedule": "0 * * * *" },
  { "path": "/api/cron/backup",      "schedule": "0 3 * * *" }
]
```

**Newsletter routes (tutte esistevano già):**
- `GET/POST /api/newsletter`
- `GET/PATCH/DELETE /api/newsletter/[id]`
- `POST /api/newsletter/[id]/send`
- `POST /api/newsletter/[id]/test`
- `POST /api/newsletter/[id]/duplicate`
- `GET /api/newsletter/archive/[entityTipo]/[entityId]`

**How to apply:** Migrazione completata al 2026-06-13:
1. ✅ Env vars aggiunte a Vercel
2. ✅ `NEXT_PUBLIC_API_URL=""` impostato → frontend chiama `/api/*` locale
3. ⬜ Rimuovere CNAME `api.oltrenova.com` da Cloudflare DNS
4. ⬜ Spegnere Railway
5. ⬜ Google Calendar, Stripe (non ancora configurati)

**Env vars mancanti (non ancora disponibili):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ABSTRACT_API_KEY`

**Env vars da aggiungere a Vercel:**
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `CLIENT_URL`, `DEMO_NOTIFY_EMAIL`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `STAYAPP_DOMAIN`, `ABSTRACT_API_KEY`, `RESEND_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `UNSPLASH_ACCESS_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
