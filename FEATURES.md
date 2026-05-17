# FEATURES — Roadmap prodotto StayApp

Documento vivo. Aggiornato sessione per sessione.
Ultima revisione: **2026-05-17** (Google Calendar sync + Loyalty & Gift Card)

---

## Come leggere questo file

- `[ ]` — da fare
- `[~]` — parzialmente implementato / fondamenta presenti
- `[x]` — completato
- Priorità: 🔴 Alta · 🟡 Media · 🟢 Bassa

---

## Visione prodotto

**StayApp = "business in a box" worldwide** per qualsiasi business di servizi.
Hotel, ristoranti, attività, ma anche freelancer, agenzie, studi, palestre, coach, negozi.

Competitor: GoHighLevel · HubSpot · WordPress · Wix · Webflow
Vantaggio unico: **PWA installabile via QR** — nessun competitor lo fa integrato.

### Go-to-market: modello ibrido (concordato 2026-05-16)

**Fase 1 — Diretto** *(ora)*
Primi 20-30 clienti paganti con self-signup. Servono per validare il prodotto,
raccogliere testimonial e avere social proof da mostrare alle agenzie.
Richiede: self-signup + Stripe subscription billing.

**Fase 2 — Ibrido leggero** *(quando ci sono i primi clienti)*
- Piano "Agency" a prezzo più alto con white-label incluso
- Programma referral: l'agenzia porta clienti → prende 20-30% ricorrente
- L'agenzia gestisce il cliente, StayApp gestisce il prodotto
- Non serve infrastruttura complessa: basta un piano diverso e white-label base

**Fase 3 — Canale agenzia pieno** *(se il modello funziona)*
- Sub-account (ogni agenzia gestisce N clienti indipendenti)
- Dashboard rivenditore con fatturazione
- Prezzi custom per cliente finale
- Qui si compete direttamente con GoHighLevel sul mercato europeo

**Vantaggio vs GHL per agenzie europee:**
GHL è in inglese, complesso, senza GDPR nativo, senza PWA.
StayApp è più semplice da rivendere a PMI italiane/europee.

**Insight architetturale (2026-05-15):** le entità "struttura / ristorante / attività" sono
strutturalmente quasi identiche — stesse tabelle, stesse colonne, stessi pattern.
Le differenze sono solo di terminologia e sezioni disponibili. Il refactor per renderle
generiche ("Business") è meno complesso di quanto sembri — pianificato come v2.

---

## Target verticali

| Vertical | Stato |
|---|---|
| Hotel / B&B / Agriturismo | ✅ struttura |
| Ristorante / Bar | ✅ ristorante |
| Attività / Esperienza / Tour | ✅ attivita |
| Centro sportivo / Palestra | estendibile da attivita |
| Freelancer / Studio professionale | v2 — entità generica "Business" |
| Agenzia marketing | v2 — white-label + sub-account |
| Negozio / E-commerce | v2 — modulo prodotti |

---

## Stato implementazione ✅ (aggiornato 2026-05-16)

### UX Admin (questa sessione)
- [x] Sidebar con icone, raggruppamento visivo, booking sub-menu collassabile
- [x] Breadcrumb navigazione su tutte le pagine admin
- [x] Dashboard completa: greeting, entity cards, 4 KPI, richieste+prenotazioni+contatti con icone

### CRM (questa sessione)
- [x] **Pipeline Kanban** — 5 colonne (Lead → Contattato → In trattativa → Chiuso ✓ → Perso), drag & drop, badge lista, stage select rapido, ottimistic update. Migration: `ALTER TABLE contatti ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'lead';` ✅ eseguita

### Tracking & Analytics (questa sessione)
- [x] **Meta Pixel / GA4 / GTM** — card "Tracking & Analytics" nel tab SEO di struttura/ristorante/attività. Script iniettati dinamicamente nell'`<head>` della landing. `client/src/lib/tracking.js`

