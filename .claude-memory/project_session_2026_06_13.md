---
name: project_session_2026_06_13
description: "Sprint A+B form security+automazioni — rate limit, honeypot, GDPR consent, autoresponder, auto-tag, webhook, migration 055+056, smoke 37/37"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Implementati Sprint A e Sprint B completi sul sistema Form Builder.

## Sprint A — Sicurezza + GDPR (migration 055)

**File modificati:**
- `server/src/routes/form_builder.js` — rate limit IP/form (5/ora), honeypot `_hp`, sanitize whitelist UUID, escape HTML email, consenso GDPR server-side, verifica attivo su submit
- `client-next/components/admin/FormBuilderEditorPage.jsx` — tipo 'consenso' con privacy_url, badge "Sempre obbligatorio — GDPR"
- `client-next/components/public/FormPublicPage.jsx` — honeypot + render consenso
- `client-next/components/LandingBlockRenderer.jsx` (FormBuilderBlock) — idem
- `supabase/migrations/055_form_security.sql` — `consenso_dato`, `consenso_privacy_url`, `ip` su form_submissions

**Migration 055 eseguita ✅** 2026-06-13

## Sprint B — Automazioni post-submit (migration 056)

**File modificati:**
- `server/src/routes/form_builder.js` — autoresponder email utente (`applyTemplate` + `buildAutoresponderHtml`), auto-tagging contatto CRM (merge dedup), webhook `form_submit` via `sendWebhooks`
- `client-next/components/admin/FormBuilderEditorPage.jsx` — sezione "Automazioni post-submit": toggle email conferma + oggetto/testo con variabili `{{nome}}` `{{form_nome}}`, pill editor tag auto
- `client-next/components/admin/IntegrazioniPage.jsx` — evento `form_submit` aggiunto alla lista webhook
- `supabase/migrations/056_form_automazioni.sql` — `email_conferma_attiva`, `email_conferma_oggetto`, `email_conferma_testo`, `tag_auto` su form_builder

**Migration 056 eseguita ✅** 2026-06-13

**Smoke test:** 37/37 ✅ entrambi i deploy — deploy oltrenova.com ✅

**Prossimo:** Sprint C — conditional fields, multi-step form, o altri moduli
