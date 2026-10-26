---
name: project-session-2026-10-26
description: "26/10: PC resettato (niente perso); risponditore fermato dai numeri; buco /api/requests + 3 porte senza limite chiusi LIVE; annullamento ospite + lista d'attesa automatica (migration 141)"
metadata:
  node_type: memory
  type: project
  originSessionId: c69c02d8-2525-4043-b4de-493f6a4d0ef2
  modified: 2026-10-26T13:46:51.423Z
---

**PC resettato** la mattina: verificato repo, env, memoria, profilo, Vercel — niente perso. Il codice del risponditore non era mai stato scritto (lo dice la trascrizione `e568d56c`): mi ero fermato dopo aver misurato 4 messaggi in 5 mesi.

**Sicurezza (LIVE, commit 70d7e8a1)**: `/api/requests` senza limite e con qualunque property_id → limiti per IP e per entità, entità esistente, tipi chiusi. `probe-rate-limit` guardava solo alcune cartelle: ora metodo per metodo su tutte → trovate `/api/demo`, `/api/survey/public`, `/api/auth/reset-password`. CLAUDE.md nota 88.

**Annullamento + lista automatica** (migration 141 eseguita da Francesco il 26/10; CLAUDE.md nota 89). Decisioni di Francesco: termine per evento stile Booking (default 24h, «se applicarlo» = interruttore); rimborso **a mano dal titolare** («non tocchiamo i soldi dei clienti»); lista: 1h, 30 min stesso giorno; interruttore per evento. Mie scelte dichiarate: annullamento acceso anche sugli eventi esistenti (per le prenotazioni nuove), lista automatica spenta sugli esistenti e accesa sui nuovi; chi chiede più posti lascia passare; avviso «da rimborsare» anche ad avvisi spenti.

**Why:** Francesco ha notato che senza annullamento dell'ospite la lista automatica non avrebbe posti da muovere — l'ordine giusto era annullamento prima, lista dopo.
**How to apply:** `occupaPosto` è la regola unica dei posti evento (offerte tenute comprese). Non provati: pagamento vero dalla lista, email in casella, frase del termine nell'app QR (non c'è). Lega con [[project-agenti-automatismi]].
