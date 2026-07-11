# StayApp — Sicurezza & GDPR

Documento operativo. Aggiornare ad ogni cambio infrastruttura o nuova feature sensibile.
Ultima revisione: **2026-07-11** (aggiunta §0 procedure rigide codice).

> ⚠️ **Nota architettura:** la §2 "Sicurezza applicativa" descrive il **vecchio backend Express/Railway
> (dismesso)**: `helmet`, CORS middleware, `express-rate-limit`, `zod`, `express.json` **non** esistono
> più. Il backend live è **Next.js su Vercel** (route in `client-next/app/api`). Le regole vere e
> attuali sono nella **§0 qui sotto**. Le §3-8 (GDPR, dati, incident, DPA) restano valide.

---

## 0. 🔒 INVARIANTI E PROCEDURE RIGIDE (codice) — LEGGERE PRIMA

StayApp è **multi-tenant** e il server usa **sempre la service_role key** (bypassa la RLS di Postgres):
**la sicurezza dipende al 100% dai controlli applicativi**. Un errore = dati di un cliente esposti a un
altro. Questi invarianti non sono negoziabili; ogni nuova route passa la checklist.

### Gli INVARIANTI (definizione finita di "sicuro")
Dove possibile ognuno ha un test in `tests/smoke/security.spec.js`.
1. **Isolamento multi-tenant.** Ogni route API scopa i dati per l'azienda dell'utente. Le route `[id]`
   verificano la **proprietà** del record prima di leggerlo/mutarlo. Mai `.eq('id', params.id)` nudo su
   dati altrui → usa `requireEntityAccess` / `requireRecordAccess`.
2. **Auth su tutto ciò che non è esplicitamente pubblico** (`requireAuth`). Pubbliche legittime SOLO:
   `/api/guest/**`, `/api/*/public/**`, `/api/public/**`, `/api/cron/**` (con secret), `/api/sitemap`,
   `/api/llms`, `/api/webhooks` (bounce), auth pubbliche (signup, forgot/reset-password, me, ecc.).
3. **Un non-super non sceglie l'azienda.** `resolveAziendaId(profile, body.azienda_id)`: solo
   `super_admin` può indicare un `azienda_id` diverso dal proprio. Mai fidarsi di `body.azienda_id`.
4. **Zero leak di campi sensibili** negli endpoint pubblici/guest: mai `dati_privati` (vetrine), token,
   segreti, regole interne. (Eccezione **voluta**: `wifi_password` nella PWA ospite `/api/guest/[slug]`.)
5. **Input sanitizzato prima dei filtri.** Input utente in filtri PostgREST (`.or/.filter/.ilike`,
   `dati->>${key}`) → **UUID-validato o whitelistato**, mai grezzo (filter-injection).
6. **URL/HTML sanitizzati al render.** URL → `safeUrl` (blocca `javascript:`/`data:`); HTML utente → DOMPurify.
7. **Endpoint pubblici rate-limited** (`lib/rate-limit.js`) su ogni POST/mutation.
8. **Cron/webhook protetti da secret** (`Authorization: Bearer ${CRON_SECRET}`).
9. **Secret solo server-side.** `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
   `CRON_SECRET` mai lato client né in una risposta.
10. **RLS come secondo muro** (progetto architetturale, backlog).

### Il SISTEMA di monitoraggio (a strati — "sempre" senza sprechi)
- **Strato 0 — Aggiornamento dipendenze (il "processo tipo WordPress-update").** `.github/dependabot.yml`
  apre PR automatiche per gli aggiornamenti + quelle di **sicurezza (CVE)** se sono attivi i toggle repo
  (Settings → Code security → Dependabot alerts + security updates). `deploy.ps1` esegue `npm audit
  --audit-level=high` (informativo) ad ogni deploy. Impegno reale: **mergiare le PR di Dependabot** e
  **aggiornare Next.js quando esce una patch di sicurezza** (Next ha avuto CVE gravi, es. bypass auth middleware).
  Giudizio: non ogni finding di `npm audit` è urgente (molti sono deps di build/dev non runtime-exploitable).
- **Strato 1 — Test deterministici in CI (0 token, ogni deploy) = spina dorsale.** `tests/smoke/security.spec.js`
  gira ad ogni `deploy.ps1`: un test per invariante (authz anon→401, IDOR cross-azienda→404, scoping,
  gating campi privati, 2FA, permessi). **Regola: ogni buco chiuso diventa un test qui → non regredisce mai.**
- **Strato 2 — Convenzione al momento di scrivere = questa §0 + la checklist.**
- **Strato 3 — Review AI sul DIFF, on-demand,** quando si tocca auth/route API/esposizione dati (non tutto il codebase).
- **Strato 4 — Audit profondo (workflow `security-audit`, raro):** fan-out multi-dimensione + verifica
  avversariale, **solo prima di release importanti**. I confermati → fix + test (Strato 1).

### CHECKLIST per OGNI nuova route API
**Admin:** [ ] `requireAuth`/`requireEntityAccess`/`requireRecordAccess` · [ ] dati scopati per
`azienda_id` (no `.eq('id')` nudo) · [ ] scrittura via `resolveAziendaId` · [ ] input nei filtri validato.
**Pubblica/guest:** [ ] è davvero pubblica? · [ ] `.select()` senza campi sensibili · [ ] rate-limit +
(form) honeypot/Turnstile · [ ] URL/HTML → `safeUrl`/DOMPurify.
**Sempre:** [ ] nessun secret in risposta · [ ] tocchi il sensibile → review sul diff · [ ] chiudi un buco → test in `security.spec.js`.

### Primitive
`client-next/lib/server-auth.js` (requireAuth, requireEntityAccess, requireRecordAccess, resolveAziendaId,
getEntityAziendaId, ENTITY_TABLES) · `lib/rate-limit.js` · `lib/turnstile.js` · `safeUrl` in
`LandingBlockRenderer.jsx` · DOMPurify in `ArticoloPage.jsx` · test in `tests/smoke/security.spec.js`.

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
