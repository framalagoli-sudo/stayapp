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
| 1 | **Guest/PWA + Minisito pubblico** | 🟡 | 🟡 | 🟡 | ⬜ | IN CORSO — vedi dettaglio sotto |
| 2 | Operativo (Dashboard, Richieste, Prenotazioni, Booking, Recensioni, Survey) | ✅API | ⬜ | ⬜ | ⬜ | |
| 3 | Entità (Info, Galleria, Menu, Tema, Chatbot, Domini) | ✅API | ⬜ | ⬜ | ⬜ | Sito web già fatto ✅ |
| 4 | Marketing/CRM (Contatti, Newsletter, Automazioni, Blog, Piano Editoriale, Content Studio, AI Site Builder, Preventivi, Shop, Loyalty, Eventi, Analytics) | ✅API | 🟡 | 🟡 | ⬜ | Form Builder ✅ già fatto |
| 5 | Account/Piattaforma (Collaboratori, Integrazioni, SEO, Impostazioni, Sicurezza, Aziende/Strutture/Utenti) | ✅API | ⬜ | ⬜ | ⬜ | |

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

**Da rivedere ⬜ (prossima sessione)**
- `AttivitaApp.jsx` / `AttivitaPWA.jsx` (PWA attività) — ha form contatto `/api/guest/contact`
- Minisito varianti `LandingRistorante` / `LandingAttivita` / `LandingStruttura`
- Pagine dettaglio guest: `EventoPage`, `OffertaPage`, `PacchettoPage`, `GuestSubPage`, `PaginaPage`, `NewsletterArchivePage`
- `ServicesTab` (verificare guestFetch/funzionale)
- PWA tecnica: manifest, service worker, InstallButton/InstallBanner, icone

## FASE 1 — Consolidamento funzionale
(Si compila man mano che la Fase 0 chiude ogni modulo.)

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
