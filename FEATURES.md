# FEATURES — Roadmap prodotto StayApp

Documento vivo. Aggiornato sessione per sessione.
Ultima revisione: **2026-05-15** (visione allargata worldwide + UX admin upgrade + analisi gap vs GoHighLevel)

---

## Come leggere questo file

- `[ ]` — da fare
- `[~]` — parzialmente implementato / fondamenta presenti
- `[x]` — completato
- Priorità: 🔴 Alta · 🟡 Media · 🟢 Bassa

---

## Visione prodotto (aggiornata 2026-05-15)

**StayApp NON è solo per l'hospitality italiana.**
È una piattaforma SaaS worldwide "business in a box" per qualsiasi business di servizi:
hotel, ristoranti, attività, ma anche **aziende, freelancer, studi professionali, agenzie, palestre, coach, negozi** — qualsiasi business che vuole gestire clienti, prenotazioni, marketing e comunicazione da un'unica piattaforma senza dipendere da web agency.

**Competitor principali:** GoHighLevel · HubSpot · WordPress · Wix/Squarespace · Webflow

**Vantaggio unico:** PWA installabile via QR code — nessun competitor lo fa in modo integrato.

---

## Target verticali (attuali e futuri)

| Vertical | Modulo attuale | Stato |
|---|---|---|
| Hotel / B&B / Agriturismo | `struttura` | ✅ core |
| Ristorante / Bar / Pizzeria | `ristorante` | ✅ core |
| Attività / Esperienza / Tour | `attivita` | ✅ core |
| Centro sportivo / Padel | `attivita` + booking | estendibile |
| Palestra / Fitness | nuovo modulo | abbonamenti + classi |
| Studio medico / Dentista | nuovo modulo | booking slot + paziente |
| Freelancer (avvocato, coach, consulente) | nuovo modulo | portfolio + proposals |
| Agenzia marketing | nuovo modulo | multi-cliente, white-label |
| Spa / Centro benessere | interno a struttura | booking trattamenti |
| Coworking | nuovo modulo | booking postazioni/sale |
| Scuola / Formazione | nuovo modulo | iscrizioni corsi |
| Negozio / E-commerce | nuovo modulo | catalogo + checkout |

---

## Stato implementazione attuale ✅

### Admin panel
- [x] Login + 2FA TOTP (Google Authenticator / Authy)
- [x] Password reset via email
- [x] Dashboard con KPI, richieste aperte, prenotazioni oggi, contatti recenti, entity cards
- [x] Sidebar con icone, raggruppamento visivo, booking sub-menu collassabile
- [x] Breadcrumb navigazione su tutte le pagine admin
- [x] Analytics con grafici SVG (range 7/30/90gg)
- [x] Gestione aziende, strutture, ristoranti, attività (CRUD)
- [x] Minisito drag-and-drop (struttura/ristorante/attività)
- [x] Page builder CMS (23 tipi blocchi, drag & drop, SEO, header/footer configuratore)
- [x] Chatbot visual builder (decision tree, preview live)
- [x] Booking risorse (slot/coperti, calendario, promozioni, cancellazione self-service)
- [x] Newsletter (4 template, double opt-in, schedulazione, test, archivio pubblico)
- [x] Contatti CRM (filtri, tag, add/edit)
- [x] Blog & News (editor Tiptap, categorie)
- [x] Eventi (CRUD, prenotazioni, export CSV)
- [x] Richieste ospiti + Prenotazioni separate
- [x] Audit log (tabella + middleware + pagina admin)
- [x] Gestione staff (invito email, permessi granulari, selezione entità, ban/elimina)
- [x] QR Code generatore
- [x] Sicurezza: helmet, rate limiting, CORS, zod validation
- [x] Backup notturno Railway → Cloudflare R2 (03:00 UTC, retention 30gg)

### Guest PWA + Minisito
- [x] PWA struttura (/s/:slug), ristorante (/r/:slug), attività (/a/:slug)
- [x] ChatbotWidget (PWA=absolute, landing=fixed)
- [x] BookingWidget pubblico
- [x] Privacy/GDPR auto-generate per tutte le entità
- [x] CookieBanner (Portal, localStorage key cookie_consent_v2)

