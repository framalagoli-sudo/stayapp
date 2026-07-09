---
name: project_idea_security_review_agent
description: IDEA da approfondire — agent AI di review sicurezza on-demand sul diff (non schedulato)
metadata: 
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

**Idea da ragionare a fondo con Francesco (9/7, non ancora decisa).** Nasce dalla domanda "possiamo creare agent AI per routine di sicurezza?".

**Inquadramento condiviso** (3 livelli, per costo/beneficio):
1. **Deterministico, 0 token, ogni deploy** = il motore vero. Già fatto: `security.spec.js` (IDOR, permessi, 2FA, **+ authz anon→401, scoping eventi cross-azienda, gating vetrine dati_privati**) e `public-flows.spec.js`. Questo è "la routine di sicurezza".
2. **AI review ON-DEMAND sul diff** = l'idea da approfondire. Un agent focalizzato su sicurezza (authz mancanti/`.eq('id')` nudo, IDOR, injection nei filtri PostgREST interpolati, leak campi sensibili, sanitizzazione URL/HTML) che gira **sul diff** quando si tocca codice sensibile (nuove route API, auth, esposizione dati). Costa token solo quando lo lanci. Esiste già `/code-review`; l'idea è un agent `security-reviewer` dedicato (definizione in `.claude/agents/`).
3. **Cron AI schedulato** = SCONSIGLIATO. Brucia token ri-leggendo lo stesso codice; il rischio lo introducono le modifiche, non il tempo → coperto da 1+2.

**Punti da decidere nel "pensiero profondo"**:
- Trigger: manuale (`/security-review`) vs hook automatico su file sensibili (server/routes, app/api, lib/*auth*, guest, safeUrl/DOMPurify).
- Scope del prompt: quali invarianti far verificare (checklist da [[feedback_sicurezza_priorita]] + [[feedback_multitenant_authz]]).
- Rapporto con `/code-review` esistente (duplicato o profilo dedicato).
- Output: findings verificati (evitare falsi positivi che stancano).

Riferimenti: [[feedback_sicurezza_priorita]], [[feedback_multitenant_authz]], [[reference_migrazione_react_router_next]] (guard smoke aggiunti).