### Admin panel (sessioni precedenti)
- [x] Login + 2FA TOTP
- [x] Password reset via email
- [x] Analytics con grafici SVG (range 7/30/90gg)
- [x] Gestione aziende, strutture, ristoranti, attività (CRUD)
- [x] Minisito drag-and-drop + page builder CMS (23 blocchi, SEO, header/footer)
- [x] Chatbot visual builder (decision tree, preview live)
- [x] Booking risorse (slot/coperti, calendario, promozioni, cancellazione self-service)
- [x] Newsletter (4 template, double opt-in, schedulazione, test, archivio)
- [x] Contatti CRM base (filtri, tag, add/edit)
- [x] Blog & News (Tiptap, categorie)
- [x] Eventi (CRUD, prenotazioni, export CSV)
- [x] Richieste ospiti + Prenotazioni
- [x] Audit log
- [x] Gestione staff (invito email, permessi granulari, selezione entità)
- [x] QR Code generatore
- [x] Sicurezza: helmet, rate limiting, CORS, zod, 2FA, backup R2

### Guest PWA + Minisito
- [x] PWA struttura/ristorante/attività + ChatbotWidget + BookingWidget
- [x] Privacy/GDPR auto-generate + CookieBanner

---

## ROADMAP — Prossimi sprint

### Sprint 4 — Webhooks / API outbound ✅ 2026-05-16
- [x] `server/lib/webhook.js` — sendWebhooks() fire-and-forget, Promise.allSettled, timeout 6s
- [x] `/api/webhooks` CRUD + `POST /:id/test` — invia payload di test all'URL
- [x] Agganciato su: nuovo_contatto, nuova_prenotazione, nuova_richiesta, cambio_stage_pipeline
- [x] UI admin: `/admin/integrazioni` — lista webhook, toggle attivo, add/delete, test con risposta HTTP
- [x] Fix bug: pipeline_stage ora persiste correttamente nel PATCH /api/contatti/:id
- **Migration da eseguire su Supabase** (vedi sotto in "Azioni manuali")

### Sprint 5 — Email automation sequences ✅ 2026-05-16
- [x] Trigger: **nuova_prenotazione** → email conferma personalizzata (delay configurabile)
- [x] Trigger: **pre_visita** → reminder N ore prima dell'appuntamento
- [x] Trigger: **post_visita** → follow-up N ore dopo la visita
- [x] Trigger: **nuovo_contatto** → sequenza benvenuto a nuovi lead dal form minisito
- [x] UI admin: `/admin/automazioni` — CRUD, toggle attiva/disattiva, editor steps con variabili, log esecuzioni, test email
- [x] DB: `automazioni` + `automazioni_log` — scheduler ogni 60s, variabili `{{nome}} {{data}} {{ora}} {{servizio}} {{n_persone}}`
- [x] Runner asincrono `runAutomazioniScheduler()` — invia via Resend, retry-safe (status pending→sent/failed)
- **Migration da eseguire su Supabase:** `029_automazioni.sql`

### Sprint 6 — Reviews & Reputation ✅ 2026-05-16
- [x] Form raccolta recensione pubblica `/recensione?token=...` — stelle + commento, universale (non legato al booking)
- [x] Smart redirect: ≥4 stelle → URL configurabile (Google/TripAdvisor/qualsiasi); <4 → privata + notifica admin
- [x] Import manuale da qualsiasi fonte (Google, TripAdvisor, Booking.com, ecc.) con badge fonte
- [x] Admin page `/admin/recensioni` — media KPI, toggle pubblica/nascosta, risposta pubblica, elimina
- [x] Sezione `recensioni` nelle tre landing page (dinamica, separata da `testimonianze` curate)
- [x] Generazione link token per singolo cliente (con nome pre-compilato)
- [x] Bottone "Richiedi recensione" in BookingPrenotazioniPage (per ogni prenotazione)
- [x] Bottone "Richiedi recensione" in ContattiPage — picker entità se più di una
- [x] Variabile `{{link_recensione}}` nelle automazioni post_visita (token auto-generato al momento della prenotazione)
- **Migration eseguita:** `030_recensioni.sql` ✅

### Sprint 7 — Self-signup + Trial ✅ 2026-05-16
- [x] Toggle signup on/off dal super_admin (`/admin/impostazioni`) — default OFF
- [x] Pagina pubblica `/signup` — registrazione azienda (nome, email, password); se chiuse → schermata lockout
- [x] Onboarding wizard 3 step: scegli tipo entità → carica logo → completamento
- [x] Trial gratuito 14 giorni — `trial_ends_at` + `subscription_status` su aziende, banner countdown in admin
- [x] Email benvenuto automatica post-registrazione (via Resend)
- [x] Upload logo supporta `property_id` query param (fix per admin_azienda senza property_id nel profilo)
- **Migration eseguita:** `031_signup.sql` ✅
- **Stripe Billing** (piani mensili) → Sprint 8