---

## ROADMAP — Tier 1: Revenue & Sales Enablers 🔴
*Senza questi non si compete con GoHighLevel/HubSpot*

### A. Stripe Payments (già installato, da integrare)

- [ ] 🔴 **Checkout booking risorse** — Stripe embedded nel widget pubblico (deposito o totale)
- [ ] 🔴 **Checkout eventi** — pagamento alla prenotazione evento
- [ ] 🔴 **Link di pagamento rapido** — admin genera link "paga €150" → cliente paga online (fondamentale per freelancer)
- [ ] 🔴 **Webhook Stripe** — conferma automatica prenotazione dopo pagamento
- [ ] 🟡 **Rimborsi** — admin emette rimborso parziale/totale dalla dashboard
- [ ] 🟡 **Abbonamenti ricorrenti** — Stripe Billing per palestre, coworking, SaaS
- [ ] 🟡 **Stripe Connect** — ogni azienda con il proprio account Stripe + commissione piattaforma
- [ ] 🟢 **Fattura PDF automatica** — generata e inviata via email dopo pagamento

### B. CRM Pipeline / Kanban (killer feature GoHighLevel)

- [ ] 🔴 **Pipeline stages** — colonne configurabili drag & drop (Lead → Contattato → Proposta → Chiuso/Perso)
- [ ] 🔴 **Deal value** — valore stimato per ogni lead/opportunità
- [ ] 🔴 **Kanban view** — vista board alternativa alla lista contatti
- [ ] 🟡 **Lead scoring** — punteggio automatico basato su interazioni
- [ ] 🟡 **Activity log per contatto** — storico email/note/interazioni per ogni lead
- [ ] 🟡 **Filtri pipeline** — per stage, valore, assegnato a, data
- [ ] 🟢 **Forecast** — previsione revenue da pipeline aperta

```sql
-- Aggiunta a contatti:
ALTER TABLE contatti ADD COLUMN pipeline_stage text DEFAULT 'lead';
ALTER TABLE contatti ADD COLUMN deal_value numeric DEFAULT 0;
ALTER TABLE contatti ADD COLUMN assigned_to uuid REFERENCES profiles(id);

-- Stages configurabili per azienda (jsonb su aziende)
-- aziende.pipeline_stages jsonb DEFAULT '["lead","contattato","proposta","chiuso_vinto","chiuso_perso"]'
```

### C. Webhooks / API pubblica (unlock enorme → Zapier/Make)

- [ ] 🔴 **Webhook uscente** — `POST /api/webhooks/config` + invio automatico a URL custom su eventi: nuovo_contatto, nuova_prenotazione, nuova_richiesta, pagamento_ricevuto, ecc.
- [ ] 🔴 **API key management** — admin genera API key per integrazioni esterne
- [ ] 🟡 **Zapier connector** — app Zapier ufficiale (trigger + action)
- [ ] 🟡 **Make/Integromat** — modulo Make ufficiale
- [ ] 🟢 **Documentazione API pubblica** — Swagger/OpenAPI per sviluppatori

### D. Email Automation Sequences

- [ ] 🔴 **Trigger: nuova prenotazione** → email conferma personalizzata (già base, da potenziare)
- [ ] 🔴 **Trigger: N ore prima appuntamento** → reminder automatico
- [ ] 🔴 **Trigger: nuovo contatto/iscrizione** → sequenza benvenuto (email 1 subito, email 2 dopo 3gg, email 3 dopo 7gg)
- [ ] 🔴 **Trigger: post-visita/post-soggiorno** → email follow-up + richiesta recensione
- [ ] 🟡 **Trigger: compleanno** → email automatica se data nascita salvata nel CRM
- [ ] 🟡 **Trigger: re-engagement** → email a contatti inattivi da X giorni
- [ ] 🟡 **Flow builder visuale** — editor drag & drop sequenze (nodi trigger → condizione → azione)
- [ ] 🟢 **A/B test subject** — test automatico su 2 varianti oggetto

