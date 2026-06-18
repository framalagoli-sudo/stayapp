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

### FASE 3 — Sicurezza 🟢 (grosso lavoro fatto 2026-06-16)

**Rate limiting** ✅ FATTO — store condiviso via Postgres (migration `060_rate_limits.sql`,
funzione atomica `check_rate_limit`, lib `client-next/lib/rate-limit.js`, FAIL-OPEN).
Il vecchio limitatore in-memory (Map) NON funzionava su serverless (istanze usa-e-getta).
Applicato a: `/api/auth/forgot-password` (3/h, anti mail-bombing), `/api/guest/contact`
(5/h), `/api/contatti/subscribe` (3/h), form-builder submit (5/h).
⚠️ Richiede esecuzione manuale migration 060 su Supabase per attivarsi (prima è fail-open).
TODO futuro: estendere a `/api/guest/book` e `/api/ai/*`.

**Turnstile (CAPTCHA invisibile Cloudflare)** ✅ LIVE e verificato (2026-06-16) — verifica
server-side (`lib/turnstile.js`) su tutte le route pubbliche + widget client su TUTTI i form.
Chiavi su Vercel: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (0x4AAAAAADlbOrVGDpfHnxkA) + `TURNSTILE_SECRET_KEY`.
Enforcement attivo (403 senza token); utenti veri passano (widget Managed). LEVA D'EMERGENZA:
`TURNSTILE_SOFT=1` su Vercel disattiva il blocco senza perdere lead. Bypass CI: `TURNSTILE_TEST_BYPASS`
(usato in security.spec.js). **Lezione rollout**: il primo deploy NON funzionava perché la Site Key
`NEXT_PUBLIC` non era inlinata per build cache stale → serviva `vercel --prod --force` (vedi [[reference_vercel_env_cli]]).

**Headers di sicurezza** ✅ FATTO in `next.config.js` (verificati live): CSP livello 1
(restringe script-src a self+CF+vercel+maps, blocca framing/object/base, permissiva su
img/connect/frame per non rompere PWA/embed/stili inline), Referrer-Policy,
Permissions-Policy, X-DNS-Prefetch-Control, oltre a nosniff + X-Frame-Options già presenti.
HSTS già attivo via Cloudflare/Vercel.

**Sentry** 🔴 BLOCCATO (17/6) — DSN creato + `SENTRY_DSN` su Vercel + verificato via ingest diretto,
MA l'SDK NON inizializza lato server su Next 14.2 (`sentry_initialized:false` anche con init manuale;
falliti instrumentation, withSentryConfig, downgrade v10→v8.55). Serve sessione dedicata.
Opzioni: wizard completo Next14 / upgrade Next 15 / alternativa leggera (Vercel Log Drains).
Dettagli e stato codice in [[todo_prossima_sessione]] e [[project_session_2026_06_16_security]].
DMARC, rate-limit, Turnstile, header = tutti LIVE.

**DMARC** ⚠️ DA FARE (manuale, solo DNS): oggi `p=none` (non blocca lo spoofing).
Passare a `v=DMARC1; p=quarantine; adkim=r; aspf=r` (poi `p=reject`). Sicuro perché Resend
firma in DKIM allineato (`resend._domainkey.oltrenova.com` presente) → la mail legittima passa.

**Form security già attivo (Sprint A-D 2026-06-13):** honeypot, flood alert, spam filter,
email validation Abstract API, bounce webhook ✅

**Cloudflare Bot Fight Mode**: ✅ FATTO

### FASE 4 — Backup 🟡

**Supabase Pro** (se non ancora upgradato): backup giornalieri automatici + PITR 7gg.
**Backup notturno R2** (`/api/cron/backup`) già attivo su Vercel Cron.

**Backup per singola azienda** ✅ FATTO (17/6):
- `GET /api/admin/backup/azienda/[id]` (super_admin o admin della propria azienda) → JSON scaricabile
- Tutte le tabelle filtrate per azienda (azienda_id diretto + property_id/entity_id/event_id/risorsa_id)
- Bottone "Esporta dati" nella card azienda (AziendePage.jsx, download blob autenticato)

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
