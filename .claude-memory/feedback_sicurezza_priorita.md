---
name: feedback_sicurezza_priorita
description: "La sicurezza è SEMPRE una priorità, in ogni intervento — non un extra opzionale"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Francesco (8/7): "la sicurezza deve essere sempre una priorità".

**Why:** è un SaaS multi-tenant worldwide con dati di aziende e lead reali; una falla tocca clienti terzi, non solo lui. La sicurezza non è una feature da aggiungere dopo: è un vincolo di ogni intervento.

**How to apply:** in ogni modifica considerare per default —
- **Authz multi-tenant**: ogni route scopata per azienda/entità (`requireEntityAccess`/`requireRecordAccess`/`resolveAziendaId`), mai `.eq('id')` nudo. Vedi [[feedback_multitenant_authz]].
- **Input/output**: sanitizzare gli URL renderizzati (`safeUrl` — solo http(s)/interni, blocca `javascript:`/`data:`), HTML con DOMPurify, mai `dangerouslySetInnerHTML` su input non sanitizzato.
- **Gating dati sensibili**: i campi riservati non devono MAI finire nel payload pubblico (select solo colonne pubbliche); verificarlo dal vivo (0 leak), non assumere. Vedi [[project_vetrine]].
- **Endpoint pubblici**: valutare rate-limit/anti-abuso (honeypot, Turnstile soft, `lib/rate-limit.js`).
- **Verifica**: dopo ogni intervento, provare il caso ostile dal vivo (es. URL malevolo, richiesta senza token → 401), non solo il caso felice.
