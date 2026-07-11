---
name: reference_security_audit
description: "Sistema di sicurezza continuo (deciso) — SECURITY.md §0 autorevole, 4 strati, workflow audit"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

**File FONDAMENTALE**: `SECURITY.md` §0 (nel repo, versionato) = invarianti + checklist + strati. È l'autorità sulle procedure rigide di sicurezza del codice. Leggerlo prima di toccare route API/auth/esposizione dati. (Le §2 di SECURITY.md sono Express/Railway obsolete — ignorare; le §3-8 GDPR valide.)

**Strato 0 — dipendenze (11/7)**: `.github/dependabot.yml` (PR auto aggiornamenti npm client-next/server/tests + github-actions, minor/patch raggruppati) + `npm audit --audit-level=high` in `deploy.ps1` (informativo). ⚠️ AZIONE MANUALE FRANCESCO: attivare su GitHub → Settings → Code security → **Dependabot alerts** + **Dependabot security updates** (gratis private repo) + **secret scanning/push protection** (gratis public; private = GHAS a pagamento → alternativa gitleaks in CI). Impegno reale: mergiare le PR Dependabot + aggiornare Next su patch di sicurezza. `gh` NON è installato sulla macchina (toggle da UI).

**Sistema a strati (deciso 11/7)** per "monitorare sempre la sicurezza senza sprechi di token:**
- **Strato 1** — test deterministici in `tests/smoke/security.spec.js` (0 token, ogni `deploy.ps1`). Un test per invariante. **Regola d'oro: ogni buco chiuso diventa un test qui.**
- **Strato 2** — convenzione shift-left: SECURITY.md §0 + [[feedback_multitenant_authz]] + [[feedback_sicurezza_priorita]].
- **Strato 3** — review AI **sul diff**, on-demand, quando si tocca il sensibile (non tutto il codebase).
- **Strato 4** — audit profondo col **workflow `security-audit`**, raro (prima di release importanti).

**Workflow audit** (Strato 4): scout inline della superficie (mappa route/guest/injection) → workflow `security-audit` = 4 dimensioni in parallelo (authz multi-tenant/IDOR, esposizione pubblica, injection, secret/ruoli) con **verifica avversariale** per-finding (ogni finding viene provato a smontare prima di confermarlo). I confermati → fix + test Strato 1. Script salvato in `<session>/workflows/scripts/security-audit-*.js` (riutilizzabile/adattabile).

**Gli 8+ invarianti** (dettaglio in SECURITY.md §0): isolamento multi-tenant, auth su tutto non-pubblico, resolveAziendaId, zero leak campi sensibili, input validato nei filtri PostgREST, safeUrl/DOMPurify, rate-limit pubblici, cron/webhook con secret, secret solo server-side, RLS 2° muro (backlog).

**Primo audit profondo (11/7, pre-mercato) — ESITO**: 18 finding, **18 confermati** (verifica avversariale, 0 falsi positivi). Erano nei moduli aggiunti DOPO l'audit authz principale (newsletter-azioni, loyalty, shop, chat, calendar), non coperti dai guard esistenti. **16 fix live** (commit 9b1932a):
- IDOR newsletter send/test/duplicate → scoping azienda (404 cross-tenant). L'exploit era di un **admin_azienda** (permessi pieni); lo staff era già bloccato da `enforcePermission` — lezione: testare l'IDOR con admin_azienda, non staff.
- aziende PATCH: `piano/moduli/active` riservati a super_admin (bypass billing).
- guest/chat, loyalty gift-card/saldo, public/register, booking/prenota, shop/ordine → **rate-limit** (`lib/rate-limit.js`).
- google-calendar callback: `state` OAuth firmato HMAC (anti-CSRF).
- XSS stored: `siteHref` + `privacy_url` consenso ora passano da `safeUrl` (LandingBlockRenderer + FormPublicPage); safeUrl estesa a mailto/tel.
- contatti/collegamenti: sanitizzazione input filtri `.or()`; cron fail-closed.
- **+3 test** in security.spec.js (IDOR newsletter, escalation billing, rate-limit register), verificati 12/12.

**Backlog residuo** (non critici): google-calendar sync è stub no-op nel path Next (CSRF fixato comunque); loyalty saldo resta un oracolo di enumerazione (mitigato da rate-limit); RLS 2° muro; valutare rate-limit anche su altri endpoint pubblici minori. **Nota test**: la suite security ri-eseguita >4 volte/ora fa flakare il test contatti (rate-limit guest-contact 5/h); in cadenza normale (1 run/deploy) è verde.