### Sprint 8 — Security audit + Domini custom ✅ 2026-05-16

**Security — Multi-tenant isolation:**
- [x] Audit sistematico su 18 route file — identificati 11 problemi (2 critici, 9 importanti)
- [x] Fix `properties.js` GET/PATCH/DELETE `/:id` — filtro `azienda_id` aggiunto
- [x] Fix `ristoranti.js` GET/PATCH/DELETE `/:id` — filtro `azienda_id` aggiunto
- [x] Fix `attivita.js` GET/PATCH/DELETE `/:id` — filtro `azienda_id` aggiunto
- [x] Fix `contatti.js` PATCH/DELETE `/:id` — filtro `azienda_id` aggiunto
- [x] Fix `newsletter.js` GET/PATCH/DELETE `/:id` — filtro `azienda_id` aggiunto
- [x] Fix `pagine.js` GET/PATCH/DELETE `/:id` — verifica ownership via `entity_tipo/entity_id`
- [x] Fix `booking.js` GET `/risorse/:id` — filtro `azienda_id` aggiunto

**Domini:**
- [x] **Opzione A — Sottodominio incluso**: ogni entità creata riceve automaticamente `slug.stayapp.it`; zero configurazione
- [x] **Opzione B — Dominio custom autonomo**: il cliente inserisce il proprio dominio nell'admin → Vercel API lo aggiunge → istruzioni DNS inline (CNAME/A con copia rapida) → bottone "Verifica" → tutto senza toccare il codice
- [x] CORS wildcard `*.stayapp.it` + cache custom domains in memoria (refresh 5 min)
- [x] `DomainDetector` in App.jsx: rileva sottodominio/dominio custom → risolve entità → redirect trasparente
- [x] Pagina admin `Domini` disponibile per struttura / ristorante / attività
- [x] `GET /api/public/resolve-domain?d=` — endpoint pubblico per la risoluzione
- [x] Auto-creazione record sottodominio alla creazione di ogni entità
- **Migration da eseguire:** `035_domini.sql`
- **Env vars da aggiungere in Railway:** `STAYAPP_DOMAIN=stayapp.it`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`

### Sprint 9-mini — Responsive mobile audit ✅ 2026-05-16
- [x] 23 pagine admin — tutti `gridTemplateColumns: '1fr 1fr'` e `'1fr 1fr 1fr'` → `repeat(auto-fit, minmax(Xpx, 1fr))` (stacking automatico su mobile)
- [x] Calendario piano editoriale — `overflowX: auto` su wrapper (scroll orizzontale su mobile)
- [x] Emoji picker newsletter — `width: 320` → `maxWidth: 320` (non rompe layout stretto)
- [x] DominiPage — fix hook condizionale + destructuring errato (`data` → `property`)
- [x] Node.js su Vercel — cambiato da `24.x` a `20.x` LTS (build funzionante)

### Sprint 5B — E-commerce / Shop ✅ 2026-05-17
- [x] Migration `036_shop.sql`: tabelle `prodotti` + `ordini` (voci JSONB snapshot, stock null=illimitato, stato a 6 valori, stripe_session_id/payment_intent, tracking_url)
- [x] Backend `shop.js`: CRUD prodotti admin, gestione ordini (lista + dettaglio + PATCH stato/note/tracking), endpoint pubblici con **price revalidation server-side** per sicurezza
- [x] Stripe checkout opzionale: import dinamico, se `STRIPE_SECRET_KEY` non configurata → ordine COD senza redirect. Se configurata → Stripe Session
- [x] Email conferma ordine via Resend
- [x] `CarrelloContext`: carrello persistente localStorage (`stayapp_cart`), aggiungi/rimuovi/aggiorna/svuota, totale/count
- [x] `ShopWidget`: componente pubblico con filtri categoria, griglia prodotti, qty +/−, carrello drawer, checkout form + indirizzo, conferma ordine
- [x] Admin `ShopPage`: tab Prodotti (thumbnail, prezzo, toggle Eye, Trash2) + tab Ordini (filtro stato, badge colorati)
- [x] Admin `ProdottoEditorPage`: nome, descrizione + AI, prezzo, scontato (% auto), stock, categoria, attivo, upload immagini multi
- [x] Admin `OrdineDetailPage`: cliente + indirizzo, voci snapshot con subtotali, gestione stato/tracking/note_admin
- [x] Sidebar AdminLayout: link "Shop" con icona ShoppingBag
- [x] Landing pages Struttura/Ristorante/Attività: case 'shop' → `<ShopWidget aziendaId primaryColor />`
- [x] MiniSito admin: 'shop' in DEFAULT_SECTION_ORDER + labels in tutte e 3 le pagine
- **Migration da eseguire su Supabase:** `036_shop.sql` ⚠️
- **Stripe opzionale:** aggiungere `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in Railway quando pronto

