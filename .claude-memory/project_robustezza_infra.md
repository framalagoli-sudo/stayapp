---
name: project_robustezza_infra
description: "Robustezza infra: Supabase Pro ✅ (22/6), cron Vercel ✅; resta RLS come 2° muro (progetto a freddo)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Architettura confermata buona: **Supabase + Vercel** (Railway dismesso, scelta corretta — vedi [[project_session_railway_migration]]). Da NON ri-architettare. Tre azioni di robustezza pendenti:

1. ~~**Upgrade Supabase Pro ($25/mese)**~~ ✅ FATTO (2026-06-22). Niente da fare lato codice. Spend cap lasciato ON (default) finché non ci sono clienti veri; PITR saltato (add-on a pagamento, disattiverebbe i daily backup). Backup giornalieri 7gg automatici + niente pausing. Dettaglio in [[project_acquisti_pendenti]].

2. ~~**Verificare i cron Vercel**~~ ✅ FATTO. Due fix:
   - **CRON_SECRET**: impostato su Vercel (env Production) + redeploy. Verificato: cron con secret corretto → 200, sbagliato → 401.
   - **Backup R2 falliva in SILENZIO** (scoperto il 2026-06-15 perché Francesco ha notato che il file di oggi su Cloudflare non si aggiornava mai dall'orario delle 5:00 nonostante i miei lanci manuali rispondessero `{ok:true}`). Causa vera: **BOM nelle credenziali R2** → SDK AWS lanciava `Invalid character in header content ["authorization"]` durante la firma SigV4 → upload sempre fallito, ma `runBackup()` usciva con `return` silenzioso e la route rispondeva `{ok:true}` lo stesso. Lezione doppia: (a) il BOM Vercel colpisce ANCHE le credenziali R2 (vedi [[feedback_bom_api_base]]); (b) **mai `return` silenzioso su un fallimento di backup** — un backup che mente "fatto" è peggio di nessun backup. FIX: `cleanEnv()` sulle env R2 + `runBackup()` ora lancia eccezione su fallimento e fa read-back di verifica (`verified:true`, restituisce filename/size/rowCounts nella risposta HTTP). Verificato il 2026-06-15: backup reale creato (`backup-2026-06-15.json.gz`, 24KB, 7 aziende/12 profiles/15 requests/ecc., `verified:true`). NB: provenienza dei file storici delle 5:00 (dal 17 mag) non ricostruibile con certezza da locale, ma irrilevante: ora il backup funziona e si auto-verifica.

3. **RLS (Row Level Security) come 2° muro** sui dati sensibili (contatti, prenotazioni, ecc.). Oggi tutta l'authz è solo nel codice (server usa service role → bypassa RLS). Il 1° muro (codice) è completo + coperto da test di regressione `tests/smoke/security.spec.js`, ma manca la difesa-in-profondità a DB. È un progetto architetturale (policy RLS su ogni tabella + query "per conto utente" col token utente invece della service role), NON una patch. Valutare quando crescono gli sviluppatori che toccano le API. Vedi [[feedback_multitenant_authz]].

**Why:** Francesco vende la piattaforma; queste 3 cose alzano la robustezza prima/durante la crescita.
**How to apply:** Supabase Pro = azione manuale dashboard. Cron = verifica vercel.json. RLS = sessione dedicata a freddo. Tutte tracciate anche in `PIANO_LAVORO.md` (Fase 2).
