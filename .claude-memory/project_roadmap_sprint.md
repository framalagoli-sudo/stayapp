---
name: project-roadmap-sprint
description: "Roadmap sprint prodotto + Piano tecnico 6 fasi. Fase 2 (Railway→Vercel) COMPLETA."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

**Why:** Francesco vuole espandere OltreNova con feature ad alto impatto, partendo dalla monetizzazione e dalla stabilità tecnica.
**How to apply:** Quando Francesco chiede cosa fare dopo, proporre il prossimo sprint in lista. Il piano tecnico va eseguito in ordine prima di aggiungere nuove feature prodotto.

---

## PIANO TECNICO — 6 fasi

### FASE 1 — Debug funzionale completo 🔴 (IN CORSO)

Smoke test = le pagine caricano. Debug = le funzioni funzionano davvero.
Test voce per voce in produzione su oltrenova.com.

**Sezioni da verificare (spuntare man mano):**
- Operativo: Dashboard, Richieste, Prenotazioni, Booking, Recensioni, Survey, Contatti, Newsletter, Automazioni, Blog, Piano editoriale, Content Studio, AI Site Builder, Preventivi, Form Builder, Shop, Loyalty, Eventi
- Account & Config: Analytics, QR Code, Collaboratori, Integrazioni, SEO/GEO, Audit log, Impostazioni, Sicurezza
- Super_admin: Aziende, Strutture, Ristoranti, Attività, Utenti
- Sito & App: struttura/ristorante/attività × Info / PWA / Sito web / Domini
- Pubblico: PWA ×3, Landing ×3, Privacy, Form contatto, Booking widget, Shop widget

**Fix già fatti in Fase 1:**
- AttivitaApp.jsx useSearchParams fix ✅ (2026-06-10b)
- ExternalLink mancante in AiSiteBuilderPage ✅ (2026-06-14)
- maxDuration=60 su tutte e 7 le route AI ✅ (2026-06-14)
- BOM fix sistematico su tutte le env var critiche ✅ (2026-06-14)
- Icone PWA (icon-192, icon-512, apple-touch-icon, favicon.svg) migrate Vite→Next.js ✅ (2026-06-14)

### FASE 2 — Migrazione Railway → Vercel ✅ COMPLETA (2026-06-14)

Tutto migrato. Railway freezato. Stack: Vercel Pro + Supabase only.
Dettagli in [[project-session-railway-migration]].

### FASE 3 — Sicurezza 🔴

**Rate limiting (mancante su route pubbliche Next.js):**
- `/api/guest/contact` — max 5 req/IP/ora
- `/api/guest/book` — max 10 req/IP/ora
- `/api/contatti/subscribe` — max 3 req/IP/ora
- `/api/auth/forgot-password` — max 3 req/IP/ora
- `/api/ai/*` — aggiungere IP rate limit (già ha per-azienda)

**Form security già attivo (Sprint A-D 2026-06-13):**
- Honeypot, rate limit per form, flood alert, spam filter, bounce webhook ✅
- Email validation Abstract API (attiva se `ABSTRACT_API_KEY` presente) ✅
- Resend bounce webhook configurato ✅

**Headers di sicurezza (da aggiungere in `next.config.js`):**
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

**Cloudflare Bot Fight Mode**: 1 click nel dashboard CF → Security → Bots → ON (gratis, non fatto)

### FASE 4 — Backup 🟡

**Supabase Pro** (se non ancora upgradato): backup giornalieri automatici + PITR 7gg.
**Backup notturno R2** (`/api/cron/backup`) già attivo su Vercel Cron.

**Backup per singola azienda (da implementare):**
- Endpoint `POST /api/admin/backup/azienda/:id` (solo super_admin)
- ZIP con JSON per tabella filtrati per `azienda_id`
- UI super_admin: bottone "Esporta dati" nella pagina dettaglio azienda

### FASE 5 — CI/CD e Automazioni 🟡

**GitHub Actions:** workflow `ci.yml` su ogni push → build → smoke test (ora manuale con deploy.ps1)
**Monitoring uptime:** Betteruptime/UptimeRobot (free) — non ancora configurato
**Sentry:** codice già presente, manca solo `SENTRY_DSN` su Vercel env vars

### FASE 6 — Best practices 🟢

| Pratica | Stato |
|---|---|
| Error tracking (Sentry) | codice pronto, manca DSN su Vercel |
| Uptime monitoring | da configurare |
| CI/CD automatico (GitHub Actions) | da configurare |
| GitHub → Vercel auto-deploy | da collegare |
| Vercel Analytics | incluso in Pro, da attivare |

---

## Sprint prodotto

### Sprint 10 — Stripe Subscription Billing 🔴 (prossimo)
- Checkout piani mensili (base/standard/premium)
- Webhook Stripe → aggiorna subscription_status su aziende
- Banner scadenza trial → upgrade
- Dashboard super_admin: lista abbonamenti + MRR
- *Stripe già installato nel codice, trial/subscription_status già nel DB*

### Sprint 11 — Stripe payments (booking/eventi) 🟡
- Checkout booking risorse, eventi, link pagamento rapido

### Sprint 12 — WhatsApp Business API + Push PWA 🟡

### Sprint 13 — CRM avanzato + A/B test newsletter 🟢

### Sprint 14 — Automazioni con branch logic (if/else) 🟢

### Sprint 15 — Digital check-in + upsell engine 🟢

### Sprint 16 — Multi-lingua IT/EN/DE 🟢

---

## Google Calendar — azione manuale pendente
`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` da aggiungere su **Vercel** (non più Railway).
Redirect URI da aggiornare su Google Cloud Console: `https://oltrenova.com/api/google-calendar/callback`
