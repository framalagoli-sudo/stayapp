---
name: todo_prossima_sessione
description: To-do prossima sessione — RIPARTIRE da template AI Fase B/C (26/6). Multilingua COMPLETO, editor unificato (passo 2 fatto), galleria template Fase A fatta.
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## ▶️ RIPARTIRE DA QUI (aggiornato 26/6 sera)
### Fix dopo test Francesco (26/6 sera) — tutti live+verificati:
- **Anteprima template REALE**: route `app/template-preview/[id]/page.js` + `TemplatePreviewClient.jsx` (render via LandingBlockRenderer, entità fittizia); galleria la mostra in iframe scalato. Prima erano stack astratti.
- **ChatbotWidget tradotto** (era IT): lang + EN (Assistant/Online now/welcome/errore/placeholder), lang passato dai 7 renderer.
- **amenities tradotte** (erano IT): bug `collectStrings` in `lib/translate.js` → SALTAVA gli array di stringhe semplici (es. amenities ["Wi-Fi","Piscina"]). FIX: raccogli elementi stringa degli array + denylist spostato a monte (salta anche chiavi array/oggetto: opzioni/section_order/condizione restano escluse → submission al sicuro). PROMPT_VERSION v4. LEZIONE: array di stringhe semplici nei JSONB ora tradotti.

## ▶️ Stato precedente (chiuso 26/6)
Frontiera attuale = **sistema template AI builder** (galleria stile Elementor) → vedi [[project_template_gallery]].
- ✅ Fatto oggi: **Multilingua COMPLETO** (sito/PWA/menu/blog/eventi/cookie + override admin) end-to-end; **unificazione editor** Passo 2 (sidebar "Sito web" → SitoPage block editor + tab SEO&Impostazioni); **galleria template Fase A** (3 template + applica + tab Template in SitoPage), verificata (render su /s/prova).
- ⏭️ PROSSIMO (in ordine): **Template Fase B** (AI riempie testi/immagini al business: "uguale" vs "usalo come traccia") → **Fase C** (wizard domande settore/obiettivo → filtri + "Sfoglia") → anteprime live + più template. Poi **Passo 3 unificazione**: ritirare MiniSitoPage (route /minisito ancora esiste, non linkata).
- 🔎 DA TESTARE A VIDEO da Francesco (auth admin, non verificabili da me): (a) tab "SEO & Impostazioni" in Sito salva ok; (b) tab "Template" → "Usa questo template" popola la home; (c) PWA: form prenotazione/chat in EN (servono evento/chatbot attivi). NB: entità test `prova` ha il template Vetrina applicato (demo, innocuo).

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

### ✅ Card blog (lista) tradotte + Form nell'editor (25/6)
- Blog lista: API blog/public traduce title/excerpt in EN riusando cache dettaglio (include content per hash, poi lo scarta); BlogListPage legge _lang, link /en, testi EN. Verificato live.
- Form nell'editor traduzioni: ramo 'form' nella route translations (azienda-scoped, auth requireRecordAccess); selettore TraduzioniSito elenca anche i form dell'azienda. 401 verificato.

### 🔄 PWA ospite — in corso (25/6), per STADI sicuri (default IT col prop server = invariato):
- ✅ Stadio 1: API guest (`/api/guest/[slug]`, `/r/[slug]`, `/a/[slug]`) localizzano contenuto con `?lang=en` (riusa cache sito). Verificato.
- ✅ Stadio 2: toggle bandierina in tutte e 3 le PWA (GuestApp/RestaurantApp/AttivitaPWA) — autodetect navigator.language + persistenza `localStorage 'pwa_lang'`, default IT; refetch `?lang` al cambio. Contenuto EN OK. PWA caricano 200, nessuna regressione.
- ✅ Stadio 3 FATTO (25/6) su tutte e 3 le PWA: UI chrome via `t(lang)` (nav, chip, card home, sezioni Info WiFi/Contatti/Dotazioni/Regole, booking eventi, chat, footer). `lang` propagato ai sottocomponenti via `sp` + firme con `lang='it'`. Import `t as tr` (collisione `t`=tema). Chiavi PWA in i18n. Verificato headless: struttura+ristorante nav IT→EN OK ("Esplora"→"Explore", "Prenota"→"Book"). Attività: stesso pattern, build/deploy ok, ma entità di test mostrava minisito → da verificare a video su un'attività con PWA attiva.
  - Residui MINORI ancora IT (deep form, non bloccanti): in GuestApp EventoDetail "I tuoi dati" + placeholder form prenotazione + placeholder chat "Scrivi un messaggio…"; lista eventi PWA (`/api/guest/eventi`) non localizzata (solo dettaglio).