```sql
automazioni (
  id, azienda_id, entity_tipo, entity_id,
  nome text, attiva boolean DEFAULT true,
  trigger text,         -- 'nuova_prenotazione'|'pre_appuntamento'|'post_visita'|'nuovo_contatto'|'compleanno'|'re_engagement'
  trigger_config jsonb, -- { ore_prima: 24 } | { giorni_dopo: 1 } | { giorni_inattivita: 60 }
  steps jsonb,          -- [{ delay_giorni: 0, subject: '...', content: {...} }, ...]
  created_at, updated_at
)
```

---

## ROADMAP — Tier 2: Marketing & Growth 🟡

### E. Social Media Integrations

#### E1. Tracking & Pixel (1-2 ore, zero approvazioni esterne)
- [ ] 🔴 **Meta Pixel** — campo `meta_pixel_id` in minisito settings → iniettato nell'`<head>` della landing. Retargeting Facebook/Instagram + conversioni.
- [ ] 🔴 **Google Analytics 4** — campo `ga4_id` → script iniettato. Analytics traffico completo.
- [ ] 🔴 **Google Tag Manager** — campo `gtm_id` → container unico, copre tutto il resto.
- [ ] 🟡 **TikTok Pixel** — stesso pattern, per chi fa ads TikTok.

```json
// tracking_cfg in minisito jsonb:
{
  "meta_pixel_id": "1234567890",
  "ga4_id": "G-XXXXXXXXXX",
  "gtm_id": "GTM-XXXXXXX",
  "tiktok_pixel_id": ""
}
```

#### E2. WhatsApp Business API (1-2 giorni, 1000 conv/mese gratis)
- [ ] 🟡 **Messaggio conferma prenotazione** → WhatsApp automatico via Meta Cloud API o Twilio
- [ ] 🟡 **Reminder 24h prima** → WhatsApp
- [ ] 🟡 **Follow-up post-visita** → WhatsApp
- [ ] 🟢 **Template manager** — admin configura i template WhatsApp approvati da Meta
- [ ] 🟢 **Two-way WhatsApp inbox** — risposte dei clienti in un'unica inbox admin

#### E3. Social Embeds nel Page Builder
- [ ] 🟡 **Blocco "Post Instagram"** — oEmbed da URL, si aggiorna automaticamente
- [ ] 🟡 **Blocco "Video TikTok"** — oEmbed da URL
- [ ] 🟡 **Blocco "Feed social"** — widget embed (ultimi N post da pagina Facebook/Instagram)

#### E4. Social Posting Scheduler (richiede Meta App Review — settimane)
- [ ] 🟢 **Connessione pagina Facebook/Instagram** — OAuth Meta Graph API
- [ ] 🟢 **Crea e schedula post** — testo + immagine + data/ora → pubblicato automaticamente
- [ ] 🟢 **Calendario editoriale** — vista mensile dei post programmati
- [ ] 🟢 **Analytics post** — reach, like, commenti (da Graph API)

#### E5. Facebook Lead Ads → CRM (triviale con webhooks già pronti)
- [ ] 🟢 **Webhook Meta Lead Ads** → nuovo lead Facebook → contatto automatico in StayApp CRM
- [ ] 🟢 **LinkedIn Lead Gen** → stesso flusso per LinkedIn

#### E6. Google Business Profile
- [ ] 🟢 **Post aggiornamenti** → pubblica "offerta del giorno" direttamente da admin su Google Business
- [ ] 🟢 **Leggi e rispondi recensioni Google** → inbox admin
- [ ] 🟢 **Sincronizza orari e info** → aggiornamento automatico

### F. Reviews & Reputation Management

- [ ] 🟡 **Raccolta recensioni post-visita** — form breve (stelle + commento) via email/link
- [ ] 🟡 **Smart redirect** — se ≥4 stelle → Google/TripAdvisor; se <4 → form privato per gestire il problema
- [ ] 🟡 **Widget recensioni nel minisito** — mostra le recensioni raccolte (con stelle)
- [ ] 🟡 **Dashboard recensioni** — admin vede trend, media, commenti
- [ ] 🟢 **Reply pubbliche** — admin risponde alle recensioni dalla piattaforma
- [ ] 🟢 **Import recensioni Google** — portare recensioni esistenti nel widget

