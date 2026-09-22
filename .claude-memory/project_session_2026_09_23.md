---
name: project-session-2026-09-23
description: "Sessione 23/09 (Ettore) — hydration evento/blog era la LINGUA, condivisione articoli con URL vuoto, ?back= aperto, domini tripli dal giro notturno; nessuna migration"
metadata:
  node_type: memory
  type: project
  originSessionId: 6473d404-e9d1-4c54-a639-5864c6f60bbb
  modified: 2026-09-22T23:46:06.230Z
---

Prima sessione in cui l'assistente si chiama **Ettore** ([[user-nome-assistente]]).

**Fatto e live** (commit `8ddffecd`, `8e386ed1`):
1. Hydration #418 su evento e blog: con un browser in inglese il server rendeva `/en` e il componente client — che leggeva `_lang` da `useSearchParams`, dove non c'è — disegnava in italiano. Ora `lingua`/`dominioCliente` arrivano come prop → [[project_backlog_hydration_evento]]
2. Pulsanti di condivisione degli articoli con URL vuoto in produzione (valore da `window` nel render: React in produzione tiene l'attributo del server).
3. `?back=` verso siti esterni → `lib/percorso-interno.js`, SECURITY §0 inv. 19.
4. Giro di riparazione sottodomini che creava tre righe per entità → nota 48 `CLAUDE.md`. Ripuliti i due di Ristorante Borgo del Lago con `npx vercel api` + delete della riga.

**Lezioni**:
- La diagnosi del 22/09 era giusta per localhost e sbagliata per la produzione: **stesso host e stessa lingua** dell'ambiente che fallisce, prima di fidarsi → [[feedback_sandbox_non_e_live]]
- Scrivendo in un documento «ho cercato tutti i punti», la ricerca va fatta **prima**: l'avevo scritto e poi verificato (era vero, ma per caso).
- `*>` in PowerShell 5.1 su `deploy.ps1` trasforma un avviso npm su stderr in errore fatale: lanciare lo script come processo `powershell.exe -File` separato.

**Documenti aggiornati**: `CLAUDE.md` (note 47–48), `FEATURES.md`, `PROGETTO.md` (§11 diceva ancora «nessun incasso vero»; conteggio route 224; procedura sottodominio in §7; data), `SECURITY.md` (inv. 19), `SECURITY-CHECK.md` (open redirect). Regola nuova: [[feedback-chiusura-sessione]].
