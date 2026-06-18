# StayApp — Frontend (client-next/)

Auto-caricato da Claude Code quando si lavora in `client-next/` (il frontend **LIVE**, Next.js 14 App Router). Per root e note operative → `../CLAUDE.md`. Per DB schema e API → `../server/CLAUDE.md`.

> ⚠️ `client/` è il **vecchio frontend Vite, dismesso**. Non toccarlo. Tutto il codice in produzione è qui in `client-next/`.

---

## Architettura Next (come è organizzato)

- **App Router file-based**: le route sono cartelle in `app/` con `page.js` (pagine) o `route.js` (API). Niente `App.jsx`.
- **Server Components di default**: le pagine guest caricano i dati **server-side** via `lib/guest-data.js` (query dirette a `supabaseAdmin`, nessun hop HTTP interno). Vedi `getStruttura/getRistorante/getAttivita/getPagina/getAziendaLegale`.
- **Client Components**: file con `'use client'` in cima. I componenti UI stanno in `components/` (NON dentro `app/`).
- **API**: `app/api/**/route.js`. Le route admin usano `requireAuth`/`requireRecordAccess`/`requireEntityAccess` da `lib/server-auth.js`.
- **Fetch dal client**:
  - `guestFetch(path)` — pubblico, nessun token (pagine guest). **Usare SEMPRE questo nelle pagine guest** (apiFetch causa bug QR — vedi memoria).
  - `apiFetch(path, opts)` — admin, manda il Bearer (lazy import di `@/lib/supabase`).
  - `serverFetch(path)` — solo SSR/Server Components.
- **`?qr=1`** sull'URL guest → apre la **PWA**; altrimenti, se `minisito.active`, apre il **minisito** (landing). Vedi `app/s/[slug]/page.js`.

### ⚠️ Caching (lezioni apprese — non ripetere i bug)
- **Letture sempre fresche**: `lib/supabase-server.js` forza `cache:'no-store'` su tutte le fetch di supabase-js. Next 14 altrimenti cacha le fetch lato server → modifiche admin invisibili sul sito. Vedi `[[reference_next14_fetch_cache]]` in memoria.
- Gli endpoint guest che servono dati live hanno `export const dynamic = 'force-dynamic'`.
- Env `NEXT_PUBLIC_*`: inlinate al **build** → dopo un cambio serve `vercel --prod --force` (la build cache può non re-inlinarle). `deploy.ps1` usa già `--force`.
- Tutte le env var lette server-side vanno `.trim()` + strip BOM (Vercel inietta BOM).

---

## Route frontend (cartelle in `app/`)

### Pubbliche (guest)
| Path | File | Note |
|---|---|---|
| `/s/[slug]` | `app/s/[slug]/page.js` | QR→`GuestApp` (PWA), altrimenti `LandingStruttura` (minisito) |
| `/r/[slug]` | `app/r/[slug]/page.js` | QR→`RestaurantApp`, altrimenti `LandingRistorante` |
| `/a/[slug]` | `app/a/[slug]/page.js` | QR→`AttivitaPWA`, altrimenti minisito attività |
| `/{s,r,a}/[slug]/p/[pageSlug]` | `.../p/[pageSlug]/page.js` | `PaginaPage` — pagine CMS aggiuntive |
| `/{s,r,a}/[slug]/privacy` · `/cookie` | `.../privacy\|cookie/page.js` | `PolicyPage` (creati 2026-06-17; prima erano cartelle vuote → 404) |
| `/blog` · `/blog/[slug]` | `app/blog/...` | lista + articolo |
| `/eventi/[id]` | `app/eventi/[id]/page.js` | dettaglio + prenotazione evento |
| `/form?token=` | `app/form/page.js` | `FormPublicPage` (form builder pubblico) |
| `/preventivo/[token]`, `/recensione?token=`, `/signup`, `/unsubscribe`, `/confirm-subscription`, `/cancella-prenotazione` | `app/...` | vari flussi pubblici |
| `/` | `app/page.js` | landing marketing StayApp |

I **domini custom** entrano via `middleware.js`: risolve il dominio → rewrite trasparente su `/{prefix}/{slug}/...` (param `_domain` propagato).

### Admin (`app/admin/...`, UI in `components/admin/*Page.jsx`)
```
/admin                          → DashboardPage
/admin/analytics                → Analytics
/admin/requests                 → Richieste (esclude prenotazioni)
/admin/booking[/risorse|/prenotazioni]
/admin/contatti  /admin/newsletter[/:id]  /admin/automazioni  /admin/integrazioni
/admin/blog[/categories|/:id]   /admin/eventi[/:id[/prenotazioni]]
/admin/recensioni  /admin/preventivi[/:id]  /admin/form-builder[/:id[/submissions]]
/admin/piano-editoriale  /admin/content-studio  /admin/shop  /admin/loyalty  /admin/survey
/admin/demo  /admin/qrcode  /admin/impostazioni  /admin/integrazioni  /admin/audit-log
/admin/aziende                  → AziendePage (super_admin: CRUD aziende, accessi, "Esporta dati" GDPR)
/admin/ai-site-builder
# Entità (NB: in Next i path sono per-id, non /admin/property/*):
/admin/struttura/[id]/{info,gallery,theme,sito,chatbot,domini,privacy,pagine,moduli,minisito}
/admin/ristoranti/[id]/{info,menu,gallery,theme,sito,chatbot,domini,privacy,pagine}
/admin/attivita/[id]/{info,gallery,theme,sito,chatbot,domini,privacy,pagine,moduli}
/admin/login  /admin/forgot-password  /admin/reset-password  /admin/accept-invite
```

