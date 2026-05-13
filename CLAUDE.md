# StayApp — Documentazione per sviluppo

Piattaforma SaaS multi-modulo per strutture ricettive, ristoranti e altri business italiani. L'ospite inquadra un QR code e accede a una PWA installabile. Ogni entità può attivare anche un **minisito pubblico** (landing page marketing).

**Architettura multi-modulo:**
```
Azienda (top-level)
├── moduli: { struttura, ristorante, attivita, ... }
├── Struttura 1 → PWA /s/:slug  |  Minisito /s/:slug (se attivo)
├── Ristorante 1 → PWA /r/:slug |  Minisito /r/:slug (se attivo)
└── Attività 1  → Minisito /a/:slug
```

---

## Setup nuovo sviluppatore — da zero

### 1. Prerequisiti
- Node.js 18+
- Git
- Account Supabase (credenziali da Francesco)
- Account Railway (credenziali da Francesco)
- Account Vercel (credenziali da Francesco)

### 2. Clona il repo e installa le dipendenze
```bash
git clone <repo-url>
cd hospitality
cd client && npm install
cd ../server && npm install
```

### 3. Variabili d'ambiente

**`server/.env`** (copia da Railway → Variables):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
RESEND_FROM=StayApp <noreply@stayapp.it>
APP_URL=https://stayapp-henna.vercel.app
CLIENT_URL=https://stayapp-henna.vercel.app
DEMO_NOTIFY_EMAIL=fra.malagoli@gmail.com
PORT=3001
```

**`client/.env`** (copia da Vercel → Settings → Environment Variables):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://<railway-url>.railway.app
```

### 4. Avvia in locale
```bash
# Terminale 1 — backend
cd server && npm run dev

# Terminale 2 — frontend
cd client && npm run dev
```
Frontend: `http://localhost:5173` | Backend: `http://localhost:3001`

### 5. Workflow sviluppo
```
1. Sviluppa e testa in locale
2. git add + git commit
3. git push → Railway aggiorna il backend automaticamente
4. npx vercel --prod --yes (dalla root) → aggiorna il frontend
```

> ⚠️ Le migration SQL vanno eseguite a mano su Supabase Dashboard → SQL Editor.
> Non sono automatiche. Testa sempre la migration prima di pushare.

### 6. Account e accessi
| Servizio | Piano | Chi gestisce |
|---|---|---|
| Supabase | Pro ($25/mese) | Francesco |
| Vercel | Pro ($20/mese) | Francesco |
| Railway | Starter ($5/mese) | Francesco |
| Cloudflare | Free | Francesco |
| Resend | Free/Pay-as-go | Francesco |

### 7. Contatti
- **Owner / Lead dev:** Francesco Malagoli — fra.malagoli@gmail.com
- **Super admin app:** fra.malagoli@gmail.com

---

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 (PWA via vite-plugin-pwa) |
| Backend | Node.js + Express 4 (ES modules) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Icone | lucide-react ^1.8.0 |
| Router | react-router-dom v6 |
| Email | Resend (RESEND_API_KEY in env) |
| Pagamenti | Stripe (installato, non integrato) |
| Hosting frontend | **Vercel** — `https://stayapp-henna.vercel.app` |
| Hosting backend | **Railway** |

**Avvio locale:**
- Client: `cd client && npm run dev` → `http://localhost:5173`
- Server: `cd server && npm run dev` → `http://localhost:3001`
- Proxy `/api/*` → `localhost:3001` via `vite.config.js`

**Deploy Vercel (manuale fino a connessione GitHub):**
```bash
npx vercel --prod --yes   # dalla root del repo
```
Il progetto Vercel ha `rootDirectory: client`. Il `client/vercel.json` configura SPA routing (rewrites → index.html).

---

## Architettura repository

