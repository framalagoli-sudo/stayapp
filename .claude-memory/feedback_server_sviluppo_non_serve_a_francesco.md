---
name: feedback-server-sviluppo-non-serve-a-francesco
description: Francesco avviava il server di sviluppo (porta 3000) credendo servisse; detto il 23/10 che non serve — lo avvio/fermo io solo per le prove
metadata:
  node_type: memory
  type: feedback
  originSessionId: e568d56c-329d-4803-8f55-d2ef213a3ede
  modified: 2026-10-23T08:30:58.683Z
---

Il 23/10/2026 sulla porta 3000 c'era un `npm run dev` avviato da Francesco alle 9:29: «io lo avvio perché devo, ma se non devo più non lo faccio più». Gli ho detto che non serve: produzione è su Vercel, il server locale è solo per le mie prove.

**Why:** gonfiato dalle mie sonde (5,8 GB dopo 289 route compilate) lasciava 0,6 GB liberi: un deploy in quelle condizioni viene fermato dal sistema a metà.

**How to apply:** non aspettarsi un server già acceso. Se ne trovo uno, controllare chi l'ha avviato e quanto pesa prima di un deploy. Il server lo avvio io solo per le prove locali e lo fermo subito dopo, controllando la porta 3000 (vedi [[todo-prossima-sessione]], blocco «Il PC»).
