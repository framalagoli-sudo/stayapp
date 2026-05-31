# StayApp — Backend (server/)

Questo file è auto-caricato da Claude Code quando si lavora in `server/`. Per il root e le note operative vedere `../CLAUDE.md`. Per route frontend e JSONB client vedere `../client/CLAUDE.md`.

---

## Database Supabase

### Tipi enum
```sql
plan_type:      base | standard | premium | enterprise
user_role:      super_admin | admin_gruppo | admin_struttura | staff | ospite
request_status: open | in_progress | resolved | cancelled
request_type:   reception | maintenance | housekeeping | other
```

### Tabella `aziende`
```sql
id, ragione_sociale, partita_iva, codice_fiscale, email, pec,
telefono, cellulare, indirizzo, citta, cap, provincia,
moduli jsonb DEFAULT '{"struttura":false,"ristorante":false,"attivita":false}',
piano plan_type DEFAULT 'base', active boolean, created_at, updated_at
```

### Tabella `properties`
```sql
id, azienda_id (FK aziende), group_id (FK groups, nullable),
slug text UNIQUE, name, description, address, phone, email, whatsapp,
wifi_name, wifi_password, checkin_time, checkout_time, rules,
amenities jsonb, logo_url, cover_url, plan plan_type,
active boolean, modules jsonb, theme jsonb, services jsonb,
gallery jsonb, restaurant jsonb, activities jsonb, excursions jsonb,
minisito jsonb,        -- configurazione minisito/landing
privacy_data jsonb,    -- dati GDPR titolare per policy auto-generate
chatbot jsonb,         -- albero conversazione chatbot (migration 025)
created_at, updated_at
```

### Tabella `ristoranti`
```sql
id, azienda_id (FK), slug UNIQUE, name, description, address,
phone, email, schedule, cover_url, logo_url, active boolean,
theme jsonb, gallery jsonb, menu jsonb, modules jsonb,
minisito jsonb, privacy_data jsonb, chatbot jsonb, created_at, updated_at
```

### Tabella `attivita` (migration 017)
```sql
id, azienda_id (FK), slug UNIQUE, name, tipo text,
description, address, phone, email, schedule,
cover_url, logo_url, active boolean,
theme jsonb, gallery jsonb, services jsonb,
minisito jsonb, privacy_data jsonb, chatbot jsonb, created_at, updated_at
```

### Tabella `profiles`
```sql
id (FK auth.users), role user_role, full_name,
property_id (FK properties, nullable), group_id (FK groups, nullable)
```

### Tabella `requests`
```sql
id, property_id (FK), room, type request_type, message,
status request_status DEFAULT 'open', note, created_at, updated_at
```
> Prenotazioni attività/escursioni: `message` inizia con `[Prenotazione ...`; interessi offerte con `[Interesse offerta: ...`.

### Tabella `aziende` (colonne aggiunte sprint 7)
Colonne extra su `aziende`:
```sql
trial_ends_at timestamptz,           -- data fine trial (14gg da signup)
subscription_status text DEFAULT 'trial',  -- 'trial' | 'active' | 'expired'
signup_enabled boolean DEFAULT false  -- toggle super_admin per signup pubblico
```

### Tabella `contatti`
```sql
id, azienda_id (FK aziende), nome, email, telefono,
fonte text DEFAULT 'minisito',    -- 'minisito' | 'manuale' | 'form'
iscritto_newsletter boolean DEFAULT false,
unsubscribe_token uuid DEFAULT gen_random_uuid(),
confirmation_token uuid,          -- double opt-in: null dopo conferma
tags text[] DEFAULT '{}', note text,
pipeline_stage text DEFAULT 'lead',  -- 'lead'|'contattato'|'in_trattativa'|'chiuso'|'perso'
created_at, updated_at
```

### Tabella `newsletters`
```sql
id, azienda_id (FK aziende), entity_tipo text, entity_id uuid,
subject text DEFAULT '', preheader text DEFAULT '',
template_id text DEFAULT 'semplice',  -- semplice|promozione|notizie|evento
content jsonb DEFAULT '{}',
status text DEFAULT 'draft',          -- draft | sent
scheduled_at timestamptz,            -- scheduler invia automaticamente se impostato
sent_at timestamptz,
recipients_count int DEFAULT 0, unsubscribes_count int DEFAULT 0,
created_at, updated_at
```

### Tabella `page_views`
```sql
id, entity_tipo text, entity_id uuid, viewed_at timestamptz DEFAULT now()
-- INDEX su (entity_tipo, entity_id) e su viewed_at
```

