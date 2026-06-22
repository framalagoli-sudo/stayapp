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
- **Spend cap ABILITATO** (confermato da Francesco 22/6). Cosa fa: oltre le quote incluse l'uso "a quota" (storage/banda/MAU/dim. DB) va in **pausa invece di fatturare** → no bollette a sorpresa, ma rischio blocco risorsa se sfori. Compute/PITR/IPv4/repliche fatturano comunque (il cap non li tocca). Si setta in *Organization → Billing → Cost Control*.
  - **Trigger per metterlo OFF**: quando il traffico cresce e si preferisce scalare a consumo invece di rischiare il blocco di una risorsa. Per ora ON.
- **PITR NON attivato** (add-on **$100/mese** per 7gg, richiede compute Small; abilitarlo disattiva i daily backup). Verificato 22/6. **Trigger per attivarlo**: primo cliente vero pagante con dati transazionali (prenotazioni/contatti/pagamenti) dove perdere ~24h di scritture = danno reale. Prima no.
- **Backup giornalieri automatici, 7gg** (nessuna impostazione). No più pausing del progetto. Copertura doppia: backup infra Supabase + backup applicativo nostro (R2 / `/api/cron/backup`).
- **Quote incluse Pro + capacità stimata** (rif. per decisione futura sul cap): 8 GB DB · 100 GB storage · 250 GB banda/mese · 100k MAU. Vincolo reale = **banda** (dipende dal traffico, non dal n° siti). DB/MAU non si sfiorano (MAU conta solo admin/staff loggati, NON i visitatori guest); storage ~10–50 MB/sito → ~2.000–10.000 siti. Banda → ordine di centinaia di siti a traffico reale prima dei 250 GB/mese. Bottom line: a breve-medio termine la capacità NON è un problema, col cap ON non lo si tocca.

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
