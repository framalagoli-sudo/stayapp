---
name: project_session_2026_06_15c_security
description: "Session 2026-06-15c — Audit sicurezza multi-tenant completo: chiusi ~19 IDOR su collection + tutti i 31 route [id]. Primitive auth riusabili."
metadata:
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## Contesto
Debug del modulo "Sito web" ha rivelato un bug critico (`SitoPage.jsx`: hook assegnato a `navigate` ma chiamato `router` → navigazione rotta) E un IDOR su `/api/pagine`. Francesco vende la piattaforma → sicurezza multi-tenant = priorità assoluta. Fatto audit sistematico di TUTTA l'API.

## Primitive di autorizzazione create in `lib/server-auth.js` (RIUSARE SEMPRE)
- **`requireEntityAccess(request, entity_tipo, entity_id)`** → auth + verifica che l'entità (struttura/ristorante/attivita) appartenga all'azienda dell'utente. 404 se no.
- **`requireRecordAccess(request, table, id, aziendaColumn='azienda_id')`** → per record con colonna `azienda_id` diretta (eventi, articoli, collegamenti, ...). Carica, verifica, 404.
- **`resolveAziendaId(profile, body.azienda_id)`** → onora `body.azienda_id` SOLO per super_admin; gli altri sono vincolati alla propria azienda. Usare in OGNI POST che accetta azienda_id.
- **`getEntityAziendaId(tipo, id)`** + `ENTITY_TABLES` = { struttura: properties, ristorante: ristoranti, attivita: attivita }.

## Batch #1 — collection routes (commit 83989dd)
IDOR chiusi: `pagine` GET/POST/reorder/[id], `contatti` POST, `eventi` POST, `blog` POST, `booking/risorse` POST (tutti onoravano `body.azienda_id` senza gate ruolo), `collegamenti` GET (no scope) + POST (azienda arbitraria), `domini` GET auto-subdomain.
Bug funzionale: `SitoPage.jsx` navigate→router.

## Batch #2 — TUTTI i 31 route [id] verificati (commit 4cd0a72)
**Corretti (IDOR confermati):** eventi/[id], blog/[id], collegamenti/[id], blog/categories/[id] (+collection GET/POST), booking/risorse/[id] (PATCH/DELETE), booking/prenotazioni/[id], booking/promozioni/[id] (via risorsa), requests/[id] (via property), aziende/[id] GET (leak P.IVA/PEC di ogni azienda).
**Verificati GIÀ sicuri (21):** contatti, recensioni, domini, automazioni, form-builder, newsletter, shop/prodotti, shop/ordini, preventivi, blog-automazioni, loyalty/gift-cards, loyalty/contatto, piano-editoriale ×3, webhooks, demo, properties, ristoranti, attivita, users.

## Pattern di sicurezza del progetto (per riconoscere SAFE vs IDOR)
- **SAFE**: mutazione con `.eq('id', params.id).eq('azienda_id', profile.azienda_id)` (per non-super), oppure `requireRecordAccess`/`requireEntityAccess`, oppure role-gate esplicito.
- **IDOR**: `.update()/.delete().eq('id', params.id)` SENZA scope azienda. ATTENZIONE: alcuni route avevano il GET protetto ma PATCH/DELETE no (es. booking/risorse) → l'euristica "menziona azienda" dà falsi negativi, verificare ogni handler.
- **body.azienda_id**: deve passare da `resolveAziendaId`. Route già corretti pre-esistenti: attivita/ristoranti/properties/form-builder/users-invite/piano-editoriale (gate su super_admin).

## Aggiunta — chat ospite `/api/messages` (trovato dopo, fuori dall'audit azienda_id)
Il route `/api/messages` non usa azienda_id né è `[id]` → sfuggito ai grep. Era **tutto pubblico**:
- GET con solo `property_id` (inbox admin) → leggeva TUTTE le conversazioni di qualsiasi struttura → ora `requireAuth` + `userCanAccessProperty`.
- POST `sender:'staff'` → impersonazione reception → ora auth+proprietà. Lato guest (session_id + sender='guest') resta pubblico.
- Nuovo helper **`userCanAccessProperty(profile, property_id)`** (property→azienda, ruoli admin_struttura/staff su property_id). Usabile anche per `requests`.
**Lezione**: l'audit per azienda_id non copre risorse scopate per `property_id` o pubbliche per sessione — controllarle a parte.

## Note
- CI user smoke test = **super_admin** → gli smoke validano build + path super_admin, NON il blocco multi-tenant (che è verificato a livello di codice). 37/37 ✅ su entrambi i batch.
- Ruoli enum: super_admin | admin_gruppo | admin_azienda | admin_struttura | staff. (Nel codice si vede sia admin_azienda che admin_gruppo.)
- Resta possibile (bassa prio): edge case utenti non-super con azienda_id null → scope salta; integrità entity_id su automazioni/recensioni POST (record è dell'azienda giusta ma entity_id non verificato).
