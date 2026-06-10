---
name: project-session-2026-05-31
description: "Session 2026-05-31 — fix schema drift, Sentry, check-schema GitHub Actions"
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Completato

- **Sentry monitoring** — `@sentry/node` (server) + `@sentry/react` (client) installati e inizializzati, guarded by env var. Inattivo finché Francesco non aggiunge DSN. [[project-google-calendar-pending]]
- **Bug "Ristorante non trovato" (Borgo del Lago)** — root cause: colonna `modules` mai aggiunta a `ristoranti` (migration 003 la aggiunse solo a `properties`). Migration 054 creata (`ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modules jsonb DEFAULT NULL`). **Ancora da eseguire su Supabase.**
- **check-schema.js + GitHub Actions** — script in `server/scripts/check-schema.js` che valida schema DB via OpenAPI Supabase; workflow `.github/workflows/check-schema.yml` gira su push/PR a main. Ora completamente funzionante (tutti verde dopo fix nomi colonne).
- **Fix nomi colonne check-schema.js** — `prenotazioni`: corretti i nomi errati (nome→cliente_nome, email→cliente_email, telefono→cliente_telefono, slot_inizio→ora_inizio, slot_fine→ora_fine, coperti→n_persone, note→note_cliente); rimossi `recensione_token` e `recensione_inviata` (non esistono in nessuna migration né nel codice). `piano_editoriale`: `note_interne`→`note`. Commit `e5cfc29`.

**Why:** Prima onboarding clienti reali. Schema drift causò produzione down su Borgo del Lago. L'automazione previene il ripetersi.

## Azioni manuali pendenti (Francesco)
- **Eseguire migration 054** su Supabase SQL Editor — sblocca Borgo del Lago
- **Eseguire migrations 045, 046, 047** — piano editoriale completo
- **Sentry**: aggiungere `SENTRY_DSN` su Railway e `VITE_SENTRY_DSN` su Vercel

## Note tecniche
- `recensione_token` e `recensione_inviata` documentate in server/CLAUDE.md ma NON esistono in nessuna migration. Da non usare finché non viene creata una migration dedicata.
- `piano_editoriale.note_interne` in server/CLAUDE.md era sbagliata → corretta in `note`
