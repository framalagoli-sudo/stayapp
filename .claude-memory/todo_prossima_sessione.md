---
name: todo_prossima_sessione
description: Lista to-do prossima sessione — TOP: Step D Sentry (codice pronto, serve solo DSN)
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## 🔝🔝 PROSSIMA SESSIONE (deciso 17/6) — OPZIONE B: Snapshot Sito/PWA (restore sicuro)
Sistema di versioni della **configurazione editabile** di un'entità (minisito JSONB, pagine, tema, menu) con **ripristino a 1 click** — il paracadute contro "ho rotto il sito mentre editavo". SICURO perché tocca solo config, non dati transazionali (niente prenotazioni/FK/foto da perdere). Tipo cronologia Google Docs.
Da fare: capire dove stanno le config (struttura JSONB su properties/ristoranti/attivita, tabella `pagine`, menu) → tabella `snapshots` → capture (manuale + auto pre-modifica) → UI "Versioni del sito" con Ripristina.
NB: il restore COMPLETO del backup GDPR (Linea A) resta operazione ASSISTITA d'emergenza, NON un bottone (rischio: sovrascrive, FK, righe nuove, foto in Storage non incluse).

## ⚠️ TURNSTILE ORA È SOFT (non blocca) — fix robusto da fare
Il 17/6 con campagna live i form si sono bloccati ("Verifica anti-bot fallita") perché un deploy con build cache ha perso la Site Key `NEXT_PUBLIC` dal bundle → widget non rende → strict blocca. Mitigato: (a) Turnstile **SOFT di default** (form non bloccano mai più, `TURNSTILE_STRICT=1` per riattivare), (b) `deploy.ps1` ora usa `--force` (no cache). 
**Fix robusto per riattivare strict in sicurezza**: NON far dipendere il blocco da una var `NEXT_PUBLIC` build-time. Servire la Site Key a **runtime** (es. server component nel layout inietta `window.__TURNSTILE_KEY__` da `process.env.TURNSTILE_SITE_KEY` non-public, oppure endpoint `/api/public/turnstile-key`), poi il componente Turnstile la legge da lì. Così la cache non può più romperla. Solo DOPO → `TURNSTILE_STRICT=1`. Finché non fatto, lasciare SOFT (honeypot + rate-limit + spam filter proteggono comunque).

## ⛔ DEFERITO — STEP D Sentry: BLOCCATO da incompatibilità versione (17/6)
**Sentry NON cattura** e serve una sessione dedicata. Cosa scoperto il 17/6:
- DSN creato (progetto `javascript-nextjs`, org `oltrenova`, regione EU) + `SENTRY_DSN` impostato su Vercel. DSN **verificato funzionante** via ingest diretto (POST `/store/` → 200 + event_id).
- MA l'**SDK non inizializza lato server**: `/api/diag-sentry` riportava `sentry_initialized:false` (via `Sentry.getClient()`) nonostante DSN presente — **anche con init MANUALE dentro la route**.
- Provati e FALLITI tutti: solo `instrumentation.js`, `withSentryConfig` (wrappato su next-pwa, builda ok), init manuale, **downgrade @sentry/nextjs v10→v8.55** (v10 è per Next 15).
- Ipotesi: l'init OTEL-based di Sentry v8+ richiede l'avvio prima del server (flag `--import`/registrazione) che Next 14.2 su Vercel serverless non fornisce nel modo atteso.
- Stato codice lasciato: @sentry/nextjs **v8.55** installato, `instrumentation.js`+`sentry.{server,edge,client}.config.js`+`withSentryConfig` in place (inerti, build pulita), route diag RIMOSSA.