### Content Studio ✅ 2026-05-17
- [x] **Strategia editoriale AI** — wizard 4 domande → 5 content pillar, tono di voce, frequenza/canale, hashtag base
- [x] **Piano mensile AI** — genera 12-16 post distribuiti nel mese con contesto reale (eventi, prodotti, recensioni); "Crea bozze" → inserisce in piano_editoriale
- [x] **Caption Studio** — 3 varianti per piattaforma (Instagram/Facebook/LinkedIn/TikTok/Google Business) con guida per-canale
- [x] **Gap Analyzer (Opportunità)** — scansiona eventi prossimi, prodotti attivi, articoli recenti non promossi; bottone "Crea post" → PostSocialModal precompilato
- [x] **PostSocialModal** — canvas grafico browser-side (4 formati: 1:1 / 4:5 / 9:16 / 16:9), caption AI, aggiungi al piano editoriale; integrato in blog/eventi/prodotti editor
- **Migration da eseguire:** `037_content_studio.sql` (`ALTER TABLE aziende ADD COLUMN IF NOT EXISTS content_strategy jsonb DEFAULT '{}';`) ⚠️
- **Richiede:** `ANTHROPIC_API_KEY` su Railway

### Survey & NPS ✅ 2026-05-17
- [x] **Invio survey via email** — admin invia link token al cliente (nome + email)
- [x] **Pagina pubblica `/survey?token=`** — scala NPS 0-10 con colori graduali (rosso→verde), commento opzionale, stato "già compilata"
- [x] **Admin `/admin/survey`** — KPI: NPS score (-100/+100), % promotori (9-10), % neutri (7-8), % detrattori (0-6), totale risposte; lista con chip colorato + commento + timeago
- [x] Voce sidebar "Survey & NPS"
- **Migration da eseguire su Supabase:** `038_survey.sql` ✅ eseguita 2026-05-17

### Dashboard migliorata ✅ 2026-05-17
- [x] +3 KPI card: Recensione media (⭐ media + conteggio), Prossimi eventi (30gg), Bozze piano editoriale
- [x] Nuova sezione "Prossimi eventi" — lista con visualizzazione data (giorno/mese numerale) + ora + prezzo, click → editor evento