### G. Form Builder

- [ ] 🟡 **Form drag & drop** — admin costruisce form con campi custom (testo, email, tel, select, checkbox, file)
- [ ] 🟡 **Logica condizionale** — "se risponde X mostra campo Y"
- [ ] 🟡 **Embed ovunque** — codice snippet da incollare in qualsiasi sito
- [ ] 🟡 **Blocco form nel page builder** — integrato nel CMS già esistente
- [ ] 🟡 **Risultati in CRM** — ogni invio → nuovo contatto/lead in StayApp
- [ ] 🟢 **Notifica email** — admin riceve email a ogni invio form
- [ ] 🟢 **Webhook per form** — manda dati a Zapier/Make

### H. Proposals & Preventivi Digitali (fondamentale per freelancer/agenzie)

- [ ] 🟡 **Crea preventivo** — admin compone preventivo brandizzato (voci, quantità, prezzi, note, scadenza)
- [ ] 🟡 **Link condivisibile** — cliente apre URL → vede preventivo → clicca "Accetto"
- [ ] 🟡 **Firma digitale** — checkbox accettazione + email di conferma
- [ ] 🟡 **Collegamento Stripe** — cliente accetta + paga direttamente dal preventivo
- [ ] 🟡 **PDF download** — genera PDF del preventivo accettato (fattura pro-forma)
- [ ] 🟢 **Template preventivi** — salva strutture riutilizzabili
- [ ] 🟢 **Scadenza + reminder** — avvisa cliente se preventivo non accettato entro X giorni

---

## ROADMAP — Tier 3: Platform Maturity 🟢

### I. White-Label (modello agenzia → rivenditore)

- [ ] 🟢 **Custom branding** — logo, colori, dominio custom per ogni rivenditore
- [ ] 🟢 **Sub-account** — ogni agenzia gestisce N clienti indipendenti
- [ ] 🟢 **Reseller dashboard** — agenzia vede tutti i suoi clienti + fatturazione
- [ ] 🟢 **Prezzi custom** — agenzia imposta il proprio prezzo al cliente finale
- [ ] 🟢 **Email branded** — email di sistema con dominio dell'agenzia

### J. Client Portal (rivoluzionario per freelancer/agenzie)

- [ ] 🟢 **Login cliente** — il cliente di un'azienda StayApp ha la sua area riservata
- [ ] 🟢 **Vedi prenotazioni** — storico e prossime prenotazioni
- [ ] 🟢 **Vedi fatture/preventivi** — scarica PDF, paga online
- [ ] 🟢 **Documenti condivisi** — l'admin carica file → il cliente li vede
- [ ] 🟢 **Messaggi** — canale di comunicazione diretto admin ↔ cliente

### K. E-Commerce Base

- [ ] 🟢 **Catalogo prodotti** — nome, descrizione, prezzo, foto, varianti
- [ ] 🟢 **Carrello + checkout Stripe** — acquisto diretto dal minisito
- [ ] 🟢 **Gestione ordini** — admin vede ordini, cambia stato, notifica cliente
- [ ] 🟢 **Prodotti digitali** — download file dopo pagamento (PDF, template, corsi)
- [ ] 🟢 **Codici sconto** — coupon con % o importo fisso

### L. Two-Way Inbox (GoHighLevel "Conversations")

- [ ] 🟢 **Inbox unificata** — tutte le comunicazioni in un posto: email form, chatbot, WhatsApp, SMS
- [ ] 🟢 **Rispondi da admin** — reply direttamente dall'inbox senza uscire dalla piattaforma
- [ ] 🟢 **Assegna a staff** — conversazione → assegnata a membro del team
- [ ] 🟢 **Storico per contatto** — tutte le conversazioni legate al profilo CRM del cliente

---

## Feature esistenti da completare/potenziare

