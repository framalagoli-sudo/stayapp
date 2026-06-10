---
name: project-acquisti-pendenti
description: "Servizi a pagamento da acquistare/upgradare per OltreNova — ricordare all'inizio di ogni sessione"
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

Francesco ha chiesto di essere ricordato di questi acquisti all'inizio della prossima sessione.

## Da acquistare / upgradare ⚠️

### Supabase Pro — $25/mese
- Piano attuale: Free (limite 500MB DB, 1GB storage, 50.000 MAU)
- Upgrade necessario per: più storage media, più utenti attivi, backup automatici
- Link: https://supabase.com/dashboard → Settings → Billing

### Vercel Pro — $20/mese
- Piano attuale: Hobby (no custom domain su team, limite bandwidth)
- Upgrade necessario per: domini custom multipli su team, analytics avanzate, più build concurrenti
- Link: https://vercel.com/account/billing

### Totale mensile stimato: $45/mese

## Già attivi (non da comprare)
- Railway Starter: $5/mese ✅
- Cloudflare Free ✅
- Resend Free ✅

## Note
- Supabase Pro è più urgente (storage media può esaurirsi con upload utenti)
- Vercel Pro sblocca anche GitHub auto-deploy su team (ora deploy manuale)
- **Vercel Pro è prerequisito per la migrazione Railway → Vercel** (serve per Cron Jobs e maxDuration 300s)

## Dopo l'acquisto — migrare Railway → Vercel ⭐
Sprint da fare DOPO aver comprato entrambi i piani Pro:
- Convertire route Express → Next.js API routes (meccanico, 1-2 sessioni)
- `setInterval` scheduler → Vercel Cron Jobs
- File upload: multer → `request.formData()`
- Auth middleware: Express → helper function per route
- Risultato: stack finale **Vercel + Supabase only** — Railway eliminato ($5/mese in meno, zero CORS, deploy unico)

**Why:** Francesco ha chiesto esplicitamente di essere ricordato di questi acquisti.
**How to apply:** Ricordare SEMPRE all'inizio E alla fine di ogni sessione, senza eccezioni. Dopo l'acquisto Pro, proporre la migrazione Railway → Vercel come prossimo sprint.
