---
name: project-session-2026-06-05
description: "Session 2026-06-05 — Smoke test Playwright completato: utente CI effimero, hook auto post-deploy"
metadata: 
  node_type: memory
  type: project
  originSessionId: c96cc8bb-ed2c-4d97-a0b6-15b9e0417fe5
---

## Smoke test Playwright — architettura finale

**Stato:** funzionante ✅ — 36/36 test verdi su https://www.oltrenova.com

### Come funziona
- `tests/global-setup.js` — crea utente effimero `ci-{timestamp}@playwright.internal` via Supabase Admin API, lo promuove `super_admin`, fa sign-in con anon key per ottenere JWT, inietta il token direttamente in `.auth/state.json` come Playwright storageState. Nessun browser coinvolto nel login.
- `tests/global-teardown.js` — elimina l'utente Supabase al termine, anche in caso di test falliti.
- `tests/package.json` — ha `"type": "module"` (necessario per import.meta / ESM).
- `tests/.env.test` — presente localmente (gitignored), contiene `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

### Dettaglio chiave tecnica
- Supabase ha un trigger che auto-crea il profilo all'insert utente → usare `upsert` (non `insert`) con `onConflict: 'id'` per il profilo.
- Il CI user riceve `property_id` della prima property disponibile per avere contesto azienda nelle API.
- Errori 403 in console filtrati dal check "errori critici" (sono chiamate API background che non rompono la UI — verificato via screenshot).

### Hook auto post-deploy
Configurato in `.claude/settings.local.json`:
- Evento: `PostToolUse` su `Bash`
- Filtro `if`: `Bash(npx vercel --prod*)`
- Comportamento: aspetta 15s → lancia `npm test` in background (`asyncRewake: true`)
- Se test passano: silenzio
- Se test falliscono: Claude Code viene risvegliato con messaggio "Smoke test falliti dopo il deploy"

### Lancio manuale
```bash
cd tests && npm test     # ~3 minuti
```
Oppure: `.\deploy.ps1` dalla root (deploy Vercel + attesa + smoke test).

**Why:** sicurezza — nessun account persistente esposto, zero superficie di attacco. Pattern usato da Vercel/Linear/Loom per E2E su Supabase.
**How to apply:** ricordare che i test girano automaticamente dopo deploy — non serve farlo manualmente a meno che non si voglia girare in isolamento.