### Google Calendar Sync ✅ 2026-05-17
- [x] OAuth2 per account Google del cliente — un Google Cloud project per StayApp, ogni cliente connette il proprio account
- [x] `/api/google-calendar/auth` + `/callback` + `/disconnect` + `/status`
- [x] Token OAuth salvato per azienda in `aziende.google_calendar_token jsonb`; refresh automatico se scaduto
- [x] Sync automatica alla creazione prenotazione pubblica (fire-and-forget)
- [x] Sync su cambio stato: `confermata` → crea evento; `cancellata` → elimina evento
- [x] `google_event_id` salvato su prenotazione per aggiornamenti/cancellazioni
- [x] UI admin `/admin/integrazioni` — sezione Google Calendar: Connetti / Disconnetti, email account collegato
- **Migration da eseguire:** `039_google_calendar.sql` ⚠️
- **Setup manuale richiesto:** Google Cloud Console (API Calendar, OAuth 2.0, redirect URI) + Railway env `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- **Test mode:** in "test mode" Google, aggiungere email clienti manualmente come utenti di test

### Loyalty & Gift Card ✅ 2026-05-17
- [x] Migration `040_loyalty.sql`: `loyalty_programs` + `loyalty_points` + `gift_cards` + colonne extra su `ordini`
- [x] Admin `/admin/loyalty` — tab "Programma punti": configura nome, punti/€, valore punto, soglia riscatto + formula preview + classifica top 50 clienti per saldo
- [x] Admin `/admin/loyalty` — tab "Gift Card": CRUD (crea con codice auto/manuale, valore, intestatario, scadenza; toggle attiva/disattiva; elimina)
- [x] Shop integration: `applicaLoyaltyOrdine` calcola sconti punti + gift card prima del totale finale; `registraRiscatto` registra il riscatto; `assegnaPuntiOrdine` assegna punti post-ordine (tutti fire-and-forget)
- [x] ShopWidget pubblico: lookup saldo punti by email (debounced 600ms), checkbox "usa punti" con sconto live, campo gift card con verifica inline, breakdown sconti nel footer checkout
- [x] Endpoint pubblici: `GET /api/loyalty/public/:id/saldo?email=` + `GET /api/loyalty/public/:id/gift-card?codice=`
- [x] API admin: `GET/PUT /api/loyalty/program`, `GET /api/loyalty/contatto/:id`, `POST /api/loyalty/assegna`, `GET /api/loyalty/classifica`, CRUD gift-cards
- **Migration da eseguire:** `040_loyalty.sql` ⚠️

### Sprint 10 — Stripe Subscription Billing (prossimo) 🔴
- [ ] Piani mensili (base/standard/premium) con prezzi
- [ ] Checkout Stripe per subscription dalla pagina signup/trial
- [ ] Banner scadenza trial → upgrade
- [ ] Webhook Stripe → aggiorna subscription_status su aziende
- [ ] Gestione rinnovo, cancellazione, downgrade
- [ ] Dashboard admin super: lista abbonamenti attivi + MRR
- *Prerequisito per monetizzare la piattaforma*

### Sprint 11 — Stripe payments (futuro) 🟡
- [ ] Checkout booking risorse (deposito o totale)
- [ ] Checkout eventi
- [ ] Link pagamento rapido (admin genera link "paga €X" → cliente paga)
- [ ] Webhook Stripe → aggiorna stato prenotazione automaticamente
- *Richiede: account Stripe + chiavi API in Railway/Vercel env*

---

## ROADMAP — Tier 2: Marketing & Growth 🟡

### Tracking social (✅ Pixel/GA4/GTM/TikTok fatto — da completare)
- [x] **TikTok Pixel** — stesso pattern Meta Pixel ✅ 2026-05-16
- [ ] **WhatsApp Business API** — messaggi automatici conferma/reminder (Meta Cloud API, 1000 conv/mese gratis)
- [ ] **Social embed blocks** — blocchi oEmbed Instagram/TikTok nel page builder
- [ ] **Facebook Lead Ads → CRM** — webhook Meta → contatto automatico in StayApp (banale con webhooks)
- [ ] **Social posting scheduler** — richiede Meta App Review (settimane)
- [ ] **Google Business Profile** — post aggiornamenti, leggi/rispondi recensioni

### Piano editoriale social ✅ 2026-05-16
- [x] Calendario mensile interattivo — clic su giorno → crea post con data pre-selezionata
- [x] Lista alternativa con filtro mese
- [x] Editor post: titolo interno, testo (con contatore caratteri), URL immagine, multi-canale, data/ora, stato
- [x] Canali: Instagram, Facebook, LinkedIn, TikTok, X, Google Business
- [x] Stato workflow: bozza → pianificato → pubblicato (senza Meta API — pubblicazione manuale)
- [x] Note interne non pubblicate
- [x] **AI social post generator** — bottone "✨ Genera con AI" nell'editor post; modal con tema/brief + tono (4 opzioni); genera testo ottimizzato per canale via Claude Haiku; anteprima + "Usa testo" o "Rigenera"; limite 20 gen/mese per azienda (configurabile `AI_MONTHLY_LIMIT`). Usa `fetch` nativo → `POST https://api.anthropic.com/v1/messages`. Richiede `ANTHROPIC_API_KEY` su Railway.
- **Migration da eseguire su Supabase:** `034_piano_editoriale.sql`

### Form builder ✅ 2026-05-16
- [x] Lista form con toggle attivo/disattivo
- [x] Editor campi: testo, email, tel, numero, textarea, select (con opzioni), checkbox, data
- [x] Ogni campo: label, placeholder, obbligatorio, riordina su/giù
- [x] Ogni invio → lead automatico in CRM se campo email presente
- [x] Email notifica admin configurabile
- [x] URL redirect post-invio configurabile
- [x] Embed via iframe (`/form?token=...`) + codice copiabile
- [x] Tabella risposte con export CSV
- **Migration da eseguire su Supabase:** `033_form_builder.sql`