### Tabella `demo_requests`
```sql
id, nome, email, telefono, tipo_attivita, messaggio,
letto boolean DEFAULT false, created_at
```

### Tabella `webhooks` (migration 028_webhooks)
```sql
id uuid PK, azienda_id (FK), url text, eventi text[] DEFAULT '{}',
attivo boolean DEFAULT true, secret text,
created_at, updated_at
```
> eventi supportati: `nuovo_contatto`, `nuova_prenotazione`, `nuova_richiesta`, `cambio_stage_pipeline`, `preventivo_accettato`

### Tabella `automazioni` (migration 029)
```sql
id uuid PK, azienda_id (FK), nome text, trigger text,
-- trigger: 'nuova_prenotazione'|'pre_visita'|'post_visita'|'nuovo_contatto'
attiva boolean DEFAULT true,
steps jsonb DEFAULT '[]',
-- steps: [{ delay_ore: 0, subject: '', body: '' }]
created_at, updated_at
```

### Tabella `automazioni_log` (migration 029)
```sql
id uuid PK, automazione_id (FK), entity_tipo text, entity_id uuid,
contatto_id uuid, status text DEFAULT 'pending',  -- pending|sent|failed
scheduled_at timestamptz, sent_at timestamptz,
error text, created_at
```

### Tabella `recensioni` (migration 030)
```sql
id uuid PK, azienda_id (FK), entity_tipo text, entity_id uuid,
nome text, email text,
stelle int CHECK (stelle BETWEEN 1 AND 5),
testo text, risposta text,
fonte text DEFAULT 'interno',  -- 'interno'|'google'|'tripadvisor'|'booking'|'altro'
pubblica boolean DEFAULT false,
token uuid UNIQUE DEFAULT gen_random_uuid(),
created_at, updated_at
```
Colonne extra su `prenotazioni`: `recensione_token uuid`, `recensione_inviata boolean DEFAULT false`

### Tabella `preventivi` (migration 032)
```sql
id uuid PK, azienda_id (FK), contatto_id uuid,
numero int, titolo text,
voci jsonb DEFAULT '[]',  -- [{ descrizione, quantita, prezzo_unitario, iva }]
totale numeric, totale_iva numeric,
valido_fino date, note text,
status text DEFAULT 'bozza',  -- 'bozza'|'inviato'|'accettato'|'rifiutato'|'scaduto'
token uuid UNIQUE DEFAULT gen_random_uuid(),
firma_nome text, firmato_at timestamptz,
created_at, updated_at
```

### Tabella `form_builder` (migration 033)
```sql
id uuid PK, azienda_id (FK), nome text, attivo boolean DEFAULT true,
campi jsonb DEFAULT '[]',
-- campi: [{ id, tipo, label, placeholder, obbligatorio, opzioni[] }]
-- tipo: 'testo'|'email'|'tel'|'numero'|'textarea'|'select'|'checkbox'|'data'
email_notifica text, redirect_url text,
token uuid UNIQUE DEFAULT gen_random_uuid(),
created_at, updated_at
```

### Tabella `form_submissions` (migration 033)
```sql
id uuid PK, form_id (FK form_builder), dati jsonb,
contatto_id uuid,  -- creato auto se presente campo email
created_at
```

### Tabella `piano_editoriale` (migration 034)
```sql
id uuid PK, azienda_id (FK),
titolo text, testo text, immagine_url text,
canali text[] DEFAULT '{}',
-- canali: 'instagram'|'facebook'|'linkedin'|'tiktok'|'x'|'google_business'
data_pianificata timestamptz,
stato text DEFAULT 'bozza',  -- 'bozza'|'pianificato'|'pubblicato'
note text DEFAULT '',
created_at, updated_at
```

### Tabella `domini` (migration 035)
```sql
id uuid PK, azienda_id (FK),
entity_tipo text, entity_id uuid, entity_slug text,
dominio text UNIQUE,
tipo text DEFAULT 'custom',  -- 'subdomain'|'custom'
stato text DEFAULT 'pending',  -- 'attivo'|'pending'|'errore'
vercel_domain_id text,
dns_istruzioni jsonb,  -- { records: [{tipo,nome,valore,ttl}], verifica_txt: [...] }
created_at, updated_at
INDEX su dominio, INDEX su (entity_tipo, entity_id)
```

