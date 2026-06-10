---
name: project-session-2026-06-09b
description: "Fix CI users stale su Supabase — pre-cleanup in globalSetup, teardown robusto, 21 utenti eliminati"
metadata: 
  node_type: memory
  type: project
  originSessionId: 814df534-7fb3-41f8-b657-a325f7b1931d
---

## Fix utenti CI stale su Supabase (2026-06-09) ✅

### Problema
Gli utenti effimeri `ci-{timestamp}@playwright.internal` creati da ogni smoke test venivano lasciati su Supabase quando il processo Playwright veniva killato/crashava prima che `globalTeardown` girasse. Accumulati 21 utenti stale con ruolo `super_admin` — rischio sicurezza + apparivano nella lista utenti del piano editoriale.

### Fix 1 — Pre-cleanup in `global-setup.js`
All'inizio di ogni run, prima di creare il nuovo utente CI, vengono cercati e cancellati TUTTI gli utenti `@playwright.internal` rimasti da run precedenti. Self-healing automatico.

```js
// Passo 0 in globalSetup:
const { data: allUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
const stale = (allUsers?.users || []).filter(u => u.email?.endsWith('@playwright.internal'))
for (const u of stale) {
  await admin.auth.admin.deleteUser(u.id).catch(() => {})
}
```

### Fix 2 — Teardown robusto in `global-teardown.js`
`ci-user.json` viene eliminato solo DOPO conferma Supabase. Se deleteUser fallisce, il file rimane → il pre-cleanup del run successivo lo può usare.

### Fix 3 — Script standalone `tests/cleanup-ci-users.js`
`node cleanup-ci-users.js` — pulizia manuale futura se serve.

### Pulizia immediata
21 utenti stale eliminati con `node cleanup-ci-users.js`.

### File modificati
- `tests/global-setup.js` — aggiunto passo 0 pre-cleanup
- `tests/global-teardown.js` — elimina file solo dopo deleteUser OK
- `tests/cleanup-ci-users.js` — nuovo script standalone

**Why:** Utenti super_admin fantasma in produzione = rischio sicurezza. Causa: globalTeardown non gira su crash/kill. Fix: pre-cleanup idempotente ad ogni setup.
**How to apply:** Se in futuro si vedono utenti `@playwright.internal` su Supabase, è lo stesso problema — già risolto automaticamente al prossimo run.
