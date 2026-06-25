---
name: todo_prossima_sessione
description: To-do prossima sessione — Multilingua Fase 1+2 LIVE (24-25/6); prossimo = link custom residui, Fase 3 override, PWA i18n
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## 🟢 STATO AL 24-25/6 — MULTILINGUA (IT+EN) — vedi [[project_multilingua_roadmap]]
**Fase 1 (UI) + Fase 2 (contenuto auto-tradotto Haiku) LIVE e verificate dal vivo.** Tradotti: home, sotto-pagine `/p`, footer, Privacy/Cookie (versione EN parallela), contenuto entità (minisito/descrizioni/blocchi/menu via cache `entity_translations`), form builder (label/placeholder/descrizione; opzioni/valori NO per integrità submission). `<html lang>` corretto in SSR. Smoke test `/en` aggiunto.
**Bug grossi risolti**: (1) BOM in `NEXT_PUBLIC_STAYAPP_DOMAIN` rompeva `isOwnDomain` → /en 404 [[feedback_bom_api_base]]; (2) middleware storpiava `/api/*` sui domini custom → tutte le fetch client rotte (privacy "non trovata", form/booking/chatbot); (3) link footer/nav puliti sui domini custom (`entityBasePath`).
**Codice morto rimosso**: `components/guest/PaginaPage.jsx` + `ContattiForm` in LandingBlockRenderer.

### ✅ FATTO 25/6
1. ~~Link interni residui domini custom~~ — route globali /blog//eventi fixate via `isGlobalPublicPath` nel middleware (pwaUrl era già a posto). Verificato live.
2. ~~Fase 3 (editor override traduzioni EN)~~ — tab "Traduzioni" in SitoPage + API. Ambito v1 = solo contenuto entità. Auth verificata; scrittura da testare interattivamente (Francesco).

### ✅ FATTO anche (25/6 pomeriggio)
- Editor traduzioni esteso alle **sotto-pagine** (selettore "Pagina" in TraduzioniSito; API gestisce tipo='pagina').
- Rename UI **"minisito" → "sito"** nei testi visibili (Aiuto/Eventi/Blog/Attività/Dashboard). Campo jsonb `minisito`, route `/minisito` e identificatori interni INVARIATI (rinominarli = refactor rischioso; `/sito` già occupato da SitoPage).

### 🎯 OBIETTIVO Francesco (25/6): "tutto ciò che vede l'utente in doppia lingua" + UNIFICARE i due editor sito.
### ✅ Blog ed Eventi tradotti (25/6): tipi 'articolo'/'evento' in translate.js (+ prompt preserva HTML); API blog/public/[slug] e guest/eventi/[id] con ?lang; ArticoloPage/EventoPage leggono _lang; hreflang+switcher. Verificato live ("Flour Tasting", "Hands in dough…").

### ⏭️ DA FARE (per chiudere multilingua):
- **PWA ospite** (GuestApp/RestaurantApp/AttivitaPWA, dietro QR) — ULTIMO grosso pezzo non localizzato (interfaccia + contenuti). La più corposa.
- Liste blog (titoli/excerpt nelle card) non tradotte — solo le pagine di dettaglio lo sono. Minore.
- Form builder nell'editor manuale Fase 3 (auto-tradotti ma non correggibili a mano; API supporta tipo='form', manca voce nel selettore). Minore.

### 🏗️ UNIFICARE I DUE EDITOR SITO (architetturale, ANALISI PRIMA di codice)
Francesco vuole UN solo editor (AI genera la prima stesura "come un umano", poi si modifica nello stesso editor). Oggi: `/minisito`→MiniSitoPage (sezioni, sidebar) vs `/sito`→SitoPage (blocchi, da AI builder). Direzione probabile = block system (completato). Serve: analisi cosa scrive l'AI, overlap dati (entrambi toccano `pagine`), migrazione siti esistenti, cosa fare di MiniSitoPage. NON improvvisare. Sessione dedicata con piano.
**Regola nuova nel CLAUDE.md globale**: prima di dire "fatto" verificare SEMPRE dal vivo (curl status+contenuto), non basta build+smoke.

## 🟢 STATO AL 22/6
**Block system del sito: COMPLETO** (Fasi 0-5 + coppie font + sito autonomo, tutto LIVE) → vedi [[project_block_system_roadmap]] e [[project_session_2026_06_22]]. Supabase Pro attivo. Backlog residuo qui sotto.

