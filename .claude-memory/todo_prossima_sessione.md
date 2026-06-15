---
name: todo_prossima_sessione
description: Lista to-do per la prossima sessione — priorità ordinate
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## To-Do — stato aggiornato 2026-06-15

### ✅ FATTO
- **Railway spento/freezato** — dead code `newsletter-scheduler.js` eliminato, CNAME `api.oltrenova.com` rimosso da Cloudflare (15/6)
- **Resend bounce webhook** attivo — bounce/complained → `email_non_valida=true`
- **Test Form Builder end-to-end** — trovati e fixati: env Resend vuote su Vercel, bug `.catch()` Postgrest 500, config form senza campo email; UX consensi GDPR rifatta. Vedi [[project_session_2026_06_15b_formbuilder]]
- **Cloudflare Bot Fight Mode** attivato (15/6)

### ⏳ TODO — sviluppo
- **Debug sezione per sezione del pannello admin** ← IN CORSO, si parte dal **SITO WEB** (priorità di Francesco)
  - Sito web (minisito/pagine CMS) per Struttura / Ristorante / Attività
  - poi: Info, Galleria, Menu, Tema, Chatbot, Domini
  - Globali: Analytics, Newsletter, Booking, Contatti, Form Builder, Blog, Piano Editoriale, Staff
- **Stripe Sprint 10 (billing SaaS)** — piani Free/Starter/Pro, checkout, webhook stripe, upgrade/downgrade. Sprint futuro grosso.

### ⏳ TODO — azioni manuali (quando pronto)
- **Google Calendar** — configurare `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` su Vercel; codice backend scritto lato Railway, va portato su Next.js. Vedi [[project_google_calendar_pending]]

### ❌ SCARTATO
- **Abstract API email validation** — limite free 100/mese troppo basso, non vale la pena (15/6)