```
hospitality/
├── client/
│   ├── vercel.json                 # SPA routing: tutte le route → index.html
│   └── src/
│       ├── App.jsx                 # Router principale
│       ├── context/AuthContext.jsx
│       ├── hooks/
│       │   ├── useProperty.js
│       │   ├── useRistorante.js
│       │   └── useAttivita.js
│       ├── lib/
│       │   ├── api.js              # apiFetch + uploadMedia
│       │   └── supabase.js
│       ├── components/
│       │   ├── admin/
│       │   │   ├── AdminLayout.jsx
│       │   │   ├── ProtectedRoute.jsx
│       │   │   └── ChatbotEditor.jsx   # editor albero conversazione chatbot (condiviso)
│       │   ├── CookieBanner.jsx    # React Portal, key cookie_consent_v2
│       │   ├── BookingWidget.jsx   # wizard pubblico prenotazione risorse
│       │   ├── ChatbotWidget.jsx   # chatbot floating (PWA=absolute, landing=fixed)
│       │   └── admin/PrivacySettingsSection.jsx
│       └── pages/
│           ├── admin/
│           │   ├── property/       # info, modules, services, gallery, restaurant,
│           │   │                   # theme, activities, excursions, privacy, chatbot
│           │   ├── ristorante/     # info, menu, gallery, theme, minisito, privacy, chatbot
│           │   ├── attivita/       # info, gallery, theme, minisito, privacy, chatbot
│           │   ├── booking/
│           │   │   ├── BookingCalendarioPage.jsx  # week grid occupancy + drill-down giorno
│           │   │   ├── BookingRisorsePage.jsx     # CRUD risorse + promozioni
│           │   │   └── BookingPrenotazioniPage.jsx # lista filtri + note interne
│           │   ├── DashboardPage.jsx
│           │   ├── ForgotPasswordPage.jsx  # richiesta reset password via email
│           │   ├── ResetPasswordPage.jsx   # form nuova password (da link email Supabase)
│           │   ├── RequestsPage.jsx   # richieste PWA (esclude booking)
│           │   ├── BookingsPage.jsx   # prenotazioni attività/escursioni (tab separati)
│           │   ├── PropertiesPage.jsx
│           │   └── QRCodePage.jsx
│           ├── guest/
│           │   ├── GuestApp.jsx         # PWA struttura (/s/:slug)
│           │   ├── RestaurantApp.jsx    # PWA ristorante (/r/:slug)
│           │   ├── AttivitaApp.jsx      # Entry attività (/a/:slug)
│           │   ├── LandingStruttura.jsx # Minisito struttura
│           │   ├── LandingRistorante.jsx
│           │   ├── LandingAttivita.jsx
│           │   ├── RequestForm.jsx
│           │   ├── ServicesTab.jsx
│           │   ├── ActivitiesTab.jsx
│           │   └── ExcursionsTab.jsx
│           └── public/
│               ├── PolicyPage.jsx              # /s/:slug/privacy|cookie, /r/:slug/..., /a/:slug/...
│               └── CancellaPrenotazionePage.jsx # /cancella-prenotazione?token=
├── server/
│   └── src/
│       ├── index.js
│       ├── middleware/auth.js
│       ├── lib/supabase.js         # service role key — bypassa RLS
│       └── routes/
│           ├── auth.js
│           ├── properties.js       # CRUD strutture
│           ├── ristoranti.js       # CRUD ristoranti
│           ├── attivita.js         # CRUD attività
│           ├── guest.js            # endpoint pubblici (no auth)
│           ├── requests.js
│           ├── upload.js
│           ├── eventi.js
│           ├── blog.js
│           ├── contatti.js         # CRM: lista + subscribe (double opt-in)
│           ├── newsletter.js       # CRUD + send + scheduler + archivio
│           ├── analytics.js        # stats aggregate per azienda
│           ├── booking.js          # sistema booking risorse (slot/coperti)
│           └── demo.js             # richieste demo dalla landing
└── supabase/migrations/
    ├── 015_blog.sql                # tabelle blog_articles, blog_categories
    ├── 016_contatti.sql            # tabella contatti (CRM)
    ├── 017_attivita.sql            # tabella attivita
    ├── 018_privacy_data.sql        # privacy_data jsonb su properties/ristoranti/attivita
    ├── 019_demo_requests.sql       # tabella demo_requests
    ├── 020_newsletter.sql          # tabella newsletters + unsubscribe_token su contatti
    ├── 021_page_views.sql          # tabella page_views (analytics visite minisito)
    ├── 022_newsletter_v2.sql       # confirmation_token + preheader + scheduled_at + unsubscribes_count
    ├── 023_booking.sql             # tabelle risorse, risorse_promozioni, prenotazioni
    ├── 024_booking_visibility.sql  # colonna visibile_minisito su risorse
    └── 025_chatbot.sql             # colonna chatbot jsonb su properties/ristoranti/attivita
```

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

> Discriminazione: prenotazioni attività/escursioni hanno `message` che inizia con `[Prenotazione ...`; interessi offerte con `[Interesse offerta: ...`. `BookingsPage` include solo questi; `RequestsPage` li esclude.

### Tabella `contatti`
```sql
id, azienda_id (FK aziende), nome, email, telefono,
fonte text DEFAULT 'minisito',    -- 'minisito' | 'manuale' | 'form'
iscritto_newsletter boolean DEFAULT false,
unsubscribe_token uuid DEFAULT gen_random_uuid(),
confirmation_token uuid,          -- double opt-in: null dopo conferma
tags text[] DEFAULT '{}',
note text,
created_at, updated_at
```