**Debito sicurezza blog: ✅ CHIUSO (23/6).** Prossimi candidati: cleanup minore (centralizzare liste font duplicate nelle 3 pagine Tema — coppie già condivise) oppure voci grosse: URL puliti `/[slug]`, upgrade Next 15 (sblocca Sentry), PWA da ri-abilitare, Stripe, multi-lingua.

## ✅ OPZIONE B — Snapshot Sito/PWA: FATTA (19/6)
Versioni della config editabile di un'entità con ripristino a 1 click ("cronologia Google Docs" del sito). LIVE + 45/45 smoke + round-trip validato (pagine integre).
- Migration `062_site_snapshots.sql` (eseguita): tabella `site_snapshots` (entity_data + pagine_data jsonb).
- `lib/site-snapshot.js`: `SNAP` (colonne config per tipo, escluso `active`), `captureSnapshot`, `applySnapshot` (pagine: delete + reinsert senza parent_id poi 2ª passata per i parent → evita FK self-reference).
- API: `POST/GET /api/sito-snapshots`, `POST /[id]/restore` (auto-snapshot pre-ripristino = annullabile), `DELETE /[id]`. Auth `requireEntityAccess`. Retention 25 manuali/entità.
- UI: tab **"Versioni"** in `SitoPage.jsx` (componente `VersioniSito`): salva con etichetta / lista / ripristina / elimina.
- Tocca SOLO config (minisito/theme/pagine/menu/gallery/privacy_data), NON dati transazionali.
NB: il restore COMPLETO del backup GDPR (Linea A) resta operazione ASSISTITA d'emergenza, NON un bottone.

