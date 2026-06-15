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
- **🔒 Audit sicurezza multi-tenant COMPLETO** (15/6) — chiusi ~19 IDOR su collection + tutti i 31 route `[id]` verificati. Primitive riusabili in server-auth.js. Vedi [[project_session_2026_06_15c_security]] e [[feedback_multitenant_authz]]. Bug Sito web `navigate→router` fixato.

### ⏳ TODO — ricognizione a blocchi (tracker: `PIANO_LAVORO.md` nel repo!)
**Fonte di verità ora = `PIANO_LAVORO.md`** (root repo). 3 fasi: 0 sicurezza/bug → 1 funzionale → 2 sviluppi.
- ✅ **Sito web** (CMS pagine + editor blocchi + rendering): bug navigate→router, anteprima bozze, save error.
- 🟡 **Guest/PWA + Minisito** (blocco 1, IN CORSO): fatto GuestApp struttura + sicurezza chat `/api/messages` + convenzione guestFetch. **Da fare**: RestaurantApp, AttivitaApp/PWA, Landing varianti, pagine dettaglio guest (Evento/Offerta/Pacchetto/SubPage), PWA tecnica. Vedi dettaglio in PIANO_LAVORO.md.
- ⬜ Poi: Operativo → Entità → Marketing/CRM → Account/Piattaforma.
- **Stripe Sprint 10 (billing SaaS)** — Fase 2, sprint futuro grosso.

### ⏳ TODO — azioni manuali (quando pronto)
- **Google Calendar** — configurare `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` su Vercel; codice backend scritto lato Railway, va portato su Next.js. Vedi [[project_google_calendar_pending]]

### ❌ SCARTATO
- **Abstract API email validation** — limite free 100/mese troppo basso, non vale la pena (15/6)