### Tabella `newsletters`
```sql
id, azienda_id (FK aziende), entity_tipo text, entity_id uuid,
subject text DEFAULT '',
preheader text DEFAULT '',        -- testo anteprima nei client email
template_id text DEFAULT 'semplice',  -- semplice|promozione|notizie|evento
content jsonb DEFAULT '{}',
status text DEFAULT 'draft',      -- draft | sent
scheduled_at timestamptz,         -- se impostato, scheduler lo invia automaticamente
sent_at timestamptz,
recipients_count int DEFAULT 0,
unsubscribes_count int DEFAULT 0,
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

### Storage Supabase
Bucket: `property-media` (pubblico)
Path: `{entity_id}/{campo}-{timestamp}.{ext}`
Upload con `upsert: true` + `?v={timestamp}` per cache-bust.

---

## API Endpoints

### Auth
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/auth/me` | ✓ | Profilo utente |
| GET | `/api/health` | — | Health check |

### Properties
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/properties` | ✓ | Lista strutture |
| GET | `/api/properties/:id` | ✓ | Singola struttura |
| POST | `/api/properties` | ✓ | Crea struttura |
| PATCH | `/api/properties/:id` | ✓ | Aggiorna (include privacy_data, minisito) |
| DELETE | `/api/properties/:id` | ✓ | Elimina |

### Ristoranti
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/ristoranti` | ✓ | Lista ristoranti azienda |
| POST | `/api/ristoranti` | ✓ | Crea ristorante |
| PATCH | `/api/ristoranti/:id` | ✓ | Aggiorna |
| DELETE | `/api/ristoranti/:id` | ✓ | Elimina |

### Attività
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/attivita` | ✓ | Lista attività azienda |
| POST | `/api/attivita` | ✓ | Crea attività |
| PATCH | `/api/attivita/:id` | ✓ | Aggiorna |
| DELETE | `/api/attivita/:id` | ✓ | Elimina |

### Guest (pubblici, no auth)
| Metodo | Path | Descrizione |
|---|---|---|
| GET | `/api/guest/:slug` | Struttura (include slug, privacy_data, minisito) |
| GET | `/api/guest/r/:slug` | Ristorante |
| GET | `/api/guest/a/:slug` | Attività |
| GET | `/api/guest/eventi` | Lista eventi pubblici |
| GET | `/api/guest/eventi/:id` | Singolo evento |
| POST | `/api/guest/eventi/:id/book` | Prenota evento |
| POST | `/api/guest/contact` | Form contatti minisito → email via Resend + salva lead in contatti |
| POST | `/api/guest/book` | Prenotazione attività/escursione → salva in requests + email |
| POST | `/api/guest/pageview` | Traccia visita minisito (fire-and-forget, dedup con sessionStorage) |
| GET | `/api/guest/unsubscribe?token=&nl=` | Disiscrizione newsletter + incrementa unsubscribes_count |
| GET | `/api/guest/confirm-subscription?token=` | Conferma double opt-in → iscritto_newsletter=true |

> **Importante:** tutti e tre gli endpoint guest includono `slug` nella select. Senza, i link privacy/cookie nel minisito non funzionano.

### Contatti
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/contatti/subscribe` | — | Iscrizione pubblica con double opt-in (email conferma via Resend) |
| GET | `/api/contatti` | ✓ | Lista contatti azienda (filtri: tag, newsletter, search) |
| POST | `/api/contatti` | ✓ | Crea contatto manuale |
| PATCH | `/api/contatti/:id` | ✓ | Aggiorna contatto |
| DELETE | `/api/contatti/:id` | ✓ | Elimina contatto |

