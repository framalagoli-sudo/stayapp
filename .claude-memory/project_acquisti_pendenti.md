---
name: project-acquisti-pendenti
description: "Stato infrastruttura e acquisti — Vercel Pro ✅, Railway freezato ✅, Supabase Pro da valutare"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## Infrastruttura attuale (aggiornato 2026-06-14)

### Vercel Pro ✅ — ATTIVO
Confermato da Francesco 2026-06-14. Timeout funzioni: 60s (Pro). Build: 4 cores, 8GB.

### Railway — FREEZATO ✅
Francesco ha freezato Railway (Deployments → Freeze). Non paga più.
La migrazione Railway → Vercel è COMPLETA — tutte le route sono su Vercel API Routes.

### Supabase — stato da verificare
Free plan ha limite 500MB DB, 1GB storage, 50.000 MAU.
Pro ($25/mese) aggiunge: storage illimitato, PITR backup 7gg, più connessioni.
Se non ancora upgradato, valutare prima che il DB cresca.

### Cloudflare Free ✅
### Resend Free ✅ (bounce webhook configurato ✅)
### Stripe — installato nel codice, non integrato (Sprint 10)

## Non più pendenti (aggiornato 2026-06-14)
- ~~Upgrade Vercel Pro~~ → **già attivo** ✅
- ~~Migrazione Railway → Vercel~~ → **completa** ✅
- ~~Spegnere Railway~~ → **freezato** ✅
- ~~NEXT_PUBLIC_API_URL=""~~ → **già impostato su Vercel** ✅
- ~~Resend bounce webhook~~ → **configurato** ✅

**How to apply:** Non ricordare più Railway o la migrazione come pending. L'unica infrastruttura davvero pendente è eventuale upgrade Supabase Pro.
