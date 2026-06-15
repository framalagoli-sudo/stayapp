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

### ✅ FASE 0 COMPLETA — sicurezza + data-write su TUTTI e 6 i blocchi (tracker: `PIANO_LAVORO.md`)
- Sicurezza multi-tenant blindata: IDOR su tutta l'API (collection + 31 route [id]); 2FA + permessi staff enforced server-side in `requireAuth` (verificati live).
- Perdita dati cacciata ovunque: fixati form contatto guest (lead persi), overbooking eventi (+backfill), manifest PWA start_url, route sync-subdomains 404. Altri contratti data-write tutti allineati (Sito web, Form Builder, Guest, Marketing 9 moduli, Entità/Menu, Operativo).
- **PWA attività CABLATA** (palestre/corsi): /a/[slug] QR→AttivitaPWA. Menu editor solido + guard modifiche-non-salvate.
- Primitive in server-auth.js: requireEntityAccess, requireRecordAccess, resolveAziendaId, userCanAccessProperty, hasPermission, enforceMfa/enforcePermission.

### ⏳ PROSSIMO — FASE 1 (deep funzionale UI/edge-case per modulo)
La Fase 0 ha coperto sicurezza + data-write. Resta il deep-review UI/edge-case (flussi completi, validazioni, stati limite) dove serve. Miglioria trasversale: estendere guard "modifiche non salvate" (beforeunload) ad altri editor (es. PaginaEditorPage).
- **Stripe Sprint 10 (billing SaaS)** — Fase 2, sprint futuro grosso.

### ⏳ TODO — azioni manuali (quando pronto)
- **Google Calendar** — configurare `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` su Vercel; codice backend scritto lato Railway, va portato su Next.js. Vedi [[project_google_calendar_pending]]

### ❌ SCARTATO
- **Abstract API email validation** — limite free 100/mese troppo basso, non vale la pena (15/6)