### ✅ MULTILINGUA COMPLETO (25/6): sito, sotto-pagine, footer, privacy/cookie, form, blog (lista+articoli), eventi, PWA ospite (3 app), menu ristorante (piatti+allergeni), cookie banner. Fasi 1-2-3 + override admin + domini custom.

### 🐛 FIX IMPORTANTI traduzione (25/6) — non ripetere gli errori:
- **Overflow token su contenuti grandi** (menu 70 voci → tutta l'entità tornava IT): la singola chiamata Haiku con chiavi-percorso lunghe gonfiava l'output → JSON troncato → parse fail → fallback IT totale. FIX in `lib/translate.js`: `translateChunk` con **chiavi numeriche** + **chunking ~2500 char** + try/catch per-blocco. `PROMPT_VERSION` nell'hash per invalidare cache al cambio prompt (ora 'v3').
- **Nomi piatti**: il prompt diceva "mantieni nomi piatti in originale" → lasciava IT anche le descrizioni. Ora traduce tutto tranne nomi iconici (Carbonara/Tiramisù).
- **MenuTab allergeni** (`components/MenuTab.jsx`): EU_ALLERGENS/DIETARY con label EN (`allergenLabel(a,lang)`), getTipoLabel lang-aware, header tradotti. `lang` arriva via `sp` — ATTENZIONE: c'erano DUE `sp` in RestaurantApp (riga 168 e 501 in REsploraPage); il 501 non aveva lang → bug allergeni IT, fixato.
- **CookieBanner**: ora riceve `lang` da tutti i renderer (3 PWA + 3 Landing + GuestSubPage).
- ✅ Residui chiusi (25/6): GuestApp form prenotazione eventi (your_data/placeholder/submit) + chat (placeholder) via t(lang); lista eventi `/api/guest/eventi` localizzata con `?lang` (fetch PWA+Landing passano lang). NB: non verificabile a video ora (nessun evento futuro nel sistema; form/chat richiedono dati/chatbot attivi) — codice corretto, build verde, stesso pattern verificato altrove.
- **Lezione**: verificare le PWA col browser HEADLESS (Playwright `chromium`, locale it-IT, click toggle), non solo build/API — i bug di `lang` non passato ai sottocomponenti si vedono solo a video.

### 🏗️ UNIFICAZIONE EDITOR SITO — in corso (26/6). VISIONE Francesco: piattaforma per dummies → AI genera il sito (da template/layout o no) usando i NOSTRI blocchi, poi l'utente ENTRA E MODIFICA nello stesso editor (differenziatore vs competitor che richiedono di ri-chiedere all'AI ogni modifica). Template veri al posto dei "disegnini".
- **Fase 0 (analisi dati) FATTA**: l'AI builder (`/api/ai/generate-site`) GIÀ genera blocchi (pagine __home__ + chi-siamo/servizi/contatti) con obiettivo+template. Render sito = a blocchi (`LandingBlockRenderer` su __home__). Le SEZIONI legacy minisito (highlights/stats/paragrafi/team) **NON renderizzano** (verificato: 2 entità solo-sezioni rendono solo nav+footer) → dati morti, migrazione = rischio ZERO. Censimento: 11 entità (4 live), 2 home-blocchi reali (fondaco-narni, giochisenzapanciere), sezioni legacy solo su 2 test/minori.
- **Passo 2 FATTO (26/6)**: sidebar "Sito web" → `/sito` (SitoPage, editor a blocchi) per tutte le entità + property. Aggiunta tab "SEO & Impostazioni" a SitoPage (seo_title/desc, tagline, booking_url, google verification, show_pwa_link, social) che assorbe la config unica di MiniSitoPage. Tema resta voce sidebar a sé. Verificato live (tab nel bundle, route 200).
- **DA FARE (passo 3+)**: ritirare MiniSitoPage (/minisito non più linkato ma route ancora esiste); rigenerare/migrare le 2 entità solo-sezioni (struttura-test, metodotvb) se servono; **TEMPLATE per l'AI builder** (layout per obiettivo scelti prima di generare, al posto dei disegnini). Verificare a video la nuova tab SEO (auth) + che l'AI builder resti coerente col nuovo ingresso unico.
- File chiave: `components/admin/SitoPage.jsx` (editor blocchi, ora hub), `MiniSitoPage.jsx` (da ritirare), `app/api/ai/generate-site/route.js` (AI→blocchi), `AdminLayout.jsx` (nav).
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