### Tabella `pagine` (migration 028)
```sql
id uuid PRIMARY KEY,
entity_tipo text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
entity_id uuid NOT NULL,
parent_id uuid REFERENCES pagine(id) ON DELETE SET NULL,  -- max 2 livelli
slug text NOT NULL,
titolo text NOT NULL DEFAULT '',
status text DEFAULT 'bozza' CHECK (status IN ('bozza','pubblicata')),
nel_menu boolean DEFAULT true,   -- se false: standalone, non appare nel nav
ordine integer DEFAULT 0,
seo_title text, seo_description text, og_image_url text,
blocks jsonb DEFAULT '[]',       -- array di { id, type, data }
created_at, updated_at
UNIQUE(entity_tipo, entity_id, slug)
```

### Storage Supabase
Bucket: `property-media` (pubblico)
Path: `{entity_id}/{campo}-{timestamp}.{ext}`
Upload con `upsert: true` + `?v={timestamp}` per cache-bust.

### JSONB `privacy_data`
```json
{
  "titolare_nome": "Hotel Bellavista Srl",
  "titolare_forma_giuridica": "Srl",
  "titolare_piva": "01234567890",
  "titolare_cf": "...",
  "titolare_indirizzo": "Via Roma 1",
  "titolare_citta": "Milano",
  "titolare_cap": "20100",
  "titolare_provincia": "MI",
  "titolare_email": "privacy@hotel.it",
  "titolare_telefono": "...",
  "dpo_nome": "",
  "dpo_email": "",
  "servizi": { "form_contatti": true, "newsletter": false, "richieste_ospiti": true, "prenotazioni": false }
}
```

---

## API Endpoints

### Auth & Health
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/auth/me` | ✓ | Profilo utente |
| GET | `/api/health` | — | Health check |

### Properties / Ristoranti / Attività
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/properties` | ✓ | Lista strutture |
| GET/POST | `/api/properties` | ✓ | Lista / Crea struttura |
| GET/PATCH/DELETE | `/api/properties/:id` | ✓ | Singola / Aggiorna / Elimina |
| GET/POST | `/api/ristoranti` | ✓ | Lista / Crea ristorante |
| PATCH/DELETE | `/api/ristoranti/:id` | ✓ | Aggiorna / Elimina |
| GET/POST | `/api/attivita` | ✓ | Lista / Crea attività |
| PATCH/DELETE | `/api/attivita/:id` | ✓ | Aggiorna / Elimina |

### Guest (pubblici, no auth)
| Metodo | Path | Descrizione |
|---|---|---|
| GET | `/api/guest/:slug` | Struttura (include slug, privacy_data, minisito) |
| GET | `/api/guest/r/:slug` | Ristorante |
| GET | `/api/guest/a/:slug` | Attività |
| GET | `/api/guest/eventi` | Lista eventi pubblici |
| GET | `/api/guest/eventi/:id` | Singolo evento |
| POST | `/api/guest/eventi/:id/book` | Prenota evento |
| POST | `/api/guest/contact` | Form contatti → email Resend + lead in contatti |
| POST | `/api/guest/book` | Prenotazione attività/escursione → requests + email |
| POST | `/api/guest/pageview` | Traccia visita (dedup sessionStorage) |
| GET | `/api/guest/unsubscribe?token=&nl=` | Disiscrizione newsletter |
| GET | `/api/guest/confirm-subscription?token=` | Conferma double opt-in |
| GET | `/api/guest/pagine/:tipo/:entityId` | Lista pagine nel_menu=true pubblicate |
| GET | `/api/guest/pagina/:tipo/:entityId/:slug` | Singola pagina pubblicata |

> **Importante:** tutti e tre gli endpoint guest includono `slug` nella `.select()`.

### Contatti
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/contatti/subscribe` | — | Iscrizione pubblica con double opt-in |
| GET | `/api/contatti` | ✓ | Lista (filtri: tag, newsletter, search) |
| POST | `/api/contatti` | ✓ | Crea contatto manuale |
| PATCH/DELETE | `/api/contatti/:id` | ✓ | Aggiorna / Elimina |

### Newsletter
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET/POST | `/api/newsletter` | ✓ | Lista / Crea bozza |
| GET/PATCH/DELETE | `/api/newsletter/:id` | ✓ | Singola / Aggiorna / Elimina |
| POST | `/api/newsletter/:id/duplicate` | ✓ | Duplica come nuova bozza |
| POST | `/api/newsletter/:id/test` | ✓ | Invia email di test |
| POST | `/api/newsletter/:id/send` | ✓ | Invia a tutti iscritti (batch 50) |
| GET | `/api/newsletter/archive/:tipo/:id` | — | Archivio pubblico |

> `runScheduledSends()` ogni 60s. `{{nome}}` → personalizzato con `personalize()` ricorsivo.

### Analytics
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/analytics?range=7\|30\|90` | ✓ | Stats aggregate: pageviews, richieste, prenotazioni, newsletter, contatti |

