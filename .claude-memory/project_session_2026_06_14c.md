---
name: project_session_2026_06_14c
description: "Session 2026-06-14c — Form Builder template picker, CRM upsert booking, fix filtro azienda Form Builder"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## Form Builder template picker (FormBuilderListPage.jsx)
- "Nuovo form" apre modal con 5 template: Form contatti, Richiesta preventivo, Candidatura lavoro, Feedback/Recensione, Form vuoto
- Ogni template ha campi pre-compilati + consenso GDPR già incluso
- POST passa `azienda_id` dal contesto per evitare il bug "Nessuna azienda"

## CRM upsert su ogni richiesta
- `guest/book/route.js`: ora fa upsert su `contatti` dopo ogni prenotazione attività/escursione dalla PWA
  - Legge `azienda_id` da struttura o ristorante
  - Crea contatto con tag `['prenotazione', entity_tipo]`, fonte `'pwa'`
  - Aggiorna nota se contatto già esiste
  - Trigger `nuovo_contatto` automazione
- `guest/contact/route.js` e `form-builder/submit/route.js` erano già coperti

## Blocco contatti hardcoded rimosso
- `lib/blockTypes.js`: rimosso `contatti`, rinominato `form_builder` → "Form contatti"
- `PaginaEditorPage.jsx`: rimosso `contatti` dall'auto-render array
- `LandingBlockRenderer.jsx`: `case 'contatti': return null` (backward compat.)

## Fix filtro azienda Form Builder
- Bug: super_admin vedeva TUTTI i form di tutte le aziende
- Fix: `FormBuilderListPage.jsx` ora usa `useAzienda()` + `useAuth()` per ottenere `aziendaId`
  - Pattern: `azienda?.id || profile?.azienda_id || activeAziendaId || strutture?.[0]?.azienda_id`
  - Fetch: `?azienda_id=${aziendaId}` passato sia in GET che in POST
  - `useEffect` dipende da `aziendaId` per ricaricare al cambio azienda

**Why:** super_admin non ha `azienda_id` nel profilo, il server filtrava solo se `?azienda_id=` era in query string — ma la pagina non lo passava.

## Deploy: 37/37 smoke test ✅ (sessione precedente)
