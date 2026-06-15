# Piano di lavoro — OltreNova / StayApp

> Documento vivo. Tracker della ricognizione modulo per modulo prima dei nuovi sviluppi.
> Principio: **prima fondamenta sane (sicurezza + bug), poi consolidamento, poi feature nuove.**
> Aggiornato: 2026-06-15

## Legenda stato
- 🔒 Sicurezza (authz multi-tenant, IDOR, leak)
- 🐛 Bug bloccanti / funzionali
- ⚙️ Funzionale (fa quello che promette, edge case, UX)
- 🚀 Pronto per sviluppi futuri (codice pulito, niente debito)
- Stati: ✅ fatto · 🟡 in corso · ⬜ da fare · — non applicabile

---

## FASE 0 — Fondamenta sane (sicurezza + bug bloccanti)

### Trasversale
| Area | 🔒 | 🐛 | Note |
|---|---|---|---|
| **Audit sicurezza API multi-tenant** | ✅ | ✅ | ~19 IDOR chiusi su collection + 31/31 route `[id]`. Primitive in `server-auth.js`. Vedi memory `project_session_2026_06_15c_security` |

### Moduli — ricognizione funzionale profonda (depth "come Sito web")
Ordine scelto da Francesco:

| # | Blocco | 🔒 | 🐛 | ⚙️ | 🚀 | Note |
|---|---|---|---|---|---|---|
| 1 | **Guest/PWA + Minisito pubblico** | ✅ | ✅ | ✅ | ✅ | **CHIUSO** — PWA su 3 entità, data-write verificati, sicurezza, overbooking, manifest. Vedi dettaglio sotto |
| 2 | Operativo (Dashboard, Richieste, Prenotazioni, Booking, Recensioni, Survey) | ✅API | ⬜ | ⬜ | ⬜ | |
| 3 | Entità (Info, Galleria, Menu, Tema, Chatbot, Domini) | ✅API | ⬜ | ⬜ | ⬜ | Sito web già fatto ✅ |
| 4 | Marketing/CRM (Contatti, Newsletter, Automazioni, Blog, Piano Editoriale, Content Studio, AI Site Builder, Preventivi, Shop, Loyalty, Eventi, Analytics) | ✅API | 🟡 | 🟡 | ⬜ | Form Builder ✅ già fatto |
| 5 | Account/Piattaforma (Collaboratori, Integrazioni, SEO, Impostazioni, Sicurezza, Aziende/Strutture/Utenti) | 🟡 | 🟡 | ⬜ | ⬜ | Gestione aziende/utenti VERIFICATA sicura. 2 finding (permessi + 2FA non enforced server-side) → sessione dedicata. Resta funzionale: SecurityPage, Impostazioni, SEO, Integrazioni |

---

## Già completato (questa serie di sessioni)
- ✅ **Sito web** (Pagine CMS + editor blocchi + rendering pubblico): bug navigazione `navigate→router`, anteprima bozze `?preview=1`, salvataggio con feedback errore. 24/24 blocchi renderizzano.
- ✅ **Form Builder**: email Resend (env vuote su Vercel), bug `.catch()` Postgrest, UX consensi GDPR, CRM upsert, autoresponder.
- ✅ **Audit sicurezza** completo lato API.

### Dettaglio blocco 1 — Guest/PWA + Minisito pubblico
**Rivisto ✅**
- Entry point `s/[slug]/page.js` (minisito vs PWA via `?qr=1`) — ok
- `GuestApp.jsx` (PWA struttura: Home/Esplora/Richiesta/Chat/Info, booking eventi) — funzionale ok
- Minisito `LandingBlockRenderer` — 24/24 blocchi renderizzano (rivisto in sessione Form Builder)
- **Sicurezza chat** `/api/messages` GET inbox + POST staff → auth+proprietà; `/read` proprietà. Helper `userCanAccessProperty`.
- **Convenzione guestFetch** allineata: GuestApp, RequestForm, ActivitiesTab, ExcursionsTab + puliti import morti apiFetch in RestaurantApp/AttivitaApp/AttivitaPWA

**Rivisto ✅ (cont.)**
- `RestaurantApp.jsx` + `MenuTab.jsx` (PWA ristorante + menu pubblico) — solido, nessun fix. MenuTab gestisce catalogo + menu singolo, preserva tutti i campi piatto (active:false nascosti ma conservati). Nessuna perdita dati lato render.
- **🐛 PERDITA DATI FIXATA** — form contatto (blocco minisito + PaginaPage + AttivitaPWA) inviavano `nome/messaggio`, route leggeva `name/message` → ogni lead perso (400 silenzioso). Route ora tollerante. Verificato live: salva nel CRM. + LandingBlockRenderer → guestFetch.