---

## Sistema Privacy / GDPR
Ogni entità ha `privacy_data jsonb` (dati titolare). Le pagine `/{s,r,a}/[slug]/{privacy,cookie}` montano `components/public/PolicyPage.jsx` (usa `guestFetch`). Link automatici nel footer (`LandingFooter` + `PaginaPage`) e nel `CookieBanner` (`createPortal(document.body)`, localStorage key `cookie_consent_v2`). Checkbox consenso obbligatorio in form contatti/newsletter.

**Dati legali nel footer** (`components/guest/LegalInfo.jsx`): ragione sociale, P.IVA, sede, REA, capitale sociale dall'**azienda** (caricati via `getAziendaLegale`). Campi opzionali → worldwide-safe. Obbligo di legge per siti business.

**Anti-spam form** (tutti i form pubblici): honeypot + rate-limit (`lib/rate-limit.js`, store Postgres) + spam filter + Turnstile (`components/Turnstile.jsx` + `lib/turnstile.js`, oggi in **SOFT** = non blocca, vedi memoria).

---

## Strutture dati JSONB chiave (lato client)

### `minisito`
```json
{
  "active": true, "tagline": "...", "booking_url": "https://...",
  "seo_title": "...", "seo_description": "...",
  "section_order": ["highlights", "about"],
  "sections": { "newsletter": false },
  "highlights": [{ "id": "uuid", "icon": "star", "text": "..." }],
  "stats": [{ "id": "uuid", "value": "150+", "label": "Camere" }],
  "social": { "instagram": "https://...", "facebook": "...", "whatsapp": "..." },
  "promozioni": [], "pacchetti": [], "testimonianze": [], "faq": [],
  "video_url": "https://youtube.com/...",
  "cta_banner": { "title": "...", "subtitle": "...", "button_text": "..." },
  "foto_testo": [{ "id": "uuid", "title": "...", "text": "...", "image_url": "...", "inverti": false }],
  "paragrafi_titolo": "Servizi",
  "paragrafi": [{ "id": "uuid", "icon": "star", "title": "...", "text": "...", "image_url": "" }],
  "team_titolo": "Il nostro team",
  "team": [{ "id": "uuid", "photo_url": "...", "nome": "...", "ruolo": "...", "bio": "..." }],
  "steps_titolo": "Come funziona",
  "steps": [{ "id": "uuid", "icon": "check-circle", "title": "...", "text": "..." }],
  "header_cfg": { "style": "dark", "always_visible": false, "logo_in_nav": true, "show_phone": false, "show_cta": false, "cta_text": "Prenota ora", "cta_url": "", "bg_color": "" },
  "footer_cfg": { "layout": "standard", "style": "dark", "copyright": "", "show_socials": true, "show_description": true, "show_contact": true, "extra_links": [{ "id": "uuid", "label": "...", "url": "..." }] }
}
```
- `header_cfg.style`: `dark | light | colored | transparent`; `always_visible`: nav sempre visibile vs dopo scroll; `bg_color`: hex usato con `style='colored'`.
- `footer_cfg.layout`: `minimal | standard | full` (full = 3 col con contatti); `style`: `dark | light`.
- NB: `LandingFooter.jsx` legge `mini.footer` (struttura affine); `PaginaPage` legge `mini.footer_cfg`. Verificare quale usa il componente che tocchi.

### `theme`
```json
{ "primaryColor": "#00b5b5", "bgColor": "#ffffff", "textColor": "#1a1a2e",
  "fontHeading": "playfair", "fontBody": "inter", "headerStyle": "solid", "borderStyle": "mixed" }
```
- `fontHeading`: `playfair | cormorant | raleway | montserrat | nunito | dm-sans` · `fontBody`: `inter | lato | open-sans`
- `headerStyle`: `solid | gradient | cover` · `borderStyle`: `rounded (16px) | mixed (8px) | square (0px)`

### `services` / `activities` / `excursions`
```json
// services
[{ "id": "uuid", "icon": "pool", "name": "Piscina", "description": "...", "hours": "09:00–19:00" }]
// activities (per categoria)
[{ "id": "uuid", "category": "Sport", "items": [{ "id": "uuid", "name": "Kayak", "description": "...", "location": "...", "schedule": "...", "ageGroup": "tutti", "bookable": true, "photo_url": "...", "active": true }] }]
// excursions (flat)
[{ "id": "uuid", "name": "...", "description": "...", "price": 45, "duration": "8 ore", "meeting_point": "...", "seats": 12, "dates": "Ogni martedì", "includes": "...", "photo_url": "...", "active": true }]
```

### Editor pagine CMS (`pagine`)
Builder a blocchi (23 tipi in 5 gruppi), drag&drop handle-only, SEO, slug auto. ⚠️ Drag&drop: i componenti riga vanno definiti come funzioni normali chiamate `{renderXxx(item)}`, NON componenti React inline (causano unmount/remount → rompe il drag). Vedi nota 22 in `../CLAUDE.md`.

---

## Convenzioni UI (riepilogo — dettaglio in `../CLAUDE.md`)
- Tutto **inline styles**, nessun CSS framework.
- Icone `lucide-react`: `strokeWidth={1.5}` sempre, `color={primary}`.
- Form in liste dinamiche: testo `onChange` locale → `onBlur` propaga; select/toggle/file `onChange` diretto.
- URL Storage: cache-buster `?v={timestamp}` — non rimuovere.
