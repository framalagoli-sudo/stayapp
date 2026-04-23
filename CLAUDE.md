# StayApp — Documentazione per sviluppo

Piattaforma SaaS multi-modulo per strutture ricettive, ristoranti e altri business italiani. L'ospite inquadra un QR code e accede a una PWA installabile.

**Architettura multi-modulo:**
```
Azienda (top-level)
├── moduli: { struttura, ristorante, spa, ... }
├── Struttura 1 → PWA /s/:slug
├── Struttura 2
├── Ristorante 1 → PWA /r/:slug
└── Ristorante 2
```

---

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 (PWA via vite-plugin-pwa) |
| Backend | Node.js + Express 4 (ES modules) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Icone | lucide-react ^1.8.0 |
| Router | react-router-dom v6 |
| Pagamenti | Stripe (dipendenza installata, non ancora integrata) |
| Hosting | Vercel (pianificato) |

**Avvio locale:**
- Client: `cd client && npm run dev` → `http://localhost:5173`
- Server: `cd server && npm run dev` → `http://localhost:3001`
- Il client fa proxy `/api/*` → `localhost:3001` via `vite.config.js`

---

## Architettura repository

```
hospitality/
├── client/                     # React PWA
│   └── src/
│       ├── App.jsx             # Router principale
│       ├── context/
│       │   └── AuthContext.jsx # Auth state globale (user + profile)
│       ├── hooks/
│       │   └── useProperty.js  # Hook per caricare/salvare la struttura
│       ├── lib/
│       │   ├── api.js          # apiFetch + uploadMedia (con auth token)
│       │   └── supabase.js     # Client Supabase (anon key)
│       ├── components/admin/
│       │   ├── AdminLayout.jsx # Sidebar + outlet (responsive mobile)
│       │   └── ProtectedRoute.jsx
│       └── pages/
│           ├── admin/          # Pannello di gestione
│           │   ├── property/   # Sub-pagine struttura (8 pagine)
│           │   ├── DashboardPage.jsx
│           │   ├── RequestsPage.jsx
│           │   ├── PropertiesPage.jsx
│           │   ├── QRCodePage.jsx
│           │   ├── LoginPage.jsx
│           │   └── *Section.jsx  # Componenti editor (Services, Gallery, Restaurant, Activities, Excursions)
│           └── guest/          # App ospite PWA
│               ├── GuestApp.jsx      # Entry point PWA (carica da slug)
│               ├── RequestForm.jsx
│               ├── ServicesTab.jsx
│               ├── RestaurantTab.jsx
│               ├── ActivitiesTab.jsx
│               └── ExcursionsTab.jsx
├── server/
│   └── src/
│       ├── index.js            # Express app + route mount
│       ├── middleware/
│       │   └── auth.js         # requireAuth + requireRole
│       ├── lib/
│       │   └── supabase.js     # Client Supabase (service role — bypassa RLS)
│       └── routes/
│           ├── auth.js         # GET /api/auth/me
│           ├── properties.js   # CRUD strutture
│           ├── guest.js        # GET /api/guest/:slug (pubblico)
│           ├── requests.js     # CRUD richieste ospiti
│           └── upload.js       # Upload media (logo, cover, gallery, foto moduli)
└── supabase/migrations/        # SQL da eseguire manualmente in Supabase
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

> **Nota:** `request_type` nel DB è un enum con 4 valori, ma il server accetta anche stringhe libere come `'attività'` e `'escursione'` perché usa la service role key (bypassa i vincoli). Da allineare con una migration che aggiunge i valori all'enum o converte il campo in `text`.

### Tabella `aziende` ⭐ (nuova — sostituisce `groups`)

```sql
id               uuid PK
ragione_sociale  text NOT NULL
partita_iva      text
codice_fiscale   text
email            text
pec              text
telefono         text
cellulare        text
indirizzo        text
citta            text
cap              text
provincia        text
moduli           jsonb DEFAULT '{"struttura":false,"ristorante":false}'
piano            plan_type DEFAULT 'base'
active           boolean DEFAULT true
created_at / updated_at  timestamptz
```

### Tabella `groups` (DEPRECATA — usare `aziende`)

```sql
id          uuid PK
name        text
plan        plan_type  DEFAULT 'standard'
active      boolean    DEFAULT true
created_at  timestamptz
```

### Tabella `properties`

```sql
id            uuid PK
group_id      uuid FK → groups (nullable)
slug          text UNIQUE        -- es. "hotel-bellavista" (usato nell'URL della PWA)
name          text
description   text
address       text
phone         text
email         text
wifi_name     text
wifi_password text
checkin_time  text               -- es. "14:00"
checkout_time text               -- es. "11:00"
rules         text
amenities     jsonb DEFAULT '[]'
logo_url      text               -- URL Supabase Storage (con ?v= cache-buster)
cover_url     text               -- URL Supabase Storage (con ?v= cache-buster)
plan          plan_type DEFAULT 'base'
active        boolean DEFAULT true
modules       jsonb DEFAULT '{"reception":true,"housekeeping":false,"restaurant":false,"upselling":false,"chat":false,"wifi":true,"info":true}'
theme         jsonb DEFAULT '{"primaryColor":"#00b5b5","font":"inter"}'
services      jsonb DEFAULT '[]'
gallery       jsonb DEFAULT '[]' -- array di URL stringa
restaurant    jsonb              -- oggetto con active, name, description, schedule, categories[]
activities    jsonb DEFAULT '[]' -- array categorie con items (migration pendente)
excursions    jsonb DEFAULT '[]' -- array flat escursioni (migration pendente)
created_at    timestamptz
updated_at    timestamptz
```

**Migration pendente — eseguire su Supabase:**
```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS excursions JSONB DEFAULT '[]'::jsonb;
```

### Tabella `ristoranti` ⭐ (nuova)

```sql
id          uuid PK
azienda_id  uuid FK → aziende (cascade delete)
slug        text UNIQUE        -- es. "osteria-della-nonna"
name        text NOT NULL
description text
address     text
phone       text
email       text
schedule    text               -- es. "Lun-Ven 12:00-14:30 / 19:00-22:30"
cover_url   text
logo_url    text
active      boolean DEFAULT true
theme       jsonb DEFAULT '{"primaryColor":"#e63946",...}'
gallery     jsonb DEFAULT '[]'
menu        jsonb DEFAULT '[]' -- [{id, name, items:[{id, name, description, price, photo, allergens}]}]
created_at / updated_at  timestamptz
```

### Tabella `profiles`

```sql
id          uuid PK → auth.users (cascade delete)
role        user_role DEFAULT 'staff'
full_name   text
property_id uuid FK → properties (nullable)
group_id    uuid FK → groups (nullable)
created_at  timestamptz
```

Trigger `on_auth_user_created` crea il profilo automaticamente al signup.

### Tabella `requests`

```sql
id          uuid PK
property_id uuid FK → properties (cascade delete)
room        text (nullable)
type        request_type   -- anche valori liberi come 'attività', 'escursione'
message     text
status      request_status DEFAULT 'open'
note        text (nullable)
created_at  timestamptz
updated_at  timestamptz
```

### Storage Supabase

Bucket: `property-media` (pubblico)

Path convention: `{property_id}/{campo}-{timestamp}.{ext}`

Tutti gli upload usano `upsert: true` e aggiungono `?v={timestamp}` all'URL per invalidare la cache.

### RLS Policies

- `profiles`: ogni utente vede solo il proprio record
- `properties SELECT`: super_admin / property_id match / group_id match
- `properties UPDATE`: stesse regole del SELECT
- `requests SELECT`: super_admin o property_id match
- `requests INSERT`: aperto — il server usa service role key

Il server Node.js usa sempre la **service role key** → bypassa tutte le RLS policy. La RLS vale per le query dirette dal client (AuthContext, useProperty).

---

## API Endpoints

### Auth
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/auth/me` | ✓ | Profilo utente corrente |
| GET | `/api/health` | — | Health check |

### Properties
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/properties` | ✓ | Lista strutture (filtrata per ruolo) |
| GET | `/api/properties/:id` | ✓ | Singola struttura |
| POST | `/api/properties` | ✓ super_admin/admin_gruppo | Crea struttura + genera slug |
| PATCH | `/api/properties/:id` | ✓ | Aggiorna campi struttura |
| DELETE | `/api/properties/:id` | ✓ super_admin/admin_gruppo | Elimina struttura |

Campi aggiornabili via PATCH: `name, description, address, phone, email, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, modules, theme, logo_url, cover_url, services, gallery, restaurant, activities, excursions`

### Guest (pubblico)
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/guest/:slug` | — | Dati struttura per la PWA ospite |

### Requests
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/requests` | — | Ospite invia richiesta |
| GET | `/api/requests` | ✓ | Lista richieste (filtri: property_id, status) |
| PATCH | `/api/requests/:id` | ✓ | Aggiorna status/note |

### Upload
| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/upload/logo` | ✓ | Carica logo → aggiorna `logo_url` |
| POST | `/api/upload/cover` | ✓ | Carica cover → aggiorna `cover_url` |
| DELETE | `/api/upload/logo` | ✓ | Elimina logo da Storage + nullifica campo |
| DELETE | `/api/upload/cover` | ✓ | Elimina cover da Storage + nullifica campo |
| POST | `/api/upload/gallery` | ✓ | Carica foto → restituisce URL (client gestisce array) |

Limite file: 5 MB. Multer usa `memoryStorage()`.

---

## Livelli di accesso

| Ruolo | Cosa vede/fa |
|---|---|
| `super_admin` | Tutto: tutte le strutture, tutte le richieste, sidebar completa |
| `admin_gruppo` | Le strutture del proprio group_id |
| `admin_struttura` | La propria struttura |
| `staff` | La propria struttura |

Sidebar admin: "La mia struttura" è visibile a tutti i ruoli. "Strutture" solo a super_admin e admin_gruppo. "QR Code" solo ad admin_struttura e staff.

---

## Struttura dati JSONB

### `modules`
```json
{ "reception": true, "housekeeping": false, "restaurant": false,
  "upselling": false, "chat": false, "wifi": true, "info": true }
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
Icone: `pool, spa, restaurant, gym, parking, wifi, beach, entertainment, bar, breakfast, reception24, shuttle`
Mappate a Lucide in `iconLucide()` (ServicesSection.jsx).

### `gallery`
```json
["https://...supabase.co/.../photo.jpg?v=123", "..."]
```

### `restaurant`
```json
{
  "active": true, "name": "Ristorante", "description": "...", "schedule": "12:00–14:30",
  "categories": [{ "id": "uuid", "name": "Antipasti",
    "items": [{ "id": "uuid", "name": "...", "description": "...", "price": 12, "allergens": "..." }]
  }]
}
```

### `activities`
```json
[{
  "id": "uuid", "category": "Sport acquatici",
  "items": [{
    "id": "uuid", "name": "Kayak", "description": "...",
    "location": "Lago", "schedule": "09:00–12:00",
    "ageGroup": "tutti", "bookable": true, "photo_url": "...", "active": true
  }]
}]
```
`ageGroup`: `tutti | adulti | bambini | famiglie`

### `excursions`
```json
[{
  "id": "uuid", "name": "Gita alle 5 Terre", "description": "...",
  "price": 45, "duration": "8 ore", "meeting_point": "Lobby ore 08:00",
  "seats": 12, "dates": "Ogni martedì", "includes": "Trasporto, pranzo",
  "photo_url": "...", "active": true
}]
```

---

## Moduli implementati

### Admin panel

| Pagina | Path | Funzione |
|---|---|---|
| Dashboard | `/admin` | Overview richieste aperte |
| Richieste | `/admin/requests` | Lista + filtri status + aggiorna stato |
| Strutture | `/admin/properties` | Crea/lista strutture (solo super_admin, admin_gruppo) |
| QR Code | `/admin/qrcode` | Genera QR per URL `/s/{slug}` |
| Informazioni | `/admin/property/info` | Nome, descrizione, orari, WiFi, regole, logo, cover |
| Moduli attivi | `/admin/property/modules` | Toggle reception/housekeeping/wifi/info |
| Servizi | `/admin/property/services` | CRUD servizi con icone Lucide |
| Galleria | `/admin/property/gallery` | Upload/riordina/elimina foto galleria |
| Ristorante | `/admin/property/restaurant` | Menu a categorie con prezzi e allergeni |
| Tema e colori | `/admin/property/theme` | Colore primary, sfondo, font, bordi + preview live |
| Attività | `/admin/property/activities` | CRUD attività per categoria con foto e prenotabilità |
| Escursioni | `/admin/property/excursions` | CRUD escursioni flat con prezzo e posti |

### App ospite (PWA)

URL: `/s/{slug}` — carica da `GET /api/guest/:slug` (nessuna auth richiesta)

**Bottom nav a 4 tab:**
- **Home** — Welcome card gradient primary + griglia card che aprono sezioni Esplora
- **Esplora** — Chip bar sticky + contenuto: Galleria / Servizi / Ristorante / Attività / Escursioni (solo chip con contenuto presente)
- **Richiesta** — Form tipo + camera + messaggio → `POST /api/requests`
- **Info** — WiFi (con copia password), contatti, check-in/out, regole

---

## Convenzioni di codice

### Icone (lucide-react)
- `strokeWidth={1.5}` sempre
- `color={primary}` sempre (colore primario della struttura dal tema)
- Bottom nav inattiva: `opacity: 0.4`; attiva: `opacity: 1`
- `CheckCircle` per stati di successo nei form
- `X` per chiudere modal/lightbox
- NON usare emoji nell'app ospite

### Form e input in liste dinamiche
**Pattern obbligatorio** per evitare bug di "impasto" (ogni keypress ri-renderizza):
```jsx
function ItemForm({ item, onPatch }) {
  const [name, setName] = useState(item.name)
  // testo: onChange aggiorna stato locale, onBlur propaga al genitore
  return <input value={name} onChange={e => setName(e.target.value)} onBlur={() => onPatch({ name })} />
  // select/toggle/file: onChange diretto a onPatch
}
```
Estrarre sempre in componenti separati (`ItemForm`, `CategoryNameInput`) per isolare lo stato.

### API calls
- `apiFetch(path, options)` — aggiunge Bearer token, gestisce JSON
- `uploadMedia(endpoint, file)` — multipart, NON impostare Content-Type (lo fa il browser)
- Entrambe: `res.text()` → `JSON.parse` in try/catch (gestisce risposte HTML di errore)

### Hook `useProperty`
- Carica la struttura dal `profile.property_id` via Supabase client (RLS)
- `save(updates)` → PATCH `/api/properties/:id` + aggiorna stato locale + "Salvato" 2.5s
- Usato da tutte le pagine `property/*`

### Stile
- Tutto inline styles, nessun CSS framework
- Admin: sidebar 220px + main `#f5f5f5`
- Guest: flex column con bottom nav fixed; scroll area `flex:1; overflow-y:auto`
- Desktop mockup guest: 390px, `border-radius:44px`, `overflow:hidden`
- Chip bar Esplora: `position:sticky; top:0` dentro il container scroll

### Supabase — due client distinti
- **Server** (`server/src/lib/supabase.js`): service role key → bypassa RLS
- **Client** (`client/src/lib/supabase.js`): anon key + JWT → soggetto a RLS

---

## Roadmap — da implementare

### Alta priorità
- [ ] **Migration DB**: aggiungere `activities` e `excursions` su Supabase (SQL sopra)
- [ ] **Fix enum `request_type`**: aggiungere `attività` e `escursione` o convertire in `text`
- [ ] **Notifiche real-time richieste**: Supabase Realtime sulla tabella `requests`
- [ ] **Chat ospite ↔ reception**: modulo `chat` già in `modules`, tabella `messages` da creare
- [ ] **Push notifications**: service worker già attivo, da collegare a Supabase Realtime o Web Push

### Media priorità
- [ ] **Stripe Connect**: pagamenti per escursioni/upselling (dipendenza già installata)
- [ ] **Multi-lingua**: i18n per l'app ospite (IT/EN/DE minimo)
- [ ] **Upselling**: modulo già previsto in `modules`, da implementare
- [ ] **Analytics**: contatori visualizzazioni, richieste per tipo, conversioni
- [ ] **Gestione staff**: invita utenti con ruolo staff associato a una struttura

### Bassa priorità
- [ ] **QR Code personalizzato** con logo struttura sovrapposto
- [ ] **Modalità offline**: cache service worker per uso senza connessione
- [ ] **Recensioni ospiti** a fine soggiorno
- [ ] **Integrazione PMS**: Opera, Protel, ecc.
- [ ] **Piano Enterprise**: white label + dominio custom

---

## Note importanti

1. **Slug**: generato dal nome alla creazione (lowercase, no accenti, solo `a-z0-9-`). In caso di conflitto aggiunge `-{timestamp base36}`. Non modificabile dopo la creazione.

2. **Cache-buster URL**: tutti gli URL Storage hanno `?v={timestamp}`. Non rimuovere — serve per forzare il refresh dopo upload.

3. **Gallery management**: il client carica foto via `/api/upload/gallery` (riceve URL), poi fa `PATCH /api/properties/:id` con l'array `gallery` aggiornato. Stesso pattern per activities ed excursions (i JSONB interi vengono salvati tramite PATCH).

4. **Font Google**: caricati a runtime con `<link>` iniettato nel `<head>`. La pagina tema admin li carica tutti per il selettore. L'app ospite carica solo quelli scelti dalla struttura.

5. **Mobile admin**: sidebar fixed con hamburger su viewport < 768px. Si chiude automaticamente al cambio di rotta (`useEffect` su `location.pathname`).

6. **Piani**: la colonna `plan` esiste su `properties` ma non è ancora usata per limitare funzionalità. Futura integrazione con Stripe per upgrade/downgrade.
