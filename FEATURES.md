# FEATURES — Roadmap prodotto StayApp

Documento vivo. Aggiornato sessione per sessione.
Ultima revisione: **2026-05-15** (CRM kanban, tracking pixels, UX admin, audit terminologia)

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

## Stato implementazione ✅ (aggiornato 2026-05-15)

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

### Sprint 4 — Webhooks / API outbound (~1 ora) 🔴
Sblocca Zapier/Make per tutti gli utenti senza costruire nulla di più.
- [ ] `POST /api/webhooks/config` — salva URL destinazione + eventi da monitorare
- [ ] Invio automatico payload JSON su eventi: nuovo_contatto, nuova_prenotazione, nuova_richiesta, cambio_stage_pipeline
- [ ] API key management — admin genera chiave per integrazioni esterne
- [ ] UI admin: pagina "Integrazioni" con lista webhook attivi + test manuale

### Sprint 5 — Email automation sequences (~mezza giornata) 🔴
- [ ] Trigger: **nuova prenotazione** → email conferma personalizzata
- [ ] Trigger: **N ore prima appuntamento** → reminder automatico
- [ ] Trigger: **nuovo contatto** → sequenza benvenuto (email 1 subito, email 2 dopo 3gg)
- [ ] Trigger: **post-visita** → follow-up + link recensione
- [ ] UI admin: lista automazioni, toggle attiva/disattiva, configurazione delay
- [ ] DB: tabella `automazioni` (trigger, steps jsonb, attiva boolean)

### Sprint 6 — Reviews & Reputation (~1-2 ore) 🟡
- [ ] Form raccolta recensione post-visita (stelle + commento)
- [ ] Smart redirect: ≥4 stelle → Google/TripAdvisor; <4 → form privato
- [ ] Widget recensioni nel minisito (blocco CMS)
- [ ] Dashboard recensioni admin (media, trend, commenti)

### Sprint 7 — Stripe payments (2-3 ore + account Stripe) 🔴
- [ ] Checkout booking risorse (deposito o totale)
- [ ] Checkout eventi
- [ ] Link pagamento rapido (admin genera link "paga €X" → cliente paga)
- [ ] Webhook Stripe → aggiorna stato prenotazione automaticamente
- *Richiede: account Stripe + chiavi API in Railway/Vercel env*

---

## ROADMAP — Tier 2: Marketing & Growth 🟡

### Tracking social (✅ Pixel/GA4/GTM fatto — da completare)
- [ ] **TikTok Pixel** — stesso pattern Meta Pixel
- [ ] **WhatsApp Business API** — messaggi automatici conferma/reminder (Meta Cloud API, 1000 conv/mese gratis)
- [ ] **Social embed blocks** — blocchi oEmbed Instagram/TikTok nel page builder
- [ ] **Facebook Lead Ads → CRM** — webhook Meta → contatto automatico in StayApp (banale con webhooks)
- [ ] **Social posting scheduler** — richiede Meta App Review (settimane)
- [ ] **Google Business Profile** — post aggiornamenti, leggi/rispondi recensioni

### Form builder
- [ ] Form drag & drop con campi custom + logica condizionale
- [ ] Embed ovunque (snippet) + blocco CMS
- [ ] Ogni invio → nuovo lead in CRM

### Proposals / Preventivi digitali (→ rende "In trattativa" azionabile)
- [ ] Builder preventivo brandizzato (voci, prezzi, scadenza)
- [ ] Link condivisibile → cliente vede + accetta online
- [ ] Firma digitale + collegamento Stripe

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

- [x] Migration pipeline kanban: `ALTER TABLE contatti ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'lead';`
- [ ] Upgrade Supabase Pro ($25/mese)
- [ ] Upgrade Vercel Pro ($20/mese)
- [ ] Acquisto dominio + configurazione (checklist in server/CLAUDE.md)
- [ ] Creare account Stripe (quando si vuole sbloccare pagamenti)
- [ ] Collegare GitHub → Vercel per auto-deploy

---

*Aggiornare questo file a inizio sessione quando si completano feature o cambia la priorità.*