### Booking risorse (potenziamento)
- [ ] 🟡 **Email/WhatsApp reminder** — N ore prima configurabile per risorsa
- [ ] 🟡 **Lista d'attesa** — se slot pieno, cliente entra in lista
- [ ] 🟡 **Ricorrenza** — prenotazione settimanale fissa
- [ ] 🟢 **Sync Google Calendar** — iCal export per il professionista
- [ ] 🟢 **Buffer tra slot** — tempo pulizia/preparazione tra appuntamenti

### CRM avanzato
- [ ] 🟡 **Storico cliente** — visite, spesa totale, servizi usati
- [ ] 🟡 **Lifetime value** — ricavo totale per cliente
- [ ] 🟡 **Import CSV** — caricamento contatti in bulk
- [ ] 🟡 **Segmentazione automatica** — tag VIP, frequente, inattivo
- [ ] 🟢 **Loyalty points** — punti per acquisto/visita, rewards

### Analytics avanzate
- [ ] 🟡 **Revenue analytics** — ricavi per entità, periodo, canale
- [ ] 🟡 **Tasso conversione** — visite minisito → prenotazione
- [ ] 🟡 **Occupancy** — tasso occupazione risorse nel tempo
- [ ] 🟢 **Export CSV/Excel** — per tutte le liste
- [ ] 🟢 **Confronto periodi** — questo mese vs stesso mese anno scorso

### Multi-lingua
- [ ] 🟡 **EN/DE/FR/ES PWA ospite** — schermate guest tradotte
- [ ] 🟡 **Rilevamento automatico** — lingua dal browser
- [ ] 🟡 **Contenuti multilingua** — admin inserisce testi in più lingue
- [ ] 🟢 **Email multilingua** — template nella lingua del cliente

### Sicurezza — In corso
- [x] ✅ helmet.js + rate limiting + CORS + zod (2026-05-13)
- [x] ✅ Backup notturno R2 (2026-05-14)
- [x] ✅ 2FA TOTP (2026-05-14)
- [x] ✅ Audit log (2026-05-14)
- [x] ✅ Gestione staff + permessi (2026-05-14)
- [ ] 🟡 Upgrade Supabase Pro ($25/mese) — azione manuale
- [ ] 🟡 Upgrade Vercel Pro ($20/mese) — azione manuale
- [ ] 🟡 WAF Cloudflare (Free → regole OWASP)
- [ ] 🟡 Monitoring: Sentry + BetterUptime

### Infrastruttura
- [ ] 🟡 **GitHub → Vercel auto-deploy** — CI/CD automatico
- [ ] 🟡 **Notifiche real-time** — Supabase Realtime su richieste (badge sidebar)
- [ ] 🟡 **Dominio custom** — acquisto + configurazione (checklist in server/CLAUDE.md)

---

## Ordine di sviluppo consigliato (prossimi sprint)

```
Sprint 1 — Tracking pixel (1-2 ore, alto impatto immediato)
  → Meta Pixel + GA4 + GTM nei settings minisito

Sprint 2 — Stripe payments (2-3 sessioni)
  → Checkout booking + eventi + link pagamento rapido
  → Webhook conferma automatica

Sprint 3 — CRM Pipeline kanban (1-2 sessioni)
  → Aggiunta pipeline_stage ai contatti
  → Vista kanban drag & drop

Sprint 4 — Webhooks / API (1 sessione)
  → Endpoint webhook uscente
  → API key management

Sprint 5 — Email automation (2-3 sessioni)
  → Trigger: conferma prenotazione, reminder, follow-up
  → Builder sequenze base

Sprint 6 — Reviews & Reputation (1-2 sessioni)
  → Form raccolta recensioni
  → Smart redirect + widget minisito

Sprint 7 — Proposals/Preventivi (2 sessioni)
  → Builder preventivo + link condivisibile + firma + Stripe

Sprint 8 — WhatsApp Business API (1-2 sessioni)
  → Messaggi automatici conferma + reminder

Sprint 9 — Social Pixel (se non fatto in Sprint 1)
  → Già descritto sopra

Sprint 10 — White-label + Client portal (3+ sessioni)
  → Modello agenzia rivenditrice
```

---

*Aggiornare questo file a inizio sessione quando si completano feature o cambia la priorità.*
