---
name: session-2026-06-07-nextjs-superadmin-fix
description: "Fix super_admin selector azienda, piano_editoriale azienda_id mancante nei fetch, struttura layout, EntitySwitcher navigazione"
metadata: 
  node_type: memory
  type: project
  originSessionId: 86a4ddb3-2e45-4424-877e-cc408b497381
---

## Fix super_admin pannello Next.js (2026-06-07)

**Commit chiave:** `49a68e2`, `d02003a`, `fa6badd`, `43dc85b`, `9ae65cd`

### Bug risolti

**AziendaContext + AdminLayout — selettore azienda super_admin:**
- `activeAziendaId` (sessionStorage) aggiunto al context
- Selettore nella sidebar carica tutte le aziende da `/api/aziende`
- `handleAziendaChange`: naviga alla prima entità dell'azienda selezionata (struttura → ristorante → attività), NON a `/admin` generico
- `getAllEntities()` esposto dal context per cercare in tutte le entità non filtrate (necessario perché state è già filtrato al momento del cambio)
- EntitySwitcher entità singola: era `<div>` non cliccabile, ora `<button>` che naviga all'info page
- "Sito & App" super_admin: visibile anche senza URL entità se `activeAziendaId` ha `activeSitoId`

**Bug critico piano_editoriale:** `aziendaId` era calcolato nel componente ma MAI passato ai fetch API. Tutti gli `apiFetch` andavano senza `azienda_id` → server restituiva dati non filtrati. Fix: aggiunto `&azienda_id=${aziendaId}` a tutti i fetch e `aziendaId` nelle dipendenze `useEffect`.

**Struttura layout mancante:** `app/admin/struttura/[id]/layout.js` non esisteva → `PropertyIdContext` mai fornito → `useProperty()` leggeva sempre `profile.property_id` (statico) → cambiare struttura non ricaricava i dati. Creato il layout che inietta `params.id`.

**Piano editoriale lista crash:** `navigate={navigate}` passato a `PostRow` ma `navigate` non dichiarato → ReferenceError. Rimosso.

**Server piano_editoriale.js:** `getProfileData()` helper per super_admin — legge `azienda_id` da `req.query` (GET) o `req.body` (POST). Se super_admin senza azienda_id: restituisce tutto. Se con: filtra.

### Stato migrazione Next.js
- Pannello admin funzionante ✅
- Test pannello in corso strada facendo con progetto reale (parte domani)
- **Pending:** cutover dominio `oltrenova.com` → `oltrenova-next` Vercel project
- **Pending:** smoke test da aggiornare per Next.js
- **Pending:** PWA guest (next-pwa) — bassa priorità ora

### Pattern da ricordare
Qualsiasi valore filtro calcolato lato client va verificato che arrivi effettivamente nelle query API, non solo che venga computato. Vedi [[feedback-traccia-dato-fino-api]].
