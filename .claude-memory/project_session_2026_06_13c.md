---
name: project_session_2026_06_13c
description: "Form security stack completo — spam filter, flood alert, email validation, bounce webhook ✅ configurato"
metadata:
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Stack sicurezza completo per il form builder. Equivalente a Typeform/HubSpot.

## In produzione (attivo subito, zero config)

- **Spam filter**: keyword + script non-latini + 2+ URL → silent reject
- **Flood alert**: max 20 submit/10min per form → blocca + email admin
- **Bounce webhook**: `POST /api/resend-webhook` — verifica firma Svix (HMAC-SHA256), marca `email_non_valida=true`
- **Newsletter skip**: contatti con `email_non_valida=true` esclusi dall'invio
- **Autoresponder skip**: non manda email conferma se email non valida

**Route (Vercel Next.js):**
- `app/api/resend-webhook/route.js`
- `app/api/form-builder/public/[token]/submit/route.js`
- `lib/newsletter-send.js`

## Configurato esternamente ✅

- **Resend bounce webhook**: configurato su resend.com → `https://oltrenova.com/api/resend-webhook` → eventi `email.bounced` + `email.complained` ✅

## Da attivare (richiede chiavi esterne)

- **Cloudflare Bot Fight Mode**: dashboard CF → Security → Bots → ON (1 click, gratis)
- **Abstract API email validation**: `ABSTRACT_API_KEY` su Vercel env vars → attiva `isEmailDeliverable()`

## Migration eseguita
- `058_contatti_email_non_valida.sql` — `email_non_valida boolean DEFAULT false` su contatti ✅ 2026-06-13

## Costo stack
- Spam + flood + bounce webhook: €0
- Cloudflare Bot Fight Mode: €0
- Abstract API: €0 (free tier 100/mese)
