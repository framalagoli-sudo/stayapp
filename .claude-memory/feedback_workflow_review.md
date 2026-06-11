---
name: feedback-workflow-review
description: "Ordine corretto per debug + code review — test manuali prima, review alla fine"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Ordine da seguire per ogni ciclo di stabilizzazione:

1. **Test manuali Fase 1** — verifica funzionale area per area su oltrenova.com
2. **Fix dei bug trovati** durante i test
3. **Deploy** con `.\deploy.ps1` per ogni gruppo di fix
4. **`/code-review max` + `/security-review`** alla fine, quando il codice è stabile

**Why:** Non ha senso revieware codice che stai per cambiare. Il review finale deve essere sul codice definitivo. I bug funzionali li trova Francesco manualmente, il review AI trova le cose più sottili (security, edge case, inefficienze).

**How to apply:** Quando Francesco chiede se fare il review prima o dopo i test, ricordare questo ordine. L'unica eccezione è un `/security-review` rapido pre-test se si sospettano vulnerabilità nelle route pubbliche.

**Note tecniche:**
- Il comando corretto è `/code-review ultra` (non `/ultrareview` — deprecato)
- Per review in sessione: switchare a Opus 4.8 + `/code-review max` + `/security-review`
- Per review cloud multi-agente: `/code-review ultra`
