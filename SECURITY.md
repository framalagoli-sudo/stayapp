# StayApp — Sicurezza & GDPR

Documento operativo. Aggiornare ad ogni cambio infrastruttura o nuova feature sensibile.
Ultima revisione: **2026-05-21**

---

## 1. Architettura e responsabilità

| Layer | Provider | SSL/TLS | Responsabile cert |
|---|---|---|---|
| Frontend (SPA) | Vercel | Let's Encrypt auto | Vercel (automatico) |
| Backend API | Railway | Let's Encrypt auto | Railway (automatico) |
| Database | Supabase (PostgreSQL) | TLS 1.2+ sempre attivo | Supabase |
| CDN / WAF | Cloudflare | Full (strict) ← **verificare** | Cloudflare |
| Storage media | Supabase Storage | HTTPS | Supabase |
| Email transazionale | Resend | TLS | Resend |
| Backup notturno | Cloudflare R2 | HTTPS | Cloudflare |

> **⚠️ Azione manuale richiesta:** verificare che Cloudflare → SSL/TLS → Overview sia impostato su **Full (strict)**, non "Full" o "Flexible". "Flexible" non cifra il tratto Cloudflare→Railway.

---

## 2. Sicurezza applicativa implementata

### Header HTTP (`helmet`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (anti-clickjacking)
- `X-XSS-Protection: 0` (disabilitato — i browser moderni gestiscono XSS meglio)
- `Strict-Transport-Security: max-age=15552000` (180 giorni, auto-rinnovo)
- `Referrer-Policy: no-referrer`
- `Cross-Origin-Resource-Policy: cross-origin` (necessario per immagini Supabase Storage)

### CORS
- Whitelist esplicita: `localhost:5173`, `stayapp-henna.vercel.app`, dominio custom + `www`
- Sottodomini `*.stayapp.it` — regex validata
- Domini custom clienti — cache in memoria, refresh ogni 5 minuti da tabella `domini`
- Richieste senza `Origin` (Postman, server-to-server) — permesse intenzionalmente

### Rate limiting
| Limiter | Endpoint | Limite |
|---|---|---|
| `guestLimiter` | `/api/guest/*`, `/api/form-builder/*` | 60 req/min per IP |
| `authLimiter` | `/api/auth/*` | 10 req/15min per IP (anti-brute force) |
| `adminLimiter` | tutti gli endpoint admin | 120 req/min per IP |

### Input validation
- `zod` su tutti gli endpoint pubblici con schema esplicito
- Sanitizzazione `.trim()` su tutti i campi stringa
- `express.json({ limit: '2mb' })` — limita payload size

### Autenticazione
- Supabase Auth (JWT) — token scade ogni 3600s, refresh automatico
- 2FA TOTP opzionale per admin (`/admin/security`)
- Password reset via email Supabase (token monouso, scade 1h)
- Redirect URL whitelist in Supabase Dashboard

### Multi-tenant isolation
- Audit sistematico sprint 8 (2026-05-16): 11 fix su 18 route file
- Ogni query admin aggiunge filtro `azienda_id` — un'azienda non può accedere ai dati di un'altra
- Supabase service role usata **solo server-side** — mai esposta al client
- RLS attiva lato Supabase come seconda linea di difesa

### Audit log
- Ogni `PATCH` / `DELETE` su route admin viene loggato in `audit_log`
- Campi: `user_id`, `action`, `table`, `record_id`, `changes`, `ip`, `timestamp`

---

## 3. Classificazione dati

### Dati personali (GDPR — Reg. UE 2016/679)

| Tabella | Dati personali | Sensibilità | Base giuridica tipica |
|---|---|---|---|
| `contatti` | nome, email, telefono, note | Media | Legittimo interesse / contratto |
| `profiles` | nome, email | Media | Contratto (uso SaaS) |
| `prenotazioni` | guest_name, guest_email, guest_phone | Media | Contratto |
| `recensioni` | nome, email, testo | Bassa | Consenso esplicito |
| `form_submissions` | variabile (dipende dai campi del form) | Variabile | Consenso |
| `event_bookings` | guest_name, guest_email | Media | Contratto |

### Dati aziendali

| Tabella | Dati | Note |
|---|---|---|
| `aziende` | P.IVA, CF, PEC, indirizzo | Dati aziendali, non personali se SRL/SPA |
| `aziende.google_calendar_token` | token OAuth Google | **Credenziale — vedere sezione 5** |

### Dati infrastrutturali (segreti)

Tutti in Railway env vars / Vercel env vars — mai nel codice.

| Segreto | Dove | Rotazione consigliata |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Railway | Annuale o dopo offboarding team |
| `SUPABASE_ANON_KEY` | Vercel | Annuale |
| `RESEND_API_KEY` | Railway | Annuale |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Railway | Annuale |
| `GOOGLE_CLIENT_SECRET` | Railway (da aggiungere) | Mai — a meno di compromissione |
| `STRIPE_SECRET_KEY` | Railway (futuro) | Mai — a meno di compromissione |
| `ANTHROPIC_API_KEY` | Railway | Annuale |

