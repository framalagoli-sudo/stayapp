---
name: reference_authcontext_406
description: AuthContext usa .single() su profiles/aziende — 0 righe da RLS producono 406 e lasciano l'admin in "Caricamento…" infinito
metadata:
  type: reference
---

`context/AuthContext.jsx` (`fetchProfile`) legge il profilo con `.single()` su `profiles` e, se c'è un'azienda, `require_2fa` su `aziende` con un altro `.single()`.

`.single()` su PostgREST risponde **406** quando le righe restituite non sono esattamente una. Dopo il lockdown RLS (migration `069`) può succedere legittimamente che una di quelle letture torni vuota lato client: allora `profile` resta `null`, nessun errore viene mostrato e le pagine admin che dipendono dal profilo restano in **"Caricamento…" a tempo indeterminato**.

Osservato il 18/08/2026 nello smoke test: `/admin/prenotazioni` bloccata su "Caricamento…" dopo 9.5s con due `406` in console — esattamente le due query. Il test è poi passato al riavvio (flaky) e la pagina aperta con un utente reale funziona, quindi il difetto è **intermittente**, non costante.

Correzione ragionevole (non ancora applicata, fuori dallo scopo del lavoro sui domini): `.maybeSingle()` su entrambe + stato d'errore esplicito quando il profilo non arriva, invece di lasciare l'interfaccia in caricamento.

Vedi [[project_session_2026_08_17_domini]].
