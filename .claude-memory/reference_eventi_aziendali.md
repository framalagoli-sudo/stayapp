---
name: reference_eventi_aziendali
description: "Evento \"aziendale\" (entity=null) compare sui siti di TUTTE le entità della sua azienda; API guest eventi scopata per azienda"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Modello eventi (tabella `eventi`): ogni evento ha `entity_tipo`/`entity_id` (opzionali) + `azienda_id`. Un evento **senza entità** (`entity_id=null`) è **aziendale**.

Regola resa esplicita 9/7 in `/api/guest/eventi/route.js`: dato `?entity_tipo&entity_id`, l'API risolve l'azienda dell'entità (`getEntityAziendaId`) e restituisce gli eventi di quell'entità **OR** gli eventi aziendali (`entity_id is null AND azienda_id = <risolta>`). → un evento aziendale compare sui siti di TUTTE le entità di quell'azienda. Il blocco `eventi` di `LandingBlockRenderer` passa sempre `entity_tipo+entity_id`.

Sicurezza: il branch aziendale filtra per `azienda_id` (niente leak cross-tenant, verificato a freddo + curl live). `entity_id` validato UUID prima dell'interpolazione nel filtro `.or()` PostgREST.

Bug collegati risolti stessa sessione: l'editor eventi (`EventoEditPage`) offriva solo struttura/ristorante nel selettore associazione → aggiunta **attività** (Inlingua è un'attività; violava anche [[feedback_entita_tre]]). Se un evento aziendale "non si vede" nel blocco: era proprio questo (l'evento non aveva entità e l'API pre-fix filtrava solo per entità). Vedi anche [[reference_lucide_global_shadow]] (crash editor eventi, stessa sessione).

**⚠️ Vincolo DB (migration 068)**: la tabella `eventi` è più vecchia del supporto attività → il CHECK `eventi_entity_tipo_check` ammetteva solo struttura/ristorante. Associare un evento a un'**attività** dava **500 in salvataggio** (il fix "attività nel selettore" era incompleto senza questo). Migration 068 allarga il CHECK a `attivita` (NULL resta valido = aziendale). Lezione: aggiungendo un valore a una colonna con enum-lato-codice, controllare SEMPRE il CHECK constraint DB.

**Auto-associazione (scelta di Francesco)**: preferisce che ogni entità veda **solo i suoi** eventi. Quindi in `EventoEditPage`, se l'azienda ha **una sola entità**, il nuovo evento si associa in automatico a quella (evita l'aziendale per sbaglio) — una volta sola, non forza se poi l'utente sceglie "nessuna associazione". L'**aziendale = su tutti i siti** resta come opzione esplicita per aziende multi-sede. L'evento inLingua è stato ri-associato all'attività (non più aziendale). Migration 067 = notifiche email, vedi [[reference_eventi_notifiche_email]].