**Opzioni per la prossima sessione (scegliere con Francesco):**
1. Provare il setup ESATTO del wizard Sentry per Next 14 (forse manca un pezzo: `global-error.js`, o l'ordine di import, o `instrumentation-client`).
2. **Upgrade a Next 15** (progetto a sé) → Sentry v10 + instrumentation funziona nativo.
3. Alternativa leggera: error-tracking via **Vercel Log Drains / Better Stack**, o un wrapper `Sentry.captureException` con init lazy in un modulo condiviso.
NB: visibilità errori NON è zero oggi — i **log runtime Vercel** ci sono (`npx vercel logs <dep> --json`), usati per debug.

## 🔭 PROGETTO PIANIFICATO — Upgrade Next 14.2 → 15 (sessione dedicata)
Valutato il 17/6. Progetto medio-grande, NON una patch. Comporta:
- `params`/`searchParams` diventano async (codemod automatico; in parte già usiamo `await params`).
- React 18 → **React 19** (major; verificare lucide-react e altre dipendenze).
- Cache cambia di default (fetch + GET route non più cachati) → testare.
- `instrumentationHook` diventa stabile → **sblocca Sentry nativamente** (motivo principale del collegamento).
- ⚠️ **RISCHIO PRINCIPALE: next-pwa su Next 15** (poco mantenuto; la PWA è il cuore del prodotto) → se non gira, va sostituito il layer PWA. Unknown finché non si prova.
- Tempo realistico: 1-2 sessioni dedicate, con i 43 smoke test come rete.
- Quando si farà Next 15, **Sentry verrà gratis** (instrumentation stabile). Vedi sopra le 3 opzioni Sentry.

## Stato 5 interventi sicurezza — vedi [[project_session_2026_06_16_security]]
✅ Rate limit (migration 060 eseguita), ✅ Turnstile LIVE, ✅ Header CSP, ✅ DMARC quarantine, 🟡 Sentry (init bloccato, vedi sopra).

## Robustezza residua (non urgente) — [[project_robustezza_infra]]
- **Supabase Pro** ($25/mese) — manuale dashboard, prima dei clienti veri.
- **RLS 2° muro** — progetto architetturale a freddo.
- ~~**Backup per singola azienda** (GDPR)~~ ✅ FATTO (17/6): `GET /api/admin/backup/azienda/[id]` (super_admin o admin propria azienda) → JSON scaricabile, tutte le tabelle filtrate per azienda. Bottone "Esporta dati" nella card azienda. Logica filtri validata sul DB + 401 senza auth.
- ~~**Dati legali nel footer minisiti** (P.IVA, sede, REA — obbligo di legge)~~ ✅ FATTO (17/6): migration 061 (rea+capitale_sociale su aziende), `LegalInfo` nel footer home (LandingFooter) e sotto-pagine (PaginaPage), `getAziendaLegale` resiliente in guest-data, campi nel form admin azienda. Verificato rendering live (con revert). **Campi opzionali** → worldwide-safe. ⚠️ AZIONE FRANCESCO: compilare P.IVA (+ REA/cap.soc. per s.r.l.) di ogni azienda nel pannello admin, altrimenti il footer resta vuoto. Oggi tutte le aziende hanno P.IVA vuota.

## Note operative (vedi [[reference_vercel_env_cli]])
- Var `NEXT_PUBLIC_*`: dopo cambio su Vercel serve `vercel --prod --force` (build cache stale).
- Log prod: `npx vercel logs <dep-url> --json` da `client-next/`.
- Leva emergenza Turnstile: `TURNSTILE_SOFT=1` su Vercel disattiva il blocco senza perdere lead.

---
## Storico (sessioni precedenti) — FATTO
- Railway spento, Resend bounce webhook, Form Builder e2e, Bot Fight Mode (15/6).
- 🔒 Audit sicurezza multi-tenant COMPLETO (15/6) — ~19 IDOR chiusi + 31 route [id]. Vedi [[project_session_2026_06_15c_security]], [[feedback_multitenant_authz]].
- FASE 0 (sicurezza + data-write su 6 blocchi) completa. PWA attività cablata. Primitive in server-auth.js.

### ⏳ Altri TODO manuali
- **Google Calendar** — `GOOGLE_CLIENT_ID`/`SECRET` su Vercel; codice da portare Railway→Next.js. Vedi [[project_google_calendar_pending]]
- **Stripe Sprint 10 (billing SaaS)** — sprint futuro grosso.
- **FASE 1** deep-review UI/edge-case per modulo; estendere guard beforeunload ad altri editor.

### ❌ SCARTATO
- Abstract API email validation (limite free 100/mese troppo basso).
