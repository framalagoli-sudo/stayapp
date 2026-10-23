---
name: project_backlog_staff_attivita_perm
description: "BACKLOG — i permessi staff PER ENTITÀ (struttura_ids/ristorante_ids/attivita_ids) valgono solo nel menu: il server non li applica (23/10)"
metadata:
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
  modified: 2026-10-23T08:31:13.950Z
---

**Stato al 23/10/2026** (la versione del 9/7 è superata: `StaffPage.jsx` ha ormai il selettore per-attività come per strutture e ristoranti).

- Dal 23/10 il server applica i permessi **per sezione** a letture e scritture (`PERMESSI_STAFF` in `lib/server-auth.js`, SECURITY.md invariante 27, sonda `probe-permessi-collaboratori.mjs`).
- **Manca**: i permessi **per entità** (`struttura_ids`, `ristorante_ids`, `attivita_ids`) filtrano solo il menu/`AziendaContext`. Lato server un collaboratore col permesso del sito tocca **tutte** le entità della sua azienda.
- Altro limite visto lo stesso giorno: un collaboratore con «Richieste» senza `property_id` vede la lista vuota (`userCanAccessProperty`).

**Perché non urgente**: al 23/10 nessun collaboratore attivo su nessuna azienda. Da fare prima che un cliente con più sedi dia accesso a un collaboratore: applicare gli id in `requireEntityAccess` (e nelle route per-entità) quando il profilo è staff, e allargare la sonda con un collaboratore limitato a una sola entità.

Vedi [[feedback_entita_tre]].
