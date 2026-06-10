---
name: project-session-2026-06-04b
description: "Session 2026-06-04b — Fix critico QR code: guestFetch su tutte le pagine guest, deploy ✅"
metadata:
  node_type: memory
  type: project
  originSessionId: session-2026-06-04b
---

## Completato in questa sessione

### Fix critico: QR code non caricava al primo accesso

**Causa root:** `apiFetch` chiama sempre `supabase.auth.getSession()` prima di ogni richiesta. Se nel browser dell'utente era salvata una sessione admin scaduta, Supabase faceva una chiamata di rete per rinnovarla — bloccando il caricamento iniziale. Al secondo accesso (refresh) funzionava perché la sessione era già stata rinnovata.

**Fix:** aggiunta `guestFetch` in `client/src/lib/api.js` — plain fetch senza nessun tocco a Supabase. Tutte le pagine pubbliche/guest ora usano `guestFetch` per tutte le chiamate `/api/guest/*`, `/api/blog/public*`, `/api/contatti/subscribe`.

**File modificati (12):**
- `client/src/lib/api.js` — aggiunta funzione `guestFetch`
- `RestaurantApp.jsx`, `GuestApp.jsx`, `AttivitaApp.jsx`, `AttivitaPWA.jsx` — fetch iniziale → guestFetch
- `LandingRistorante.jsx`, `LandingStruttura.jsx`, `LandingAttivita.jsx` — tutti i fetch → guestFetch
- `PaginaPage.jsx`, `EventoPage.jsx`, `OffertaPage.jsx`, `PacchettoPage.jsx` — tutti i fetch → guestFetch

**Commit:** `d095374` — deployato su oltrenova.com ✅

### Richiesta esterna rifiutata
Francesco ha ricevuto una richiesta esterna per costruire un "AI agent che recensisce su TrustPilot/TripAdvisor/Google". Rifiutato: illegale (Direttiva Omnibus UE 2023), violazione ToS piattaforme, rischio sanzioni AGCM. Francesco era d'accordo — era per valutare se accettare il lavoro da un cliente.

**Why:** Bug segnalato da clienti reali. La causa era la dipendenza da `apiFetch` su pagine pubbliche che non richiedono auth.
**How to apply:** Regola generale: pagine/componenti guest devono sempre usare `guestFetch`, mai `apiFetch`. `apiFetch` solo in pagine admin autenticate.
