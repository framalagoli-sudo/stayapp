---
name: project_session_2026_06_14
description: "Form Builder security portata su Vercel — Sprint A-D completi, route pubbliche create, route morte rimosse"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## Cosa è stato fatto

### Portate su Next.js le due route pubbliche Form Builder mancanti
- `GET /api/form-builder/public/[token]/route.js` — carica form per rendering pubblico
- `POST /api/form-builder/public/[token]/submit/route.js` — pipeline 12-step completa

Prima di questa sessione i form pubblici erano completamente non funzionanti in produzione (404 + 404).

### Rimosse route morte
- `/api/public/form/route.js` (GET con ?token= — path sbagliato, nessuno la chiamava)
- `/api/public/form/[token]/submit/route.js` (pipeline parziale, path sbagliato)

### Status Sprint A-D: tutti completi su Next.js/Vercel

**Sprint A** (migration 055 ✅): honeypot, rate limit, sanitize, GDPR consenso, required fields server-side
**Sprint B** (migration 056 ✅): autoresponder, auto-tag CRM, webhook form_submit, email admin
**Sprint C** (migration 057 ✅): campi condizionali eq/neq/contains, form multi-step con progress bar
**Sprint D** (migration 058 ✅): spam filter, flood detection + alert email, email validation Abstract API, bounce webhook Svix

### Smoke test: 37/37 ✅ post-deploy

## Da fare prossima sessione

Vedere [[todo_prossima_sessione]] per lista completa.

**Why:** La migrazione Railway→Vercel è completa. Railway non serve più — va spento.
**How to apply:** Considerare Railway shutdown come priorità alta per risparmiare $5/mese.
