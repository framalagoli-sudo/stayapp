---
name: reference_authcontext_406
description: RISOLTO 18/08 — AuthContext usava .single() su profiles/aziende, 406 e admin bloccato su "Caricamento…"
metadata:
  type: reference
---

**Risolto il 18/08/2026.** `context/AuthContext.jsx` (`fetchProfile`) leggeva profilo e azienda con `.single()`, che su PostgREST risponde **406** quando le righe non sono esattamente una — cosa che con le policy RLS può succedere legittimamente. Il profilo restava `null`, nessuno lo diceva, e le pagine admin che ne dipendono giravano all'infinito su **"Caricamento…"** (osservato nello smoke test su `/admin/prenotazioni`, intermittente).

Correzione: `.maybeSingle()` su entrambe le letture, stato `erroreProfilo` esposto dal contesto e `AdminGuard` che mostra un messaggio con **Riprova** ed **Esci** invece dello spinner eterno. Sull'azienda, se la lettura fallisce si assume `require_2fa: true`: meglio chiedere un secondo fattore di troppo che saltarlo per un errore di lettura.

**Regola generale**: `.single()` va usato solo quando l'assenza della riga è davvero un errore. Per tutto ciò che dipende da RLS, `.maybeSingle()` + gestione esplicita del caso vuoto. Vedi [[feedback_supabase_catch]].