### Upload
| Metodo | Path | Descrizione |
|---|---|---|
| POST | `/api/upload/logo` | Logo struttura |
| POST | `/api/upload/cover` | Cover struttura |
| POST | `/api/upload/gallery` | Foto galleria |
| POST | `/api/upload/ristorante-logo` | Logo ristorante |
| POST | `/api/upload/attivita-logo` | Logo attività |
| POST | `/api/upload/attivita-cover` | Cover attività |
| POST | `/api/upload/attivita-gallery` | Galleria attività |
| POST | `/api/upload/minisito-image?entity_type=struttura\|ristorante\|attivita&entity_id=...` | Immagine blocchi minisito → `{ url }` |

### Pagine
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET/POST | `/api/pagine?entity_tipo=&entity_id=` | ✓ | Lista / Crea pagina (slug auto) |
| GET/PATCH/DELETE | `/api/pagine/:id` | ✓ | Singola / Aggiorna / Elimina |
| POST | `/api/pagine/reorder` | ✓ | Riordina + aggiorna parent_id |

### Webhooks
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET/POST | `/api/webhooks` | ✓ | Lista / Crea webhook |
| GET/PATCH/DELETE | `/api/webhooks/:id` | ✓ | Singolo / Aggiorna / Elimina |
| POST | `/api/webhooks/:id/test` | ✓ | Invia payload di test e restituisce risposta HTTP |

> `sendWebhooks(aziendaId, evento, payload)` in `server/lib/webhook.js` — fire-and-forget, Promise.allSettled, timeout 6s. Agganciato su: nuovo_contatto, nuova_prenotazione, nuova_richiesta, cambio_stage_pipeline, preventivo_accettato.

### Automazioni email
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET/POST | `/api/automazioni` | ✓ | Lista / Crea automazione |
| GET/PATCH/DELETE | `/api/automazioni/:id` | ✓ | Singola / Aggiorna / Elimina |
| GET | `/api/automazioni/:id/log` | ✓ | Log esecuzioni (pending/sent/failed) |
| POST | `/api/automazioni/test` | ✓ | Invia email di test |

> `runAutomazioniScheduler()` ogni 60s via setInterval in `index.js`. Variabili template: `{{nome}} {{data}} {{ora}} {{servizio}} {{n_persone}} {{link_recensione}}`.

### Recensioni
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET/POST | `/api/recensioni` | ✓ | Lista / Import manuale |
| GET/PATCH/DELETE | `/api/recensioni/:id` | ✓ | Singola / Aggiorna (pubblica, risposta) / Elimina |
| POST | `/api/recensioni/request` | ✓ | Genera token + invia email richiesta |
| GET | `/api/guest/recensione?token=` | — | Legge nome pre-compilato da token |
| POST | `/api/guest/recensione` | — | Salva recensione pubblica (token + stelle + commento) → smart redirect |

> Smart redirect: ≥4 stelle → `redirect_url` configurata (Google/TripAdvisor/altro); <4 → salva privata + notifica admin.

### Preventivi
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET/POST | `/api/preventivi` | ✓ | Lista / Crea |
| GET/PATCH/DELETE | `/api/preventivi/:id` | ✓ | Singolo / Aggiorna / Elimina |
| GET | `/api/public/preventivo/:token` | — | Preventivo pubblico per cliente |
| POST | `/api/public/preventivo/:token/accetta` | — | Cliente accetta con firma nome → webhook preventivo_accettato |

### Form builder
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET/POST | `/api/form-builder` | ✓ | Lista / Crea form |
| GET/PATCH/DELETE | `/api/form-builder/:id` | ✓ | Singolo / Aggiorna / Elimina |
| GET | `/api/form-builder/:id/submissions` | ✓ | Lista risposte |
| GET | `/api/form-builder/:id/export` | ✓ | Export CSV risposte |
| GET | `/api/public/form?token=` | — | Form pubblico (dati + campi) |
| POST | `/api/public/form/:token/submit` | — | Salva risposta → lead CRM se email presente |

### Piano editoriale
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET/POST | `/api/piano-editoriale` | ✓ | Lista / Crea post |
| GET/PATCH/DELETE | `/api/piano-editoriale/:id` | ✓ | Singolo / Aggiorna / Elimina |

