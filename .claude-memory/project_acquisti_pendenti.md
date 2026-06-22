---
name: project-acquisti-pendenti
description: "Stato infrastruttura e acquisti — Vercel Pro ✅, Railway freezato ✅, Supabase Pro ✅ (22/6); nessun acquisto infra pendente"
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

### Supabase Pro ✅ — ATTIVO
Acquistato da Francesco il 2026-06-22. Niente da fare lato codice (URL/chiavi invariati, nessun redeploy).
- **Spend cap ON di default**: oltre quota l'uso a-quota va in pausa invece di fatturare (no bollette a sorpresa, ma rischio downtime se sfori). Compute/PITR/IPv4/repliche fatturano comunque. Deciso: lasciarlo ON finché non ci sono clienti veri. (Organization → Billing → Cost Control)
- **Backup giornalieri automatici, 7gg** (nessuna impostazione). No più pausing del progetto.
- **PITR NON incluso** (add-on a pagamento, richiede compute Small; abilitarlo disattiva i daily backup) → per ora saltato.
- Copertura doppia: backup infra Supabase + backup applicativo nostro (R2 / `/api/cron/backup`).

### Cloudflare Free ✅
### Resend Free ✅ (bounce webhook configurato ✅)
### Stripe — installato nel codice, non integrato (Sprint 10)

## Non più pendenti (aggiornato 2026-06-14)
- ~~Upgrade Vercel Pro~~ → **già attivo** ✅
- ~~Migrazione Railway → Vercel~~ → **completa** ✅
- ~~Spegnere Railway~~ → **freezato** ✅
- ~~NEXT_PUBLIC_API_URL=""~~ → **già impostato su Vercel** ✅
- ~~Resend bounce webhook~~ → **configurato** ✅

**How to apply:** Non ricordare più Railway, la migrazione né Supabase Pro come pending — tutto attivo. Nessun acquisto infra pendente (resta solo Stripe per lo Sprint 10 billing, che è feature non infra).
