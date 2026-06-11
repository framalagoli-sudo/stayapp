---
name: project-roadmap-sprint
description: Roadmap sprint prodotto (10-15) + Piano tecnico 6 fasi (debug→migrazione→sicurezza→backup→CI/CD→best practices)
metadata: 
  node_type: memory
  type: project
  originSessionId: cec93190-01ca-4d21-8dee-f2fbb856e166
---

Analisi comparativa vs GoHighLevel, Klaviyo, Mailchimp, HubSpot, ActiveCampaign. Sprint pianificati in ordine.
Piano tecnico 6 fasi concordato 2026-06-10, dettagliato in FEATURES.md sezione "PIANO TECNICO".

**Why:** Francesco vuole espandere StayApp con feature ad alto impatto, partendo dalla monetizzazione E dalla stabilità tecnica.
**How to apply:** Quando Francesco chiede cosa fare dopo, proporre il prossimo sprint in lista. Il piano tecnico va eseguito in ordine (Fase 1 → 2 → 3 → ...) prima di aggiungere nuove feature prodotto.

---

## PIANO TECNICO — 6 fasi (accordato 2026-06-10)

### FASE 1 — Debug funzionale completo 🔴 (IN CORSO)

Smoke test = le pagine caricano. Debug = le funzioni funzionano davvero.
Test voce per voce in produzione su oltrenova.com.

**Sezioni da verificare:**
- Operativo: Dashboard, Richieste, Prenotazioni, Booking, Recensioni, Survey, Contatti, Newsletter, Automazioni, Blog, Piano editoriale, Content Studio, AI Site Builder, Preventivi, Form Builder, Shop, Loyalty, Eventi
- Account & Config: Analytics, QR Code, Collaboratori, Integrazioni, SEO/GEO, Audit log, Impostazioni, Sicurezza
- Super_admin: Aziende, Strutture, Ristoranti, Attività, Utenti
- Sito & App: struttura/ristorante/attività × Info / PWA / Sito web / Domini
- Pubblico: PWA ×3, Landing ×3, Privacy, Form contatto, Booking widget, Shop widget

**Fix già fatti in Fase 1:**
- AttivitaApp.jsx useSearchParams fix ✅ (sessione 06-10b)

### FASE 2 — Migrazione Railway → Vercel API Routes 🔴

Elimina Railway ($5/mese), tutto su Vercel. Express → Next.js API routes.

**Ordine:**
1. Middleware auth condiviso (`lib/auth-middleware.ts`)
2. Route leggere: `auth.js`, `health`
3. Route CRUD: `properties`, `ristoranti`, `attivita`, `contatti`
4. Route complesse: `booking`, `newsletter`, `eventi`
5. Upload (`/api/upload/*`) — Vercel limite 4.5MB body; valutare Vercel Blob
6. Scheduler (`runScheduledSends`, `runAutomazioniScheduler`) → Vercel Cron Jobs
7. Backup R2 → Vercel Cron Job notturno
8. Rimuovi Railway, aggiorna env vars su Vercel

**Note:** Vercel serverless = stateless, no `setInterval`. Timeout max 60s (Pro).

### FASE 3 — Sicurezza 🔴

**Rate limiting (mancante su route pubbliche):**
- `/api/guest/contact` — max 5 req/IP/ora
- `/api/guest/book` — max 10 req/IP/ora
- `/api/contatti/subscribe` — max 3 req/IP/ora
- `/api/auth/forgot-password` — max 3 req/IP/ora
- `/api/ai/*` — aggiungere anche IP rate limit

**Headers di sicurezza (Next.js `next.config.js`):**
- `Content-Security-Policy` — whitelist domini (Supabase, Resend, Stripe, Google)
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disabilita camera/mic/geolocation non usati

**Input validation:**
- Audit campi liberi nelle route pubbliche (XSS, injection)
- Estendere validazione zod a tutte le route

**Audit accessi:**
- Rotazione periodica `SUPABASE_SERVICE_ROLE_KEY` (reminder ogni 90gg)
- Alert automatico su N login falliti per stesso account
- Verifica RLS attiva su tutte le tabelle pubbliche

### FASE 4 — Backup 🟡

**Supabase Pro** (già incluso): backup giornalieri automatici + PITR 7gg. Restore = intero DB.

**Backup per singola azienda (da implementare):**
- Endpoint `POST /api/admin/backup/azienda/:id` (solo super_admin)
- Esporta tutte le tabelle filtrate per `azienda_id` in ZIP (un JSON per tabella)
- Upload automatico su R2 con path `backups/aziende/{azienda_id}/{timestamp}.zip`
- UI super_admin: bottone "Esporta dati" nella pagina dettaglio azienda
- Retention: ultimi 30 backup per azienda

