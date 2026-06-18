---
name: project_session_2026_06_16_security
description: "Session 2026-06-16: fix backup R2 (silent-fail+BOM) + 5 interventi sicurezza pre-vendita (rate limit, Turnstile LIVE, header CSP, Sentry pending, DMARC)"
metadata:
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Sessione lunga di hardening pre-vendita. Partita da "dove va il backup" → finita con audit sicurezza completo.

## Backup R2 — bug grave trovato e risolto
Lo scetticismo di Francesco (file su Cloudflare sempre alle 5:00, mai aggiornato dai miei lanci) ha smascherato due bug in `client-next/lib/backup.js`:
1. **Silent-fail**: `runBackup()` usciva con `return` su errore → la route rispondeva `{ok:true}` anche senza salvare. Fix: lancia eccezione + read-back di verifica (`verified:true`, ritorna filename/size/rowCounts).
2. **BOM nelle credenziali R2** → SDK AWS `Invalid character in header content ["authorization"]` → upload SEMPRE fallito. Fix: `cleanEnv()` (strip BOM+CRLF+trim). Vedi [[feedback_bom_api_base]].
Backup ora reale e verificato (`backup-AAAA-MM-GG.json.gz`, ~24KB, 19 tabelle). NB: i cron giravano già (le 5:00 IT = 3:00 UTC schedulato); la mia diagnosi iniziale "fermi da mesi" era SBAGLIATA — file giornalieri dal 17 mag con pulizia 30gg confermavano il funzionamento. Lezione: privilegiare l'evidenza sulla narrazione.

## 5 interventi sicurezza (audit "cosa manca contro hacker/phishing/spam")
Stato reale verificato leggendo codice + DNS + npm audit. Vedi dettaglio in [[project_roadmap_sprint]] Fase 3.
1. **Rate limit** ✅ LIVE — migration `060_rate_limits.sql` ESEGUITA su Supabase (funzione `check_rate_limit`, verificata `[true,true,true,false]` + 429 reale in prod). Il vecchio limitatore in-memory NON funzionava su serverless. Su forgot-password 3/h, guest/contact 5/h, subscribe 3/h, form-builder 5/h. `lib/rate-limit.js`, fail-open.
2. **Turnstile** ✅ LIVE e verificato end-to-end (utente conferma spunta verde+email+CRM; 403 senza token). Saga: non funzionava al 1° deploy per Site Key `NEXT_PUBLIC` non inlinata da build cache → risolto con `vercel --prod --force`. Vedi [[reference_vercel_env_cli]]. Leva emergenza `TURNSTILE_SOFT=1`. Bypass CI `TURNSTILE_TEST_BYPASS`.
3. **Header sicurezza** ✅ LIVE e verificati (CSP livello 1, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch) in `next.config.js`.
4. **Sentry** 🔴 BLOCCATO (tentato il 17/6) — DSN creato + su Vercel + verificato via ingest diretto, ma l'SDK NON inizializza su Next 14.2 (anche con init manuale; falliti instrumentation/withSentryConfig/downgrade v8). Serve sessione dedicata. Dettagli completi + opzioni in [[todo_prossima_sessione]].
5. **DMARC** ✅ FATTO + verificato — da `p=none` a `v=DMARC1; p=quarantine; adkim=r; aspf=r` (Cloudflare DNS). Anti-spoofing attivo.

Bot Fight Mode CF già attivo. npm audit: 10 vuln ma SOLO build-time (next-pwa/workbox) → rischio reale basso, ignorate.

## Env impostate su Vercel questa sessione
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`=0x4AAAAAADlbOrVGDpfHnxkA, `TURNSTILE_SECRET_KEY`, `TURNSTILE_TEST_BYPASS`=q-HE5uCNxI7rbxEl3zTQPLGp243Zy89-SCC9mpxzmEw. (CRON_SECRET già da sessione precedente.)

**Why:** Francesco vende la piattaforma; queste cose alzano la robustezza prima dei clienti veri.
**How to apply:** Prossima sessione = OPZIONE B snapshot Sito/PWA (vedi [[todo_prossima_sessione]]). Restano da valutare Supabase Pro e RLS (vedi [[project_robustezza_infra]]).

---

## Continuazione 17/6

- **Sentry (Step D)**: tentato, BLOCCATO. DSN creato/funzionante via ingest diretto, ma SDK non inizializza su Next 14.2 (`sentry_initialized:false` anche con init manuale; falliti instrumentation/withSentryConfig/downgrade v8). Deferito → serve Next 15 o alternativa. @sentry/nextjs **v8.55** ora installato (era v10), scaffolding in place ma inerte.
- **Backup per-azienda (GDPR)** ✅ FATTO: `GET /api/admin/backup/azienda/[id]` (super_admin o admin propria azienda) → JSON con tutte le tabelle filtrate per azienda. Bottone "Esporta dati" nella card azienda. Validato sul DB + 401 senza auth + 43/43 smoke.
- **Dati legali nel footer minisiti** ✅ FATTO: migration 061 (rea+capitale_sociale), `LegalInfo` in LandingFooter+PaginaPage, `getAziendaLegale` resiliente. Verificato rendering live con revert. ⚠️ Francesco deve compilare P.IVA delle aziende (oggi tutte vuote).
- **🔴 INCIDENTE Turnstile (campagna live)**: i form si sono bloccati ("Verifica anti-bot fallita") perché un deploy con build cache ha perso la Site Key `NEXT_PUBLIC` dal bundle → widget non rende → strict blocca. Sbloccato in ~minuti: Turnstile messo **SOFT di default** (form non bloccano mai), `deploy.ps1` ora `--force`. Lezione critica in [[reference_vercel_env_cli]] punto 5. Riattivare strict solo dopo fix runtime della Site Key (vedi [[todo_prossima_sessione]]).
- **Opzione B (snapshot Sito/PWA, restore sicuro)** = prossima sessione, decisa con Francesco.
- **🔴 Pagine privacy/cookie mancanti (404)** ✅ FIXATO: le cartelle `app/{s,r,a}/[slug]/{privacy,cookie}` erano VUOTE dalla migrazione Next (6/6) → tutti i link privacy/cookie di footer e form davano 404 (NON una regressione recente, buco di migrazione mai notato). Create le 6 `page.js` che montano `PolicyPage` (componente esisteva, mai agganciato). `PolicyPage` passato da apiFetch→guestFetch. Verificato 200 live + 43/43 smoke. NB: l'HTML delle pagine contiene "could not be found" ma è boilerplate not-found di Next nel payload condiviso (presente anche nelle pagine OK), non un errore.
- **🔴 Letture STALE (modifiche admin non visibili sul sito)** ✅ FIXATO ALLA RADICE: Next 14 cacha le `fetch()` interne di supabase-js → privacy_data/minisito modificati restavano vecchi. Prima ho messo `force-dynamic` sui route guest (cerotto, NON risolveva), poi il fix vero: `cache:'no-store'` sul client admin in `lib/supabase-server.js`. Verificato live (P.IVA reale appare). Dettagli + diagnosi in [[reference_next14_fetch_cache]]. **Lezione su come lavoro** (Francesco mi ha richiamato): [[feedback_diagnosi_prima_del_deploy]].
