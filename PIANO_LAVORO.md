# Piano di lavoro — OltreNova / StayApp

> Documento vivo. Tracker della ricognizione modulo per modulo prima dei nuovi sviluppi.
> Principio: **prima fondamenta sane (sicurezza + bug), poi consolidamento, poi feature nuove.**
> Aggiornato: 2026-06-15

## 🏁 STATO: FASE 0 COMPLETA — sicurezza + data-write verificati su tutti e 6 i blocchi
Sicurezza multi-tenant blindata end-to-end (IDOR su tutta l'API, 2FA + permessi staff
enforced server-side e verificati live). Perdita dati cacciata su ogni blocco: trovati e
fixati form contatto guest (lead persi), overbooking eventi, manifest PWA, +2FA/permessi.
Tutti gli altri contratti data-write verificati allineati. Resta il deep-funzionale UI/edge
per-modulo (Fase 1) dove serve.

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
| 2 | Operativo (Dashboard, Richieste, Prenotazioni, Booking, Recensioni, Survey) | ✅ | ✅ | ✅ | ⬜ | **CHIUSO data-write**: Dashboard read-only; status updates (richieste/prenotazioni/recensioni) contratti ok + securizzati; Booking risorse config (disponibilita/blocchi) in ALLOWED; survey/genera-link allineati. Zero perdita dati |
| 3 | Entità (Info, Galleria, Menu, Tema, Chatbot, Domini) | ✅ | ✅ | 🟡 | ⬜ | **Data-write verificato**: Menu (max rischio) SOLIDO — mutazioni immutabili, persist→menuRef, save ok + aggiunto guard modifiche-non-salvate. Info/Galleria/Tema via hook save() con campi allineati. Zero perdita dati. Sito web ✅. Deep UI/edge per tab da fare |
| 4 | Marketing/CRM (Contatti, Newsletter, Automazioni, Blog, Piano Editoriale, Content Studio, AI Site Builder, Preventivi, Shop, Loyalty, Eventi, Analytics) | ✅ | 🟡 | 🟡 | ⬜ | **Triage data-write FATTA**: contratti frontend↔route verificati su 9 moduli → tutti allineati, ZERO perdita dati (il bug guest era isolato). Eventi: overbooking già fixato. Form Builder ✅. Resta deep-review UI/edge-case per modulo |
| 5 | Account/Piattaforma (Collaboratori, Integrazioni, SEO, Impostazioni, Sicurezza, Aziende/Strutture/Utenti) | ✅ | ✅ | ✅ | ⬜ | **CHIUSO** sicurezza+funzionale. 2FA + permessi staff enforced (live). Impostazioni: route sync-subdomains creato (era 404). SecurityPage/SeoGeo/Integrazioni ok |

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

## Miglioria trasversale suggerita
- **Guard "modifiche non salvate" (beforeunload)**: aggiunto al Menu. Stesso rischio (perdita
  lavoro navigando via senza salvare) su altri editor con `dirty` — es. `PaginaEditorPage`
  (Sito web). Valutare di estenderlo.

## FASE 1 — Consolidamento funzionale
(Si compila man mano che la Fase 0 chiude ogni modulo.)

## ⚠️ FINDING APERTO — Enforcement server-side (sessione dedicata, priorità ALTA)

### ✅ 2FA obbligatorio — ENFORCED server-side (FATTO)
`requireAuth` ora applica il 2FA: se `aal !== 'aal2'` e l'azienda ha `require_2fa` → 403
`mfa_required`. Ottimizzato (aal2 esce senza query DB). Esenti `/api/auth/*` + super_admin
senza azienda. Il client (AuthContext via supabase diretto + AdminGuard) gestisce già il
redirect a mfa-verify/security, quindi nessuno resta chiuso fuori. Deploy + smoke ok.

### ✅ Permessi staff — ENFORCED server-side (FATTO)
`requireAuth` ora applica i permessi via `enforcePermission`: una mappa prefisso-route→permesso
gate le MUTAZIONI (POST/PATCH/PUT/DELETE) — uno `staff` può mutare solo le sezioni concesse.
Le GET restano libere (Dashboard e cross-sezione intatti). Solo `staff` ristretto;
admin_azienda/super_admin pieni. Helper `hasPermission(profile, key)` esportato.
Verificato live: staff con solo `contatti` → POST newsletter 403, POST contatti 201.
Nota: i permessi gate le SCRITTURE; le letture intra-azienda restano accessibili (scelta
consapevole per non rompere Dashboard/Preventivi). Se in futuro serve gate anche letture
sensibili (es. PII contatti) → OR-mapping per route condivise.

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
