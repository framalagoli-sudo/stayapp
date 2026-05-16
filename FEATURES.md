# FEATURES — Roadmap prodotto StayApp

Documento vivo. Aggiornato sessione per sessione.
Ultima revisione: **2026-05-16** (Sprint 5-7 completi — deploy Vercel live)

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

### Sprint 8 — Stripe payments booking/eventi (2-3 ore + account Stripe) 🔴
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

### E-commerce base
- [ ] Catalogo prodotti + carrello + checkout Stripe

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

### Infrastruttura

- [ ] Upgrade Supabase Pro ($25/mese)
- [ ] Upgrade Vercel Pro ($20/mese)
- [ ] Acquisto dominio + configurazione (checklist in server/CLAUDE.md)
- [ ] Creare account Stripe (quando si vuole sbloccare pagamenti — Sprint 8)
- [ ] Collegare GitHub → Vercel per auto-deploy

---

*Aggiornare questo file a inizio sessione quando si completano feature o cambia la priorità.*