**Data-write Guest — TUTTI i contratti di campo verificati ✅**
- Contatto `/api/guest/contact` → era rotto, FIXATO + verificato live
- Richieste `/api/requests` (RequestForm/ActivitiesTab/ExcursionsTab) → ok
- Booking eventi `/api/guest/eventi/[id]/book` (GuestApp + EventoPage) → campi ok
- Booking tavoli/risorse `/api/booking/public/prenota` (BookingWidget) → campi ok, payload completo
- Newsletter `/api/contatti/subscribe` → ok
- ✅ **Overbooking eventi FIXATO** (deciso: pending riservano i posti). `seats_booked` ora = somma posti non-cancelled, ricalcolato da event_bookings (helper `recomputeEventSeats`) su booking guest + cambio stato admin. + 2 IDOR chiusi su event_bookings (PATCH/GET). Backfill: corretto 1 evento (0→3 posti reali non contati). Verificato live.

**✅ PWA Attività CABLATA** (Francesco: la vuole attiva — palestre, corsi lingue, ecc.)
- Route `/a/[slug]` ora branccia: QR + `pwa.active !== false` → `AttivitaPWA` (installabile); altrimenti minisito. Pattern identico a struttura/ristorante.
- Toggle admin "App Clienti attiva" già esistente in `AttivitaModuliPage` (salva `attivita.pwa.active`, default ON).
- QR code già genera `/a/:slug?qr=1`. Mancava solo il branching nel route → aggiunto.
- `AttivitaApp.jsx` eliminato (superato dal branching server-side).

**Rivisto ✅ (display)**
- `LandingAttivita` / `LandingRistorante` / `LandingStruttura` + `GuestSubPage` — guestFetch ovunque (pageview/eventi/pagine/recensioni/sitemap), nessun form data-write, convenzione ok. Puliti.

**Rivisto ✅ — PWA tecnica (polish)**
- 🐛 **Manifest `start_url` FIXATO**: era `?source=pwa` (senza `?qr=1`) → la PWA installata apriva il MINISITO invece dell'app, su tutte e 3 le entità. Ora `?qr=1&source=pwa`.
- InstallButton/InstallBanner: solidi (Android beforeinstallprompt, iOS Safari istruzioni, iOS Chrome nascosto, nascosti se già installato).
- Icone 192/512/apple-touch presenti. Service worker generato da next-pwa. theme_color/display:standalone ok.
- Navigazione interna PWA preserva `qr=1` (switchTab) → resta in modalità app.
- Minisito varianti `LandingRistorante` / `LandingAttivita` / `LandingStruttura`
- Pagine dettaglio guest: `EventoPage`, `OffertaPage`, `PacchettoPage`, `GuestSubPage`, `PaginaPage`, `NewsletterArchivePage`
- `ServicesTab` (verificare guestFetch/funzionale)
- PWA tecnica: manifest, service worker, InstallButton/InstallBanner, icone

## FASE 1 — Consolidamento funzionale
(Si compila man mano che la Fase 0 chiude ogni modulo.)

## ⚠️ FINDING APERTO — Enforcement server-side (sessione dedicata, priorità ALTA)

### ✅ 2FA obbligatorio — ENFORCED server-side (FATTO)
`requireAuth` ora applica il 2FA: se `aal !== 'aal2'` e l'azienda ha `require_2fa` → 403
`mfa_required`. Ottimizzato (aal2 esce senza query DB). Esenti `/api/auth/*` + super_admin
senza azienda. Il client (AuthContext via supabase diretto + AdminGuard) gestisce già il
redirect a mfa-verify/security, quindi nessuno resta chiuso fuori. Deploy + smoke ok.

### Permessi staff non applicati server-side
I permessi granulari `staff` (profiles.permissions: richieste/contatti/newsletter/...) sono
**salvati e usati solo client-side** (nascondono la sidebar). **Nessun route API li verifica** →
un collaboratore `staff` può chiamare le API direttamente e scavalcare i limiti del titolare
(intra-azienda; lo scoping azienda regge, non vede altre aziende).
**Perché serve design, non un fix rapido**: molte route sono condivise tra sezioni (es.
`/api/contatti` serve Contatti MA anche Preventivi/Dashboard). Gating naïf route-per-route
romperebbe accessi legittimi. Da fare: mappa permesso↔risorsa + dipendenze cross-sezione +
helper `hasPermission(profile, key)` (solo `staff` ristretto; admin_azienda/super_admin pieni) +
test per ruolo. Modello permessi: vedi `StaffPage.jsx` (PERM_OPERATIVO/MARKETING/ACCOUNT).

## FASE 2 — Predisposizione sviluppi futuri
- Stripe billing (Sprint 10), Multi-lingua IT/EN/DE, GitHub→Vercel auto-deploy, Notifiche realtime.
- Refactor/pulizia emersi durante Fase 0-1 (raccolti qui).

---

## Hardening minori in sospeso (bassa priorità, da valutare)
- Anteprima `?preview=1` mostra bozze a chiunque abbia l'URL → eventuale gating con login.
- `SitoPage` `move()` frecce ▲▼ opera su array completo (glitch ordine; DnD primario ok).
- Tipo blocco `contatti` legacy senza editor admin.
- Edge: utenti non-super con `azienda_id` null → scope salta in alcuni route.
- Integrità `entity_id` non verificata su POST `automazioni`/`recensioni` (record è dell'azienda giusta).
