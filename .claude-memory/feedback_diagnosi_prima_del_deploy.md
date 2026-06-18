---
name: feedback_diagnosi_prima_del_deploy
description: "Diagnosticare il MECCANISMO alla radice PRIMA di deployare (specie cache/infra). Un deploy = una causa accertata, non un tentativo. Niente 'provo e vedo' sulla produzione live."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Francesco (17/6, con dispiacere: "hai perso dei giri, non me lo aspettavo... sei un ingegnere") ha richiamato un difetto reale: ho spedito **fix plausibili ma incompleti** verificandoli DOPO il deploy, invece di ragionare prima sul meccanismo vero.

**Regola operativa (NON sbagliarla più):**
1. **Diagnosi del meccanismo PRIMA del deploy** — niente fix su ipotesi, soprattutto su cache/CDN/infra. Capire ESATTAMENTE perché succede, poi fixare.
2. **Un deploy = una causa accertata**, non un tentativo. Su questo stack ogni `deploy.ps1` costa ~10 min (build --force + 43 smoke) e tocca **produzione live, a volte con campagne attive**.
3. **Verificare le ipotesi a freddo** con prove dirette PRIMA di buildare: `curl -D -` (header come `X-Vercel-Cache`, `cf-cache-status`, `Cache-Control`), query DB via service role, confronto URL pulito vs cache-bust. Le prove dicono la causa; l'ipotesi no.
4. **Preferire il fix sistemico alla radice** al cerotto per-sintomo.

**Why:** la produzione è fragile e i deploy sono lenti; "provo e vedo" brucia tempo, rischia i lead del cliente (vedi incidente Turnstile [[reference_vercel_env_cli]]) ed erode la fiducia.

**How to apply:** davanti a un bug infra/cache/build: 1) raccogli prove a freddo, 2) identifica il meccanismo, 3) scegli il fix più a monte, 4) SOLO ALLORA deploya, 5) verifica. Esempio fatto bene alla fine: staleness dati → header `X-Vercel-Cache: MISS` + dati vecchi su URL unici → la cache era dentro le fetch di supabase-js, non nel CDN → fix `cache:'no-store'` sul client (vedi [[reference_next14_fetch_cache]]).
