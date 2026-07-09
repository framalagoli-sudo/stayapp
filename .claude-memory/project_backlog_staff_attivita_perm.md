---
name: project_backlog_staff_attivita_perm
description: "BACKLOG — permessi staff per attività sono tutto-o-niente (booleano), non per-entità come struttura/ristorante"
metadata: 
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

**Backlog (non urgente, è una feature non un bug).** Trovato 9/7 durante l'audit "ogni feature deve valere per struttura/ristorante/attività".

I permessi staff sono asimmetrici (`StaffPage.jsx`, modello `profile.permissions`):
- **struttura** e **ristorante**: selezione **per-entità** via array di id (`struttura_ids`, `ristorante_ids`) → si può dare accesso a UNA sola struttura/ristorante.
- **attività**: singolo booleano `attivita_gestione` (tutto-o-niente) → niente `attivita_ids`.

**Conseguenza**: un'azienda con più attività non può dare a uno staff l'accesso a *una sola* attività (o tutte o nessuna).

**Come applicare quando si farà**: introdurre `attivita_ids` speculare a struttura/ristorante (filtro in `AziendaContext.loadData` righe ~80-82 già filtra `perm.attivita_ids?.length` → il campo è già previsto lato context ma non popolato/gestito nell'editor permessi di StaffPage). Aggiornare l'editor permessi staff per la selezione per-attività + la label in `StaffPage` (riga ~143 mostra solo "Gestione attività" senza nomi, vs struttura/ristorante che listano i nomi).

Vedi [[feedback_entita_tre]]. Residuo #1 dello stesso audit (moduli default in `public/register`) già sistemato.
