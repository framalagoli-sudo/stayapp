---
name: project_session_2026_06_13
description: "Sprint A form security — rate limit, honeypot, sanitize, consenso GDPR, migration 055, smoke 37/37"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Implementato Sprint A completo sul sistema Form Builder.

**Motivazione:** form submit era completamente aperto — nessun rate limit, nessuna sanitizzazione, nessun consenso GDPR, XSS possibile nelle email admin.

**File modificati:**
- `server/src/routes/form_builder.js` — rate limit + honeypot + sanitize + escape HTML email + consenso + verifica attivo server-side + validazione email regex
- `client-next/components/admin/FormBuilderEditorPage.jsx` — tipo 'consenso' con privacy_url, badge "Sempre obbligatorio — GDPR"
- `client-next/components/public/FormPublicPage.jsx` — honeypot + render consenso con link privacy
- `client-next/components/LandingBlockRenderer.jsx` (FormBuilderBlock) — honeypot + render consenso
- `supabase/migrations/055_form_security.sql` — colonne consenso_dato, consenso_privacy_url, ip su form_submissions

**Dettagli sicurezza:**
- Honeypot: campo `_hp` nascosto via CSS (non display:none, i bot lo saltano). Risposta silenziosa {ok:true} al bot per non rivelare il blocco
- Rate limit: Map in-memory `token:ip` → max 5/ora, cleanup ogni 10min
- Sanitizzazione: whitelist chiavi UUID noti + strip HTML + max 10k char + email regex
- HTML escape email: tutti i valori escaped prima di entrare nel template HTML

**Migration 055 eseguita ✅** su Supabase Dashboard il 2026-06-13.

**Smoke test:** 37/37 ✅ — deploy oltrenova.com ✅

**Prossimo:** Sprint B — autoresponder email all'utente + auto-tagging da form + webhook al submit
