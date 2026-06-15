---
name: feedback_multitenant_authz
description: "Ogni route API che tocca dati con azienda_id DEVE scopare per azienda — usare le primitive in server-auth.js, mai .eq('id') nudo"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

StayApp è multi-tenant: clienti paganti di aziende diverse. Un IDOR = catastrofe legale/commerciale. Regola non negoziabile per OGNI route API:

**Letture/mutazioni per id** (`[id]/route.js`): mai `.update()/.delete()/.select().eq('id', params.id)` da solo. Sempre uno di:
- `requireRecordAccess(request, table, id)` — se la tabella ha `azienda_id` diretto
- `requireEntityAccess(request, entity_tipo, entity_id)` — se la risorsa è legata a una entità (struttura/ristorante/attivita)
- scope esplicito `.eq('azienda_id', profile.azienda_id)` per non-super
- per relazioni indirette (es. requests→property, promozioni→risorsa): caricare il record con join e verificare l'azienda risalendo la FK

**POST che accettano azienda_id**: sempre `resolveAziendaId(profile, body.azienda_id)` — onora il body SOLO per super_admin.

**Why:** Sonnet ha costruito molti route senza questi controlli (audit 2026-06-15 ha trovato ~19 IDOR). Le primitive in `lib/server-auth.js` rendono il controllo difficile da dimenticare.

**How to apply:** quando crei/modifichi un route API, chiediti "un utente dell'azienda A può toccare dati dell'azienda B?". Se sì → manca lo scope. Attenzione ai falsi negativi: alcuni route avevano GET protetto ma PATCH/DELETE no — verificare OGNI handler separatamente. Dettagli in [[project_session_2026_06_15c_security]]. Vedi anche [[feedback_supabase_catch]].