### Domini
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/domini?entity_tipo=&entity_id=` | ✓ | Lista domini entità (subdomain + custom) |
| POST | `/api/domini` | ✓ | Aggiungi dominio custom → Vercel API + DNS instructions |
| POST | `/api/domini/:id/verify` | ✓ | Verifica stato dominio via Vercel API |
| DELETE | `/api/domini/:id` | ✓ | Rimuovi (solo custom; subdomain non eliminabile) |
| GET | `/api/public/resolve-domain?d=hostname` | — | Risolve dominio/sottodominio → `{entity_tipo, entity_id, entity_slug}` |

> `createDefaultSubdomain({ azienda_id, entity_tipo, entity_id, entity_slug })` — named export da `domini.js`, chiamato fire-and-forget dopo ogni creazione entità. Crea record `slug.stayapp.it` tipo `subdomain` stato `attivo`.

### Auth / Signup
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Registrazione pubblica: crea azienda + profilo admin_azienda + trial 14gg + email benvenuto |
| GET | `/api/auth/me` | ✓ | Profilo utente corrente |
| GET | `/api/health` | — | Health check |

---

## Note backend

14. **Booking risorse — architettura**: tabelle `risorse` + `risorse_promozioni` + `prenotazioni`. Due modalità: `slot` (slot orari con durata fissa, N risorse parallele via `quantita`) e `coperti` (max coperti per servizio, es. Pranzo/Cena). Algoritmo disponibilità server-side in `booking.js` (`calcolaSlotOrari` / `calcolaCoperti`). `visibile_minisito` controlla se la risorsa appare nel widget pubblico.

15. **BookingWidget**: wizard React (`src/components/BookingWidget.jsx`) usato nelle landing come sezione `booking`. Chiama `/api/booking/public/*` senza auth. Badge promo slot-per-slot da `risorse_promozioni`. Cancellazione via `cancellation_token` uuid nella email di conferma → `/cancella-prenotazione?token=`.

16. **Booking — giorni settimana**: `disponibilita` usa convenzione JS `getDay()` (0=dom, 1=lun, …, 6=sab) anche server-side. Chiusure coperti: stesso schema `giorni_chiusura[]`. Chiavi slot: `dom, lun, mar, mer, gio, ven, sab` (array `DAY_KEYS` in `booking.js`).

17. **Chatbot — architettura**: `chatbot jsonb` su properties/ristoranti/attivita. Struttura: `{ active, bot_name, nodes: [{ id, name, message, options: [{ id, label, type, next, value }] }] }`. Tipi opzione: `go_to`, `restart`, `call` (tel:), `whatsapp` (wa.me), `link`. Nodo `start` obbligatorio e non eliminabile. `ChatbotWidget`: `fixed=false` (position:absolute, PWA) / `fixed=true` (position:fixed, landing).

20. **Backup notturno automatico — Cloudflare R2**: cron job Railway ogni notte 03:00 UTC. Supabase service role → JSON → gzip → upload R2 → pulizia >30gg. **Non usa pg_dump** (non disponibile in Railway). Codice: `server/src/lib/backup.js`. Variabili Railway: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME=stayapp-backups`. Bucket: `stayapp-backups` su Cloudflare R2, region EU. Test: `POST /api/admin/backup` (solo super_admin). Tabelle esportate: aziende, profiles, properties, ristoranti, attivita, requests, contatti, newsletters, page_views, demo_requests, eventi, event_bookings, articoli, blog_categories, risorse, risorse_promozioni, prenotazioni, collegamenti, messages.

21. **⚠️ Cambio dominio — checklist completa**: eseguire TUTTI questi passaggi in ordine:

    **1. DNS Cloudflare:**
    ```
    CNAME @ → cname.vercel-dns.com  (proxy ON)  ← frontend
    CNAME api → <url>.railway.app   (proxy ON)  ← backend
    ```

    **2. Vercel** — Settings → Domains → aggiungi dominio

    **3. Railway** — env var: `CLIENT_URL=https://nuovodominio.com`

    **4. CORS** (`server/src/index.js` → array `allowedOrigins`):
    ```js
    'https://nuovodominio.com',
    ```
    Commit + push.

    **5. Supabase → Authentication → URL Configuration**:
    - **Site URL** → `https://nuovodominio.com` (fix etichetta 2FA TOTP)
    - **Redirect URLs** → aggiungi `https://nuovodominio.com/admin/reset-password`

    **6. Re-enrollment 2FA** — dopo cambio Site URL, ogni admin: `/admin/security` → Disattiva → ri-scansiona QR

    **7. Cloudflare WAF** — Security → WAF → Managed Rules → attiva Cloudflare Free Ruleset