---

## 4. GDPR — Misure implementate

### Consenso
- **CookieBanner** con accettazione esplicita — `localStorage: cookie_consent_v2`
- Checkbox consenso obbligatorio in form contatti e iscrizione newsletter
- Double opt-in newsletter — email di conferma prima di iscrivere

### Informativa
- Privacy policy e cookie policy **auto-generate** per ogni entità da `privacy_data jsonb`
- Link automatici nel footer di ogni minisito
- Titolare e DPO configurabili dall'admin

### Diritti dell'interessato

| Diritto | Stato | Come esercitarlo |
|---|---|---|
| Accesso (Art. 15) | Manuale | Admin vede tutti i dati in CRM/prenotazioni |
| Rettifica (Art. 16) | ✅ | Admin modifica direttamente da CRM |
| Cancellazione (Art. 17) | ✅ | Pulsante "Anonimizza dati (GDPR Art. 17)" in modal contatto |
| Portabilità (Art. 20) | Parziale | Export CSV prenotazioni/contatti disponibile |
| Opposizione (Art. 21) | ✅ | Unsubscribe newsletter con link token |

### Anonimizzazione (Art. 17)
Endpoint `POST /api/contatti/:id/erasure` — sostituisce i dati personali con:
- nome → `Anonimo`
- email → `cancellato-{id8}@gdpr.anonimo`
- telefono → `null`
- note → `null`
- tags → `[]`
- iscritto_newsletter → `false`

Il record viene mantenuto per integrità referenziale. L'operazione è irreversibile.

### Data retention
Non esiste attualmente una policy di pulizia automatica. Dati da considerare per retention:
- `page_views` — considerare `DELETE WHERE viewed_at < NOW() - INTERVAL '1 year'`
- `audit_log` — considerare 2 anni
- `automazioni_log` — considerare 6 mesi

> **TODO:** aggiungere cron job Railway per pulizia automatica (bassa priorità, da fare prima del lancio commerciale).

---

## 5. Token OAuth Google Calendar

Il token OAuth del cliente è salvato in `aziende.google_calendar_token` (JSONB):
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expiry_date": 1234567890000,
  "email": "utente@gmail.com"
}
```

**Rischi e mitigazioni:**
- Il token è accessibile a chiunque abbia accesso alla service role key (solo Railway server)
- Non è esposto via API — nessuna query guest lo include
- In caso di compromissione del DB: revocare il token da Google Console → OAuth → Credentials
- L'utente può disconnettere il proprio account da `/admin/integrazioni` → il token viene azzerato

---

## 6. Azioni manuali richieste (checklist)

- [ ] **Cloudflare SSL → Full (strict)** — verificare e impostare
- [ ] **Aggiungere `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` su Railway** — dopo setup Google Cloud
- [ ] **DPA con Railway** — verificare disponibilità Data Processing Agreement per clienti EU
- [ ] **Cloudflare WAF** — Security → WAF → Managed Rules → attivare Cloudflare Free Ruleset
- [ ] **Rotazione annuale** — agendare rotazione `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`
- [ ] **Data retention cron** — implementare prima del lancio commerciale
- [ ] **Stripe PCI** — quando si attiva billing: verificare di non loggare mai dati di carta, usare solo Stripe.js client-side

---

## 7. Procedure in caso di incidente

### Compromissione credenziali Railway
1. Railway Dashboard → Settings → Variables → ruotare immediatamente `SUPABASE_SERVICE_ROLE_KEY`
2. Supabase Dashboard → Settings → API → regenerate service role key
3. Verificare audit_log per accessi anomali

### Compromissione database
1. Revocare service role key (vedi sopra)
2. Supabase → Pause project temporaneamente se necessario
3. Notificare gli utenti entro 72h (GDPR Art. 33)
4. Verificare quali dati erano accessibili

### Token Google Calendar compromesso
1. Google Console → OAuth → revoca token per l'account specifico
2. Azzerare `google_calendar_token` in `aziende` per l'azienda coinvolta
3. Chiedere al cliente di ricollegare l'account

---

## 8. DPA e sub-processor

| Provider | DPA disponibile | Link |
|---|---|---|
| Supabase | ✅ | supabase.com/privacy |
| Vercel | ✅ | vercel.com/legal/dpa |
| Resend | ✅ | resend.com/legal/dpa |
| Cloudflare | ✅ | cloudflare.com/privacypolicy |
| Railway | Da verificare | railway.app/legal |
| Anthropic | Business plan | anthropic.com/privacy |
| Stripe | ✅ (futuro) | stripe.com/privacy |
