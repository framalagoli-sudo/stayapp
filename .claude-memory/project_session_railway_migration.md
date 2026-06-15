---
name: project-session-railway-migration
description: "Migrazione Railway → Vercel COMPLETA ✅. Railway freezato. Tutto su Vercel + Supabase."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## Migrazione Railway → Vercel — COMPLETA ✅ (2026-06-14)

**Railway**: freezato da Francesco. Crediti preservati ma non paga più.
**Cloudflare**: CNAME `api.oltrenova.com` rimosso ✅
**Stack finale**: Vercel (Pro) + Supabase — zero Railway.

**Vercel env vars chiave:**
- `NEXT_PUBLIC_API_URL=""` — frontend chiama `/api/*` locale Next.js ✅
- `NEXT_INTERNAL_API_URL=https://www.oltrenova.com` — solo middleware Edge Runtime per `resolve-domain`

## Refactor SSR guest pages ✅

`lib/guest-data.js` — query dirette Supabase senza HTTP hop:
- `getStruttura(slug)`, `getRistorante(slug)`, `getAttivita(slug)`, `getArticolo(slug)`, `getPagina(...)`

Tutte le landing (`/s/`, `/r/`, `/a/`) e blog usano `guest-data.js`.

## Cron routes su Vercel ✅
- `/api/cron/newsletter` ogni 1 min
- `/api/cron/automazioni` ogni 1 min
- `/api/cron/blog` ogni ora
- `/api/cron/backup` alle 03:00 UTC

## Bounce webhook Resend ✅
Configurato da Francesco su resend.com → URL: `https://oltrenova.com/api/resend-webhook` → eventi `email.bounced` + `email.complained`.
Route: `app/api/resend-webhook/route.js` — verifica firma Svix (HMAC-SHA256).

## Niente più pending su Railway/migrazione
Tutto completato. Non citare Railway come pending in futuro.

**How to apply:** Qualsiasi nuova route va in `client-next/app/api/`. Non c'è più un server Express separato.