**Backup notturno R2 già attivo** (`server/lib/backup.js`) — estendibile.

### FASE 5 — CI/CD e Automazioni di routine 🟡

**GitHub Actions:**
- Workflow `ci.yml`: su ogni push → build Next.js → deploy preview Vercel → smoke test
- Badge stato CI nel README
- Alert email/Telegram se smoke test fallisce su main

**Monitoring uptime:**
- Betteruptime o UptimeRobot (free) — check ogni 5 min su `oltrenova.com` e `api.oltrenova.com/api/health`

**Sentry (codice già presente, manca DSN):**
- Crea account sentry.io free → 2 progetti (Node.js + Next.js)
- `SENTRY_DSN` su Railway (o Vercel post-migrazione), `VITE_SENTRY_DSN` su Vercel
- Alert su error rate > 5% in 5 minuti

**AI agent per verifiche di routine:**
- Cron giornaliero: verifica che tutte le landing rispondano 200
- Cron settimanale: controlla super_admin non autorizzati
- Cron mensile: report performance AI-generato → email Francesco
- Alert se prenotazione non ha ricevuto email conferma entro 5 min

### FASE 6 — "Cosa fanno i grandi" 🟢

| Pratica | Tool | Stato |
|---|---|---|
| Error tracking | Sentry | codice pronto, manca DSN |
| Uptime monitoring | Betteruptime/UptimeRobot | da configurare |
| Structured logging | Winston/Pino su Railway | da aggiungere |
| CI/CD automatico | GitHub Actions | da configurare |
| Feature flags | growthbook.io (free) | futuro |
| Backup verificati | test restore mensile | da automatizzare |
| Security scanning | Snyk (free tier) | da configurare su GitHub |
| Dependency audit | `npm audit` in CI | da aggiungere |
| Performance | Vercel Analytics (già incluso in Pro) | da attivare |
| Alerting | Telegram bot o email | da configurare |

---

## Sprint prodotto (dopo il Piano Tecnico)

### Sprint 10 — Stripe Subscription Billing 🔴 (monetizzazione)
Stripe già installato ma non integrato. Trial/subscription_status già nel DB.
- Checkout piani mensili (base/standard/premium)
- Webhook Stripe → aggiorna subscription_status
- Banner scadenza trial → upgrade
- Gestione rinnovo, cancellazione, downgrade
- Dashboard super_admin: lista abbonamenti + MRR

### Sprint 11 — Stripe payments (booking/eventi) 🟡
- Checkout booking risorse (deposito o totale)
- Checkout eventi
- Link pagamento rapido (admin genera link → cliente paga)
- Webhook Stripe → aggiorna stato prenotazione

### Sprint 12 — WhatsApp Business API + Push notification PWA
- WhatsApp: Twilio API, canale dominante in Italia
- Push notification: Web Push (service worker) — PWA già installabile

### Sprint 13 — Segmentazione avanzata CRM + A/B test newsletter
- Filtri comportamentali contatti
- Lead scoring automatico
- A/B test oggetto newsletter (20%+20%, vince chi ha più aperture)

### Sprint 14 — Automazioni con branch logic (if/else)
- Upgrade automazioni attuali (ora lineari A→B→C)
- Condizioni: se ha prenotato / non ha aperto email / ha lasciato recensione
- Editor visuale con rami

### Sprint 15 — Digital check-in + upsell engine
- Digital check-in: cliente compila dati pre-arrivo, firma GDPR, carica documento
- Upsell engine: durante booking suggerisce extra
- Waitlist: quando risorsa piena, iscrizione con notifica automatica

### Sprint 16 — Multi-lingua IT/EN/DE
- Sblocca mercato internazionale

---

## Feature AI differenzianti (da inserire nei vari sprint)
- **Reporting narrativo AI** — lunedì mattina Claude scrive riassunto performance settimana
- **Analisi sentimento recensioni** — classifica per tema (pulizia, personale, prezzo), trend
- **AI price optimizer** — prezzo ottimale risorse in base a stagione/occupazione storica
- **Generazione social con immagini** — piano editoriale + DALL-E per post completi

## Altre feature medie priorità
- Popup/form comportamentali (exit intent, scroll trigger)
- Storico interazioni contatto (timeline unica)
- QR code menu con ordinazione al tavolo (modulo ristoranti)
- Link prenotazione personale tipo Calendly (freelancer/professionisti)
- Social posting diretto da piano editoriale (Instagram/Facebook API)
