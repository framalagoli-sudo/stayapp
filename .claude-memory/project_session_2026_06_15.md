---
name: project_session_2026_06_15
description: "Session 2026-06-15 — Fix sistemico super_admin azienda_id su 6 pagine + 5 route, fix newsletter searchParams 500"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## Bug sistemico super_admin: azienda_id non passato alle API ✅ FIXATO

**Root cause**: 6 pagine calcolavano `aziendaId` da `useAzienda()` ma non lo passavano alle chiamate API GET. Il server restituiva tutti i dati (di tutte le aziende) per super_admin quando mancava `?azienda_id=`.

**Pagine fixate:**
- `ContattiPage.jsx` — `load()` ora passa `?azienda_id=`
- `NewsletterPage.jsx` — `fetchList()` ora passa `?azienda_id=` + `useEffect([aziendaId])` invece di `[profile]`
- `DashboardPage.jsx` — tutti e 7 i fetch passano `?azienda_id=` quando disponibile
- `PreventivoEditorPage.jsx` — aggiunto `useAuth` + aziendaId computation, fetch contatti filtrato

**Route aggiornate per accettare `?azienda_id=` da super_admin:**
- `app/api/newsletter/route.js` ✅ (+ fix searchParams mancante → 500)
- `app/api/recensioni/route.js` ✅
- `app/api/requests/route.js` ✅ (join properties per filtrare per azienda)
- `app/api/analytics/route.js` ✅ (refactor: `!isSuperAdmin` → `allEntityIds.length`, azienda_id da query param)
- `app/api/booking/prenotazioni/route.js` ✅

## Bug newsletter searchParams undefined → 500

Avevo aggiunto `else if (searchParams.get(...))` senza prima estrarre `searchParams` dalla request.
Fix: aggiunta riga `const { searchParams } = new URL(request.url)` prima del blocco filtro.

## Email conferma form "Il tipico umbro"

L'autoresponder è disabilitato per default su tutti i form. Il toggle "Email di conferma all'utente" va abilitato manualmente nel Form Builder editor → salva.

**How to apply:** Ricordare a Francesco di abilitare il toggle nel Form Builder per ogni form dove vuole l'autoresponder.