## ✅ TURNSTILE: deciso SOFT in modo DEFINITIVO (19/6) — NON ri-attivare strict
Storia: 17/6 strict ruppe i form (build cache perse la Site Key NEXT_PUBLIC). 19/6 ho fatto il fix robusto (Site Key servita a **runtime** via meta tag `cf-turnstile-sitekey` nel layout + componente la legge da lì + fallback build-inlined → immune alla cache) e provato di nuovo lo strict. **Ha RI-bloccato un invio reale**: log = `[turnstile] SOFT: token mancante (widget non ha prodotto token)` → il widget non produce SEMPRE un token (rendering o timing del Managed mode), non hostname-mismatch.
**DECISIONE con Francesco: restare SOFT per sempre.** Per un business di lead, bloccare anche un solo cliente vero > beneficio marginale (l'anti-bot è già dato da honeypot + rate-limit + spam filter + email validation). `TURNSTILE_STRICT` rimosso da Vercel. Codice (`lib/turnstile.js`): logica env ripristinata con warning, default soft; `TURNSTILE_SOFT=1` = kill-switch. **NON impostare TURNSTILE_STRICT=1** senza una sessione dedicata di debug del widget in più browser (e onestamente sconsigliato: rischio sui lead per guadagno ~nullo). Il fix runtime della chiave (meta tag) resta in place, utile a prescindere.

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

## 🔭 PROGETTO PIANIFICATO — URL puliti: namespace unico `/[slug]` (sessione dedicata, architetturale)
Idea di Francesco (18/6): togliere i prefissi `/s/ /r/ /a/` e usare `/[slug]` unico → URL più puliti sul dominio condiviso `oltrenova.com`. Farlo ORA che è piccolo costa meno (al 19/6: **solo 11 slug, NESSUNA collisione tra tipi**, diversi sono test/demo). **Decisione: discutere PRIMA di implementare** (refactor routing).
NB onesto: il valore è **modesto** — sui domini custom il prefisso già sparisce (middleware), quindi il guadagno è solo sugli URL di default. Non è un fix né urgente. "Pochi siti" abbassa il RISCHIO, non il LAVORO (il costo è nel codice).
**Lavoro necessario (farlo BENE o niente):**
1. Resolver in `app/[slug]/page.js` (+ `/p/[pageSlug]`, `/privacy`, `/cookie`): cerca lo slug nelle 3 tabelle (properties/ristoranti/attivita) → determina il tipo → renderizza il componente giusto.
2. **Lista slug RISERVATI**: `/[slug]` alla radice cattura tutto → escludere admin, blog, form, api, signup, preventivo, recensione, eventi, unsubscribe, ecc. + impedire ai clienti di crearli.
3. **Redirect compatibilità**: tenere i vecchi `/s//r//a/` come 301 → `/slug` perché i **QR code già stampati** puntano a `/a/slug?qr=1` e si romperebbero.
4. **Sweep di TUTTI i link interni** che usano `/s//r//a/`: collegamenti tra entità, footer/LandingFooter, sitemap, generazione QR, manifest PWA start_url, middleware (rewrite domini custom → /slug), PolicyPage, guardrail test public-render (i prefissi nel test).
5. **Slug unici GLOBALI**: oggi unici per-tabella → con namespace unico serve controllo di unicità cross-tabella nella generazione slug (altrimenti collisione silenziosa rompe il routing).
Collegato al ripensamento "worldwide / qualsiasi business" (i prefissi struttura/ristorante/attività sono un residuo dei primi 3 verticali).

## 🔭 PROGETTO PIANIFICATO — Upgrade Next 14.2 → 15 (sessione dedicata)
Valutato il 17/6. Progetto medio-grande, NON una patch. Comporta:
- `params`/`searchParams` diventano async (codemod automatico; in parte già usiamo `await params`).
- React 18 → **React 19** (major; verificare lucide-react e altre dipendenze).
- Cache cambia di default (fetch + GET route non più cachati) → testare.
- `instrumentationHook` diventa stabile → **sblocca Sentry nativamente** (motivo principale del collegamento).
- ⚠️ **RISCHIO PRINCIPALE: next-pwa su Next 15** (poco mantenuto; la PWA è il cuore del prodotto) → se non gira, va sostituito il layer PWA. Unknown finché non si prova.
- Tempo realistico: 1-2 sessioni dedicate, con i 43 smoke test come rete.
- Quando si farà Next 15, **Sentry verrà gratis** (instrumentation stabile). Vedi sopra le 3 opzioni Sentry.

## 🔧 PWA da ri-abilitare BENE (disabilitata il 18/6 per pagine bianche)
Il SW next-pwa (precache shell) causava pagine bianche dopo i deploy → disabilitato + kill-switch in `public/sw.js`. Se si vuole la PWA installabile/offline, ri-abilitarla con `next-pwa` ma config **NetworkFirst per la navigazione** (NO precacheAndRoute dello shell HTML), così non serve mai versioni stale. Prima rimuovere il kill-switch sw.js e ripristinare la registrazione in PWARegister. Testare a fondo i deploy successivi. Vedi [[project_session_2026_06_18]].

## Stato 5 interventi sicurezza — vedi [[project_session_2026_06_16_security]]
✅ Rate limit (migration 060 eseguita), ✅ Turnstile LIVE, ✅ Header CSP, ✅ DMARC quarantine, 🟡 Sentry (init bloccato, vedi sopra).

## Robustezza residua (non urgente) — [[project_robustezza_infra]]
- ~~🟠 **Blog: rendering HTML grezzo NON sanitizzato**~~ ✅ FATTO (23/6, LIVE, commit fa799a6, 45/45). `ArticoloPage.jsx` ora sanitizza `articolo.content` con **DOMPurify** (import dinamico, solo browser → SSR-safe) prima del `dangerouslySetInnerHTML`. Copre articoli esistenti+futuri, nessuna migrazione dati. Dep `dompurify ^3.4.11` aggiunta. XSS chiuso.
- **Supabase Pro** ✅ FATTO (22/6, vedi [[project_acquisti_pendenti]]).
- **RLS 2° muro** — progetto architetturale a freddo.
- ~~**Backup per singola azienda** (GDPR)~~ ✅ FATTO (17/6): `GET /api/admin/backup/azienda/[id]` (super_admin o admin propria azienda) → JSON scaricabile, tutte le tabelle filtrate per azienda. Bottone "Esporta dati" nella card azienda. Logica filtri validata sul DB + 401 senza auth.
- ~~**Dati legali nel footer minisiti** (P.IVA, sede, REA — obbligo di legge)~~ ✅ FATTO (17/6): migration 061 (rea+capitale_sociale su aziende), `LegalInfo` nel footer home (LandingFooter) e sotto-pagine (PaginaPage), `getAziendaLegale` resiliente in guest-data, campi nel form admin azienda. Verificato rendering live (con revert). **Campi opzionali** → worldwide-safe. ✅ AZIONE FRANCESCO FATTA (19/6): P.IVA + dati privacy compilati e funzionanti (footer legali + pagine privacy popolate).

## Note operative (vedi [[reference_vercel_env_cli]])
- ✅ **`deploy` da ovunque** (FATTO 22/6): funzione `deploy` nel `$PROFILE` PowerShell (`C:\Users\francesco\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`, file NON in git) → lancia `deploy.ps1` da qualsiasi cartella senza `.\`. `deploy.ps1` ancorato a `$PSScriptRoot` (21/6). Ricreazione al recovery documentata in `CLAUDE.md` passo 5. ExecutionPolicy = Bypass (profilo si carica).
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
