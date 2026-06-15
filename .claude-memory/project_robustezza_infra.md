---
name: project_robustezza_infra
description: "3 azioni infrastruttura/robustezza pendenti: Supabase Pro, verifica cron Vercel, RLS come 2° muro"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Architettura confermata buona: **Supabase + Vercel** (Railway dismesso, scelta corretta — vedi [[project_session_railway_migration]]). Da NON ri-architettare. Tre azioni di robustezza pendenti:

1. **Upgrade Supabase Pro ($25/mese)** — da fare PRIMA di vendere a clienti veri. Dà: connection pooling, niente pausa automatica del progetto, backup giornalieri automatici, più risorse.

2. **Verificare i cron Vercel** (`/api/cron/*`: newsletter, backup R2, automazioni, blog). Col passaggio Railway→Vercel i job schedulati sono passati da `setInterval` (processo persistente) a Vercel Cron (serverless). Rischio: un cron non schedulato che fallisce in silenzio. Confermare che siano in `vercel.json`/dashboard e che firino davvero.

3. **RLS (Row Level Security) come 2° muro** sui dati sensibili (contatti, prenotazioni, ecc.). Oggi tutta l'authz è solo nel codice (server usa service role → bypassa RLS). Il 1° muro (codice) è completo + coperto da test di regressione `tests/smoke/security.spec.js`, ma manca la difesa-in-profondità a DB. È un progetto architetturale (policy RLS su ogni tabella + query "per conto utente" col token utente invece della service role), NON una patch. Valutare quando crescono gli sviluppatori che toccano le API. Vedi [[feedback_multitenant_authz]].

**Why:** Francesco vende la piattaforma; queste 3 cose alzano la robustezza prima/durante la crescita.
**How to apply:** Supabase Pro = azione manuale dashboard. Cron = verifica vercel.json. RLS = sessione dedicata a freddo. Tutte tracciate anche in `PIANO_LAVORO.md` (Fase 2).