### Proposals / Preventivi digitali ✅ 2026-05-16
- [x] Builder preventivo brandizzato (voci, prezzi, IVA, scadenza)
- [x] Link condivisibile → cliente vede + accetta online con firma nome
- [x] Admin: lista filtrata per stato, editor voci con totali live
- [x] Stato workflow: bozza → inviato → accettato / rifiutato / scaduto
- [x] Webhook `preventivo_accettato` agganciato all'accettazione
- **Migration da eseguire su Supabase:** `032_preventivi.sql`
- [ ] Firma digitale + collegamento Stripe (futuro)

---

## ROADMAP — Tier 3: Platform 🟢

### Generalizzazione entità (v2 — meno complessa del previsto)
Le entità struttura/ristorante/attività sono quasi identiche strutturalmente.
Il refactor verso "Business" generico richiede principalmente:
- Rinominare label nell'UI (non nel DB — retrocompatibile)
- Aggiungere "tipo business" configurabile all'onboarding
- Request types configurabili (non hardcoded reception/pulizie/manutenzione)
- Terminologia: "ospite" → "cliente" ovunque

### Terminologia da aggiornare (bassa priorità, alto impatto per worldwide)
- [ ] "Ospite" → "Cliente" nei testi visibili
- [ ] Request types: reception/manutenzione/pulizie → configurabili per business type
- [ ] "Struttura" → label configurabile ("Studio", "Sede", "Negozio", ecc.)

### White-label
- [ ] Custom branding (logo, colori, dominio) per rivenditori
- [ ] Sub-account: agenzia gestisce N clienti
- [ ] Reseller dashboard

### Client portal
- [ ] Login cliente → vede prenotazioni, fatture, documenti

### E-commerce base ✅ 2026-05-17
- [x] Catalogo prodotti + carrello + checkout (Stripe opzionale, COD fallback)
- [x] Loyalty & Gift Card integrate nel checkout

### Two-way inbox
- [ ] Inbox unificata (form contatti + chatbot + WhatsApp) in admin

---

## Azioni manuali da fare (Francesco)

### Migration SQL (eseguire su Supabase Dashboard → SQL Editor)

- [x] Migration pipeline kanban: `ALTER TABLE contatti ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'lead';`
- [x] **Migration webhooks** (`028_webhooks`) — eseguita 2026-05-16
- [x] **029_automazioni.sql** — tabelle `automazioni` + `automazioni_log` ✅ 2026-05-16
- [x] **030_recensioni.sql** — tabella `recensioni` + colonne token su prenotazioni ✅ 2026-05-16
- [x] **031_signup.sql** — colonne `trial_ends_at`, `subscription_status`, `signup_enabled` su aziende ✅ 2026-05-16
- [x] **032_preventivi.sql** — tabella `preventivi` ✅ 2026-05-16
- [x] **033_form_builder.sql** — tabelle `form_builder` + `form_submissions` ✅ 2026-05-16
- [x] **034_piano_editoriale.sql** — tabella `piano_editoriale` ✅ 2026-05-16
- [ ] **035_domini.sql** — tabella `domini` (sottodomini + domini custom)
- [x] **036_shop.sql** — tabelle `prodotti` + `ordini` ✅ eseguita 2026-05-17
- [x] **037_content_studio.sql** — colonna `content_strategy` su aziende ✅ eseguita 2026-05-17
- [x] **038_survey.sql** — tabella `survey_risposte` ✅ eseguita 2026-05-17
- [ ] **039_google_calendar.sql** — colonna `google_calendar_token` su aziende + `google_event_id` su prenotazioni ⚠️
- [ ] **040_loyalty.sql** — tabelle `loyalty_programs`, `loyalty_points`, `gift_cards` + colonne su ordini ⚠️

### Infrastruttura

- [ ] Upgrade Supabase Pro ($25/mese)
- [ ] Upgrade Vercel Pro ($20/mese)
- [ ] Acquisto dominio + configurazione (checklist in server/CLAUDE.md)
- [ ] Creare account Stripe (quando si vuole sbloccare pagamenti — Sprint 8)
- [ ] Collegare GitHub → Vercel per auto-deploy

---

*Aggiornare questo file a inizio sessione quando si completano feature o cambia la priorità.*
