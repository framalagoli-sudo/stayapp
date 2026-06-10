---
name: feedback-deploy
description: Flusso deploy completo — git push (Railway) PRIMA di Vercel, poi smoke test
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 814df534-7fb3-41f8-b657-a325f7b1931d
---

Flusso deploy completo obbligatorio, sempre in quest'ordine:
1. `git add <files>` + `git commit` + `git push origin main` → aggiorna Railway (server)
2. Deploy Vercel: `cd client-next && npx vercel --prod --yes`
3. Smoke test: `cd tests && npm test`

**Why:** In sessione 2026-06-09 ho saltato il `git push` prima del deploy Vercel — Railway continuava a girare il vecchio codice e il bug persisteva anche dopo il deploy frontend. Railway si aggiorna SOLO con git push, non con il deploy Vercel.

**How to apply:** Ogni volta che si deploya, il `git push` deve sempre essere il primo passo. Anche se le modifiche sono solo frontend, fare sempre il push per tenere il repo allineato.

Nota: `deploy.ps1` dalla root NON include il git push — va fatto manualmente prima. Il deploy.ps1 fa solo Vercel + smoke test.