### Newsletter
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/newsletter` | ✓ | Lista newsletter azienda |
| POST | `/api/newsletter` | ✓ | Crea bozza |
| GET | `/api/newsletter/:id` | ✓ | Singola newsletter |
| PATCH | `/api/newsletter/:id` | ✓ | Aggiorna bozza (subject, preheader, template, content, scheduled_at) |
| DELETE | `/api/newsletter/:id` | ✓ | Elimina bozza |
| POST | `/api/newsletter/:id/duplicate` | ✓ | Duplica come nuova bozza |
| POST | `/api/newsletter/:id/test` | ✓ | Invia email di test a un indirizzo |
| POST | `/api/newsletter/:id/send` | ✓ | Invia a tutti gli iscritti (batch 50) |
| GET | `/api/newsletter/archive/:tipo/:id` | — | Archivio pubblico newsletter inviate |

> Il server chiama `runScheduledSends()` ogni 60s: invia automaticamente le newsletter con `scheduled_at <= now()`.
> `{{nome}}` nelle newsletter viene sostituito con il nome del contatto (`personalize()` ricorsivo).

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
| POST | `/api/upload/minisito-image?entity_type=struttura\|ristorante\|attivita&entity_id=...` | Immagine per blocchi descrittivi minisito → `{ url }` |

---

## Route frontend (App.jsx)

### Pubbliche (guest)
| Path | Componente | Note |
|---|---|---|
| `/s/:slug` | GuestApp | PWA struttura; se minisito.active → LandingStruttura |
| `/r/:slug` | RestaurantApp | PWA ristorante; se minisito.active → LandingRistorante |
| `/a/:slug` | AttivitaApp → LandingAttivita | Solo minisito |
| `/s/:slug/privacy\|cookie` | PolicyPage | |
| `/r/:slug/privacy\|cookie` | PolicyPage | |
| `/a/:slug/privacy\|cookie` | PolicyPage | |
| `/blog` | BlogListPage | |
| `/blog/:slug` | ArticoloPage | |
| `/unsubscribe?token=` | UnsubscribePage | disiscrizione newsletter |
| `/confirm-subscription?token=` | ConfirmSubscriptionPage | conferma double opt-in |
| `/cancella-prenotazione?token=` | CancellaPrenotazionePage | cancellazione self-service prenotazione risorsa |
| `/s/:slug/newsletter` | NewsletterArchivePage | archivio newsletter struttura |
| `/r/:slug/newsletter` | NewsletterArchivePage | archivio newsletter ristorante |
| `/a/:slug/newsletter` | NewsletterArchivePage | archivio newsletter attività |
| `/eventi/:id` | EventoPage | dettaglio + prenotazione evento pubblico |
| `/s/:slug/offerte/:id` | OffertaPage | dettaglio offerta |
| `/s/:slug/pacchetti/:id` | PacchettoPage | dettaglio pacchetto |
| `/` | LandingPage | landing marketing StayApp |

### Admin
```
/admin                          → Dashboard
/admin/analytics                → Analytics (visite, richieste, newsletter, contatti)
/admin/requests                 → Richieste ospiti (esclude prenotazioni)
/admin/prenotazioni             → BookingsPage (tab: attività / escursioni / offerte)
/admin/demo                     → DemoRequestsPage (richieste dalla landing StayApp)
/admin/contatti                 → ContattiPage (CRM: lista, filtri, add/edit)
/admin/newsletter               → NewsletterPage (lista bozze + inviate)
/admin/newsletter/:id           → NewsletterEditorPage (editor + anteprima + invio)
/admin/eventi                   → EventiListPage
/admin/eventi/:id               → EventoEditPage
/admin/eventi/:id/prenotazioni  → EventoPrenotazioniPage
/admin/booking                  → BookingCalendarioPage (week grid + drill-down)
/admin/booking/risorse          → BookingRisorsePage (CRUD + promozioni)
/admin/booking/prenotazioni     → BookingPrenotazioniPage (lista filtri + note)
/admin/blog                     → AdminBlogListPage
/admin/blog/categories          → BlogCategoriesPage
/admin/blog/:id                 → BlogEditorPage
/admin/properties               → Lista strutture
/admin/qrcode                   → QR Code
/admin/property/info            → Info struttura
/admin/property/modules         → Moduli attivi
/admin/property/services        → Servizi
/admin/property/gallery         → Galleria
/admin/property/theme           → Tema e colori
/admin/property/activities      → Attività
/admin/property/excursions      → Escursioni
/admin/property/privacy         → Privacy & Policy struttura
/admin/struttura/:id/*          → Stesse sub-pagine per strutture multiple
/admin/ristoranti/:id/info|menu|gallery|theme|minisito|privacy
/admin/attivita/:id/info|gallery|theme|minisito|privacy
```

---

## Sistema Privacy / GDPR

Ogni entità (struttura, ristorante, attività) ha:
- Colonna `privacy_data jsonb` con dati titolare (nome, P.IVA, indirizzo, DPO, finalità trattamento)
- Pagine policy auto-generate da quei dati: `/s/:slug/privacy`, `/s/:slug/cookie`
- Link automatici nel footer del minisito e nel CookieBanner
- Checkbox consenso obbligatorio in form contatti e newsletter

**CookieBanner:**
- Usa `createPortal(document.body)` per compatibilità cross-browser (fix Firefox)
- localStorage key: `cookie_consent_v2`
- Mostra link Privacy Policy + Cookie Policy

**Form con consenso GDPR:**
- Form contatti: checkbox + link privacy, bottone disabilitato senza consenso
- Form newsletter: stessa cosa (marketing = consenso esplicito obbligatorio)

---

## Minisito (Landing page)

Attivabile per struttura e ristorante (`minisito.active = true`), sempre attivo per attività.

**GuestApp/RestaurantApp logic:**
```js
if (!isQR && entity.minisito?.active) return <LandingStruttura entity={entity} />
// altrimenti → PWA standard
```

**Sezioni configurabili** (drag & drop nell'admin):
`highlights, stats, about, foto_testo, paragrafi, team, steps, video, cta_banner, testimonianze, promozioni, pacchetti, services, activities, excursions, eventi, news, gallery, faq, show_map, booking, contatti, newsletter`

**Sezioni descrittive (nuove):**
- `foto_testo` — blocchi foto 50%/testo 50%, flag `inverti` per scambiare le colonne; mobile sempre foto sopra
- `paragrafi` — titolo sezione + N card con icona, titolo, testo, foto opzionale (medico→specializzazioni, scuola→corsi…)
- `team` — card con foto circolare 96px, nome, ruolo, bio
- `steps` — numerazione badge su icona, titolo, testo; griglia auto-fit (processo "Come funziona")

**Sezioni attività:** subset senza menu_preview/menu_speciali/pacchetti

---

## Struttura dati JSONB chiave

### `minisito`
```json
{
  "active": true,
  "tagline": "...",
  "booking_url": "https://...",
  "seo_title": "...",
  "seo_description": "...",
  "section_order": ["highlights", "about", ...],
  "sections": { "newsletter": false, ... },
  "highlights": [{ "id": "uuid", "icon": "star", "text": "..." }],
  "stats": [{ "id": "uuid", "value": "150+", "label": "Camere" }],
  "social": { "instagram": "https://...", "facebook": "...", "whatsapp": "..." },
  "promozioni": [...],
  "pacchetti": [...],
  "testimonianze": [...],
  "faq": [...],
  "video_url": "https://youtube.com/...",
  "cta_banner": { "title": "...", "subtitle": "...", "button_text": "..." },
  "newsletter_title": "...",
  "newsletter_subtitle": "...",
  "foto_testo": [{ "id": "uuid", "title": "...", "text": "...", "image_url": "...", "inverti": false }],
  "paragrafi_titolo": "Servizi",
  "paragrafi": [{ "id": "uuid", "icon": "star", "title": "...", "text": "...", "image_url": "" }],
  "team_titolo": "Il nostro team",
  "team": [{ "id": "uuid", "photo_url": "...", "nome": "...", "ruolo": "...", "bio": "..." }],
  "steps_titolo": "Come funziona",
  "steps": [{ "id": "uuid", "icon": "check-circle", "title": "...", "text": "..." }]
}
```

### `privacy_data`
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

### `theme`
```json
{
  "primaryColor": "#00b5b5",
  "bgColor": "#ffffff",
  "textColor": "#1a1a2e",
  "fontHeading": "playfair",
  "fontBody": "inter",
  "headerStyle": "solid",
  "borderStyle": "mixed"
}
```
- `fontHeading`: `playfair | cormorant | raleway | montserrat | nunito | dm-sans`
- `fontBody`: `inter | lato | open-sans`
- `headerStyle`: `solid | gradient | cover`
- `borderStyle`: `rounded (16px) | mixed (8px) | square (0px)`

### `services`
```json
[{ "id": "uuid", "icon": "pool", "name": "Piscina", "description": "...", "hours": "09:00–19:00" }]
```

### `activities`
```json
[{ "id": "uuid", "category": "Sport", "items": [{ "id": "uuid", "name": "Kayak", "description": "...", "location": "...", "schedule": "...", "ageGroup": "tutti", "bookable": true, "photo_url": "...", "active": true }] }]
```

### `excursions`
```json
[{ "id": "uuid", "name": "...", "description": "...", "price": 45, "duration": "8 ore", "meeting_point": "...", "seats": 12, "dates": "Ogni martedì", "includes": "...", "photo_url": "...", "active": true }]
```

---

## Convenzioni di codice

### Icone (lucide-react)
- `strokeWidth={1.5}` sempre
- `color={primary}` sempre
- Bottom nav inattiva: `opacity: 0.4`; attiva: `opacity: 1`

### Form e input in liste dinamiche
```jsx
function ItemForm({ item, onPatch }) {
  const [name, setName] = useState(item.name)
  return <input value={name} onChange={e => setName(e.target.value)} onBlur={() => onPatch({ name })} />
}
```
Testo: onChange locale → onBlur propaga. Select/toggle/file: onChange diretto.

### API calls
- `apiFetch(path, options)` — Bearer token, gestisce JSON
- `uploadMedia(endpoint, file)` — multipart, NON impostare Content-Type

### Hook pattern
- `useProperty()` — struttura corrente da `profile.property_id`
- `useRistorante(id)` — ristorante by ID
- `useAttivita(id)` — attività by ID
- Tutti espongono: `{ data, loading, saving, saved, saveError, save }`

### Stile
- Tutto inline styles, nessun CSS framework
- Admin: sidebar 220px + main `#f5f5f5`
- Guest PWA: flex column con bottom nav fixed; scroll area `flex:1; overflow-y:auto`
- Desktop mockup guest: 390px, `border-radius:44px`, `overflow:hidden`

---

## Moduli implementati

### Admin panel
| Pagina | Path | Funzione |
|---|---|---|
| Dashboard | `/admin` | Overview entità + stats |
| **Analytics** | `/admin/analytics` | Grafici SVG: visite minisito, richieste, prenotazioni, newsletter, contatti; range 7/30/90gg |
| Richieste | `/admin/requests` | Richieste PWA ospiti — esclude prenotazioni e interessi offerta |
| **Prenotazioni** | `/admin/prenotazioni` | Tab: Attività / Escursioni / Offerte; badge struttura; filtri stato |
| **Demo** | `/admin/demo` | Richieste demo dalla landing StayApp (letto/non letto) |
| **Contatti** | `/admin/contatti` | CRM: lista iscritti + lead, ricerca, filtri tag/newsletter, add/edit |
| **Newsletter** | `/admin/newsletter` | Lista bozze + inviate; duplica; mostra scheduled_at e unsubscribes |
| **Newsletter editor** | `/admin/newsletter/:id` | 4 template, live preview iframe, preheader, emoji picker oggetto, programmazione invio, test email |
| **Blog** | `/admin/blog` | CRUD articoli + categorie; editor Tiptap rich text |
| **Eventi** | `/admin/eventi` | CRUD eventi; prenotazioni per evento; export CSV |
| Strutture | `/admin/properties` | Crea/lista (super_admin) |
| QR Code | `/admin/qrcode` | Genera QR |
| Info struttura | `/admin/property/info` | Nome, orari, WiFi, logo, cover |
| Moduli | `/admin/property/modules` | Toggle moduli attivi |
| Servizi | `/admin/property/services` | CRUD con icone |
| Galleria | `/admin/property/gallery` | Upload/riordina/elimina |
| Tema | `/admin/property/theme` | Colore, font, bordi + preview |
| Attività | `/admin/property/activities` | CRUD per categoria |
| Escursioni | `/admin/property/excursions` | CRUD flat |
| Privacy struttura | `/admin/property/privacy` | Dati GDPR + preview policy |
| Ristorante | `/admin/ristoranti/:id/*` | info, menu, gallery, theme, minisito, privacy |
| Attività standalone | `/admin/attivita/:id/*` | info, gallery, theme, minisito, privacy |
| **Booking risorse** | `/admin/booking` | Calendario week grid occupancy per risorsa |
| **Booking — Risorse** | `/admin/booking/risorse` | CRUD risorse (slot/coperti), orari, blocchi, promozioni, visibile_minisito |
| **Booking — Prenotazioni** | `/admin/booking/prenotazioni` | Lista filtrata per data/risorsa/stato, note interne, cambio stato |
| **Chatbot** | `/admin/property/chatbot` | Editor albero conversazione: passi, opzioni tipizzate, anteprima live |

### App ospite (PWA)
- **Struttura** `/s/:slug`: Home / Esplora / Richiesta / Info + CookieBanner + ChatbotWidget (floating absolute)
- **Ristorante** `/r/:slug`: Menu / Info / Galleria + CookieBanner + ChatbotWidget (floating absolute)
- **Attività** `/a/:slug`: sempre minisito (LandingAttivita)

### Minisito (Landing)
- LandingStruttura, LandingRistorante, LandingAttivita
- Sezioni configurabili drag & drop
- Social links, SEO meta, CookieBanner con link policy
- Form contatti con consenso GDPR
- Form newsletter con consenso GDPR
- ChatbotWidget (floating fixed, bottom-right) se chatbot.active=true

### Auth admin
- Login: `/admin/login`
- Password dimenticata: `/admin/forgot-password` → email con link Supabase
- Reset password: `/admin/reset-password` → form nuova password (token monouso, scade 1h)

---

## Note importanti

1. **Slug**: generato al momento della creazione, non modificabile dopo. Conflitti → aggiunge `-{timestamp base36}`.

2. **cache-buster URL**: `?v={timestamp}` su tutti gli URL Storage. Non rimuovere.

3. **`slug` nella select guest**: tutti e tre gli endpoint guest (`/api/guest/:slug`, `/r/:slug`, `/a/:slug`) devono includere `slug` nella `.select()`. Senza, i link privacy/cookie nel minisito restano `undefined`.

4. **CookieBanner**: usa `createPortal(document.body)` per evitare problemi di stacking context in Firefox. Key localStorage: `cookie_consent_v2`.

5. **vercel.json**: in `client/vercel.json`, configura `rewrites → index.html` per SPA routing. Senza, Firefox e accessi diretti a URL profondi restituiscono 404.

6. **Deploy Vercel**: il progetto `stayapp` su Vercel ha `rootDirectory: client`. Deployare dalla root del repo con `npx vercel --prod --yes`. Il GitHub auto-deploy non è ancora collegato — deploy manuale per ora.

7. **Server Railway**: il backend gira su Railway. Riavvio automatico al push. `EADDRINUSE :3001` in locale = istanza precedente ancora attiva, killare con `Stop-Process -Id <PID> -Force`.

8. **Supabase service role**: il server usa sempre la service role key → bypassa RLS. La RLS vale solo per query client-side (AuthContext, useProperty).

9. **Discriminazione booking vs richieste**: le prenotazioni attività/escursioni vengono salvate in `requests` con `type: 'other'` e messaggio che inizia con `[Prenotazione attività]` o `[Prenotazione escursione]`. Gli interessi offerte iniziano con `[Interesse offerta: nome]`. `BookingsPage` filtra con `message.startsWith('[Prenotazione') || message.startsWith('[Interesse offerta')`, `RequestsPage` le esclude. Se in futuro si migra l'enum, aggiornare entrambe le pagine.

10. **Newsletter — double opt-in**: `POST /api/contatti/subscribe` salva il contatto con `iscritto_newsletter: false` e invia email di conferma con link `/confirm-subscription?token=uuid`. Il token viene azzerato su conferma. `runScheduledSends()` gira ogni 60s via `setInterval` in `index.js`.

11. **Newsletter — named exports**: `newsletter.js` esporta sia il router (`export default`) sia `sendNewsletterById` e `runScheduledSends` come named exports. `index.js` importa entrambi: `import newsletterRouter, { runScheduledSends } from './routes/newsletter.js'`.

12. **Pageview tracking**: le landing page (LandingStruttura/Ristorante/Attivita) fanno `POST /api/guest/pageview` al mount, deduplicato con `sessionStorage` key `pv_{entity.id}`. 1 visita per sessione browser.

13. **Analytics route**: nessuna query viene eseguita a module load time — tutto inside async handlers con try-catch. Express 4 non gestisce automaticamente eccezioni async: tutti i route handler async devono avere try-catch.

14. **Booking risorse — architettura**: tabelle `risorse` + `risorse_promozioni` + `prenotazioni`. Due modalità: `slot` (slot orari con durata fissa, N risorse identiche in parallelo via campo `quantita`) e `coperti` (max coperti per servizio, es. Pranzo/Cena). L'algoritmo di disponibilità gira server-side in `booking.js` (`calcolaSlotOrari` / `calcolaCoperti`). Il campo `visibile_minisito` controlla se la risorsa appare nel widget pubblico (può essere attiva in admin ma nascosta nel sito).

15. **BookingWidget**: componente wizard React (`src/components/BookingWidget.jsx`) usato nelle landing page come sezione `booking`. Chiama endpoint pubblici `/api/booking/public/*` senza autenticazione. I badge promo sono applicati slot per slot in base alle `risorse_promozioni` attive. La cancellazione avviene via `cancellation_token` uuid nella email di conferma → `/cancella-prenotazione?token=`.

16. **Booking — giorni settimana**: la `disponibilita` usa la convenzione JS `getDay()` (0=dom, 1=lun, …, 6=sab) anche lato server (Node.js). I giorni di chiusura coperti usano lo stesso schema in `giorni_chiusura[]`. Le chiavi per slot sono `dom, lun, mar, mer, gio, ven, sab` (array `DAY_KEYS` in booking.js).

17. **Chatbot — architettura**: configurazione salvata come `chatbot jsonb` su `properties`/`ristoranti`/`attivita`. Struttura: `{ active, bot_name, nodes: [{ id, name, message, options: [{ id, label, type, next, value }] }] }`. Tipi opzione: `go_to` (vai a nodo), `restart` (torna a start), `call` (tel:), `whatsapp` (wa.me), `link` (URL esterno). Il nodo `start` è obbligatorio e non eliminabile. `ChatbotWidget` ha due modalità: `fixed=false` (position:absolute dentro PWA) e `fixed=true` (position:fixed per landing pages). Il widget è disabilitato se `chatbot.active=false` o se non ci sono nodi.

19. **⚠️ Supabase Grant espliciti — obbligatori da ottobre 2026**: dal 30 ottobre 2026 Supabase richiede grant espliciti per ogni nuova tabella. Le tabelle esistenti (001–025) sono già coperte. **Ogni migration futura deve includere:**
    ```sql
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.nuova_tabella TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.nuova_tabella TO service_role;
    -- Solo per tabelle pubbliche (endpoint /api/guest/* senza auth):
    -- GRANT SELECT ON public.nuova_tabella TO anon;
    ALTER TABLE public.nuova_tabella ENABLE ROW LEVEL SECURITY;
    ```
    Il server usa service_role (bypassa tutto) quindi non è colpito. Il client usa Supabase solo per Auth API → non colpito. Impatta solo eventuali query client-side dirette su nuove tabelle.

20. **Backup notturno automatico — Cloudflare R2**: cron job su Railway ogni notte alle 03:00 UTC. `pg_dump` → gzip → upload su R2 → pulizia backup >30 giorni. Codice in `server/src/lib/backup.js`. Variabili richieste su Railway: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME=stayapp-backups`. Bucket: `stayapp-backups` su Cloudflare R2, region EU, storage class Standard. Test manuale: `POST /api/admin/backup` (solo super_admin). La `DATABASE_URL` ha formato: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres` — si trova in Supabase → Project Settings → Database → Connection string.

18. **⚠️ Supabase Redirect URLs — aggiornare ad ogni cambio dominio**: il flow di reset password usa `supabase.auth.resetPasswordForEmail()` con `redirectTo` che punta a `/admin/reset-password`. Supabase blocca i redirect verso URL non whitelistati. **Ogni volta che cambia il dominio di produzione o staging, aggiungere il nuovo URL in:**
    `Supabase Dashboard → Authentication → URL Configuration → Redirect URLs`
    URL da aggiungere (aggiornare con i domini reali):
    ```
    https://stayapp-henna.vercel.app/admin/reset-password
    http://localhost:5173/admin/reset-password
    ```
    Senza questo, il link nell'email di reset porta a una pagina di errore Supabase invece che all'app.

---

## Roadmap — prossimi step (aggiornata 2026-05-13)

### Concordati con l'utente (in ordine)
- [x] Analytics dashboard
- [x] Newsletter fasi 1+2+3+4
- [x] **Booking risorse** — slot/coperti, calendario admin, widget pubblico, promozioni, visibile_minisito
- [x] **Chatbot configurabile** — decision tree per struttura/ristorante/attività; admin editor nodi+opzioni; widget PWA e landing
- [x] **Password reset admin** — forgot-password + reset-password con token Supabase monouso (1h)
- [x] **Sicurezza Fase 1** — helmet, rate limiting, CORS lockdown, zod validation, global error handler
- [x] **Backup notturno** — cron job Railway → pg_dump → Cloudflare R2 EU, retention 30gg
- [ ] **Sicurezza Fase 2** — audit log, 2FA login admin, upgrade Supabase Pro + Vercel Pro (azioni manuali)
- [ ] **Pagamenti Stripe** — checkout booking risorse ed eventi (struttura già pronta: colonne pagamento_stato/pagamento_id su prenotazioni)
- [ ] **Multi-lingua** — IT/EN/DE per PWA ospite
- [ ] **Gestione staff** — invita collaboratori via email, ruoli, limitazione accessi

### Tecnico / infrastruttura
- [ ] **Collegare GitHub → Vercel auto-deploy** (Settings → Git nel dashboard Vercel)
- [ ] **Notifiche real-time** — badge sidebar + toast (Supabase Realtime su `requests`) — bassa priorità

### Bassa priorità
- [ ] **Email reminder booking** — N ore prima dell'appuntamento (struttura: `reminder_inviato` su prenotazioni)
- [ ] **QR Code con logo** sovrapposto
- [ ] **Modalità offline** PWA
- [ ] **Recensioni ospiti**
- [ ] **Integrazione PMS** (Opera, Mews, Cloudbeds)

> Per il dettaglio completo delle feature future vedere `FEATURES.md` nella root del repo.
