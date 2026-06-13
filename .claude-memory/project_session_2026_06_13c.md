---
name: project_session_2026_06_13c
description: "Form security stack completo — spam filter, flood alert, email validation, bounce webhook, migration 058"
metadata:
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Implementato stack di sicurezza completo per il form builder. Equivalente a Typeform/HubSpot.

## Cosa è in produzione

### Attivo subito (zero config)
- **Spam filter**: keyword (viagra/crypto/casino/ecc) + script non-latini (cirillico/cinese/arabo) + 2+ URL in testo → silent reject
- **Flood alert**: max 20 submit/10min per form → blocca + email automatica all'admin del form
- **Bounce webhook**: `POST /api/resend-webhook` — verifica firma Svix (HMAC-SHA256), marca `email_non_valida=true` su `email.bounced`/`email.complained`
- **Newsletter skip**: `.not('email_non_valida','is',true)` nella query invio newsletter
- **Autoresponder skip**: `!emailNonValida` nel check step 11 form_builder.js

### Da attivare con chiavi esterne
- **Cloudflare Bot Fight Mode**: dashboard CF → Security → Bots → ON (1 click, gratis)
- **Cloudflare Turnstile**: serve Site Key + Secret Key → variabili `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Vercel) + `TURNSTILE_SECRET_KEY` (Railway) → widget invisibile su tutti i form
- **Abstract API email validation**: serve API Key → `ABSTRACT_API_KEY` su Railway → attiva `isEmailDeliverable()` in form_builder.js
- **Resend bounce webhook**: configurare su resend.com → eventi `email.bounced`+`email.complained` → URL `https://api.oltrenova.com/api/resend-webhook` → `RESEND_WEBHOOK_SECRET` su Railway

## Migration
- `058_contatti_email_non_valida.sql` — `email_non_valida boolean DEFAULT false` su contatti ✅ eseguita 2026-06-13
- File: `server/src/routes/resend_webhook.js` (nuovo)
- File: `server/src/routes/form_builder.js` (spam/flood/email val)
- File: `server/src/routes/newsletter.js` (skip non valide)
- File: `server/src/index.js` (raw body + route)

**Smoke test: 37/37 ✅** 2026-06-13, deploy commit da19951

## Costo stack completo
- Spam filter + flood + bounce webhook: €0
- Cloudflare Bot Fight Mode + Turnstile: €0
- Abstract API: €0 (free tier 100/mese) → €15/mese se volume alto
- Cloudflare Pro (WAF avanzato, quando scala): €20/mese
