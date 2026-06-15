---
name: reference_vercel_env_cli
description: "Tranelli Vercel env/CLI: due progetti (stayapp morto vs oltrenova-next), env pull maschera sensitive, npx env add stdin non funziona Windows"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Verità durature su Vercel CLI in questo repo (scoperte 2026-06-15, vedi [[project_session_2026_06_15b_formbuilder]]):

1. **DUE progetti Vercel**:
   - root `.vercel` → progetto `stayapp` = vecchio Vite, MORTO (solo var `VITE_*`). NON usarlo.
   - `client-next/.vercel` → progetto `oltrenova-next` = Next.js LIVE in produzione.
   - Tutti i comandi `vercel env ...` vanno lanciati **da dentro `client-next/`**, altrimenti interroghi il progetto sbagliato.

2. **`vercel env pull` NON mostra i valori delle var Sensitive**: scrive `NOME=""` per TUTTE le var utente, incluse quelle che funzionano (SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_*). Vedere `""` NON significa che la var è vuota sul server. **Impossibile verificare i valori via CLI** → l'unica prova è un test funzionale reale.

3. **`npx vercel env add` via stdin NON funziona su Windows**: npx non inoltra lo stdin al processo figlio `vercel`. Falliti tutti i metodi (pipe PowerShell, redirect `<` cmd, `Start-Process -RedirectStandardInput`, `echo|` cmd) → salva sempre valore VUOTO. Le var (specie sensitive) vanno impostate **SOLO dal dashboard Vercel**.

4. **Conseguenza pratica**: per cambiare un secret di produzione → dashboard Vercel → Settings → Environment Variables → Edit → Save su Production → poi redeploy (`deploy.ps1`). Non perdere tempo con la CLI.
