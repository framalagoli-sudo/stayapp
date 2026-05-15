# StayApp — Frontend (client/)

Questo file è auto-caricato da Claude Code quando si lavora in `client/`. Per il root e le note operative vedere `../CLAUDE.md`. Per DB schema e API vedere `../server/CLAUDE.md`.

---

## Route frontend (App.jsx)

### Pubbliche (guest)
| Path | Componente | Note |
|---|---|---|
| `/s/:slug` | GuestApp | PWA struttura; se minisito.active → LandingStruttura |
| `/r/:slug` | RestaurantApp | PWA ristorante; se minisito.active → LandingRistorante |
| `/a/:slug` | AttivitaApp → LandingAttivita | Solo minisito |
| `/s/:slug/p/:pageSlug` | PaginaPage | Pagina aggiuntiva struttura |
| `/r/:slug/p/:pageSlug` | PaginaPage | Pagina aggiuntiva ristorante |
| `/a/:slug/p/:pageSlug` | PaginaPage | Pagina aggiuntiva attività |
| `/s/:slug/privacy\|cookie` | PolicyPage | |
| `/r/:slug/privacy\|cookie` | PolicyPage | |
| `/a/:slug/privacy\|cookie` | PolicyPage | |
| `/blog` | BlogListPage | |
| `/blog/:slug` | ArticoloPage | |
| `/unsubscribe?token=` | UnsubscribePage | disiscrizione newsletter |
| `/confirm-subscription?token=` | ConfirmSubscriptionPage | conferma double opt-in |
| `/cancella-prenotazione?token=` | CancellaPrenotazionePage | cancellazione self-service prenotazione risorsa |
| `/s/:slug/newsletter` | NewsletterArchivePage | |
| `/r/:slug/newsletter` | NewsletterArchivePage | |
| `/a/:slug/newsletter` | NewsletterArchivePage | |
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
/admin/property/chatbot         → Editor chatbot
/admin/property/sito            → CMS: menu nav + lista pagine + header/footer configuratore
/admin/struttura/:id/*          → Stesse sub-pagine per strutture multiple
/admin/ristoranti/:id/info|menu|gallery|theme|minisito|privacy|pagine
/admin/attivita/:id/info|gallery|theme|minisito|privacy|pagine
/admin/pagine/:pageId           → PaginaEditorPage (builder blocchi)
```

---

## Moduli implementati

### Admin panel
| Pagina | Path | Funzione |
|---|---|---|
| Dashboard | `/admin` | Overview entità + stats |
| Analytics | `/admin/analytics` | Grafici SVG: visite minisito, richieste, prenotazioni, newsletter, contatti; range 7/30/90gg |
| Richieste | `/admin/requests` | Richieste PWA ospiti — esclude prenotazioni e interessi offerta |
| Prenotazioni | `/admin/prenotazioni` | Tab: Attività / Escursioni / Offerte; badge struttura; filtri stato |
| Demo | `/admin/demo` | Richieste demo dalla landing StayApp (letto/non letto) |
| Contatti | `/admin/contatti` | CRM: lista iscritti + lead, ricerca, filtri tag/newsletter, add/edit |
| Newsletter | `/admin/newsletter` | Lista bozze + inviate; duplica; mostra scheduled_at e unsubscribes |
| Newsletter editor | `/admin/newsletter/:id` | 4 template, live preview iframe, preheader, emoji picker oggetto, programmazione invio, test email |
| Blog | `/admin/blog` | CRUD articoli + categorie; editor Tiptap rich text |
| Eventi | `/admin/eventi` | CRUD eventi; prenotazioni per evento; export CSV |
| Info struttura | `/admin/property/info` | Nome, orari, WiFi, logo, cover |
| Servizi | `/admin/property/services` | CRUD con icone |
| Galleria | `/admin/property/gallery` | Upload/riordina/elimina |
| Tema | `/admin/property/theme` | Colore, font, bordi + preview |
| Attività | `/admin/property/activities` | CRUD per categoria |
| Escursioni | `/admin/property/excursions` | CRUD flat |
| Privacy struttura | `/admin/property/privacy` | Dati GDPR + preview policy |
| Booking calendario | `/admin/booking` | Week grid occupancy per risorsa |
| Booking risorse | `/admin/booking/risorse` | CRUD risorse (slot/coperti), orari, blocchi, promozioni, visibile_minisito |
| Booking prenotazioni | `/admin/booking/prenotazioni` | Lista filtrata per data/risorsa/stato, note interne, cambio stato |
| Chatbot | `/admin/property/chatbot` | Editor albero conversazione: passi, opzioni tipizzate, anteprima live |
| Sito (CMS) | `/admin/property/sito` | 3 sezioni: (1) menu nav drag&drop, (2) lista pagine ricerca/filtri/template, (3) configuratore header & footer |
| Editor pagina | `/admin/pagine/:pageId` | Builder blocchi: 23 tipi in 5 gruppi, icone Lucide colorate, drag&drop handle-only, picker con ricerca, drop indicator, SEO, slug auto |

### App ospite (PWA)
- **Struttura** `/s/:slug`: Home / Esplora / Richiesta / Info + CookieBanner + ChatbotWidget (floating absolute)
- **Ristorante** `/r/:slug`: Menu / Info / Galleria + CookieBanner + ChatbotWidget (floating absolute)
- **Attività** `/a/:slug`: sempre minisito (LandingAttivita)

### Minisito (Landing)
- LandingStruttura, LandingRistorante, LandingAttivita
- Sezioni configurabili drag & drop in admin
- Social links, SEO meta, CookieBanner con link policy
- Form contatti + newsletter con consenso GDPR
- ChatbotWidget (floating fixed, bottom-right) se `chatbot.active=true`
- Logic: `if (!isQR && entity.minisito?.active) return <LandingStruttura entity={entity} />`

**Sezioni configurabili:** `highlights, stats, about, foto_testo, paragrafi, team, steps, video, cta_banner, testimonianze, promozioni, pacchetti, services, activities, excursions, eventi, news, gallery, faq, show_map, booking, contatti, newsletter`

**Sezioni descrittive:**
- `foto_testo` — blocchi foto 50%/testo 50%, flag `inverti`; mobile sempre foto sopra
- `paragrafi` — titolo sezione + N card con icona, titolo, testo, foto opzionale
- `team` — card con foto circolare 96px, nome, ruolo, bio
- `steps` — numerazione badge su icona, titolo, testo; griglia auto-fit

**Sezioni attività:** subset senza menu_preview/menu_speciali/pacchetti

### Auth admin
- Login: `/admin/login`
- Forgot password: `/admin/forgot-password` → email con link Supabase
- Reset password: `/admin/reset-password` → form nuova password (token monouso, scade 1h)

---

## Sistema Privacy / GDPR

Ogni entità (struttura, ristorante, attività) ha:
- Colonna `privacy_data jsonb` con dati titolare
- Pagine policy auto-generate: `/s/:slug/privacy`, `/s/:slug/cookie`
- Link automatici nel footer del minisito e nel CookieBanner
- Checkbox consenso obbligatorio in form contatti e newsletter

**CookieBanner:** `createPortal(document.body)` · localStorage key: `cookie_consent_v2`

---

## Struttura dati JSONB chiave (lato client)

### `minisito`
```json
{
  "active": true,
  "tagline": "...",
  "booking_url": "https://...",
  "seo_title": "...",
  "seo_description": "...",
  "section_order": ["highlights", "about"],
  "sections": { "newsletter": false },
  "highlights": [{ "id": "uuid", "icon": "star", "text": "..." }],
  "stats": [{ "id": "uuid", "value": "150+", "label": "Camere" }],
  "social": { "instagram": "https://...", "facebook": "...", "whatsapp": "..." },
  "promozioni": [],
  "pacchetti": [],
  "testimonianze": [],
  "faq": [],
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
  "steps": [{ "id": "uuid", "icon": "check-circle", "title": "...", "text": "..." }],
  "header_cfg": {
    "style": "dark",
    "always_visible": false,
    "logo_in_nav": true,
    "show_phone": false,
    "show_cta": false,
    "cta_text": "Prenota ora",
    "cta_url": "",
    "bg_color": ""
  },
  "footer_cfg": {
    "layout": "standard",
    "style": "dark",
    "copyright": "",
    "show_socials": true,
    "show_description": true,
    "show_contact": true,
    "extra_links": [{ "id": "uuid", "label": "...", "url": "..." }]
  }
}
```
- `header_cfg.style`: `dark | light | colored | transparent`
- `header_cfg.always_visible`: `true` = nav sempre visibile; `false` = appare dopo scroll
- `header_cfg.bg_color`: hex custom usato quando `style='colored'`
- `footer_cfg.layout`: `minimal | standard | full` (full = 3 colonne con contatti)
- `footer_cfg.style`: `dark | light`

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
