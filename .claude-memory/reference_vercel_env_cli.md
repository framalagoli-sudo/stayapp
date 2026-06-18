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

5. **⚠️⚠️ Le var `NEXT_PUBLIC_*` spariscono dal bundle quando il build riusa la cache — HA ROTTO I FORM IN PRODUZIONE 2 VOLTE** (16/6 setup, **17/6 con campagna live**: la Site Key Turnstile persa da un deploy cached → widget non rende → "Verifica anti-bot fallita" su tutti i form). Le `NEXT_PUBLIC_*` sono inlinate come stringhe letterali **al build**; un build "Restored build cache" può servire un chunk vecchio SENZA la var. **FIX PERMANENTE applicato**: `deploy.ps1` ora usa `npx vercel --prod --force` (rebuild sempre senza cache). Per verifica: scaricare i chunk `/_next/static/chunks/*.js` e cercare il valore (es. `0x4AAAA...` per Turnstile). Le var server-side (runtime) NON soffrono di questo. **Lezione**: mai far dipendere una funzione critica (es. blocco form) dal rendering di una var `NEXT_PUBLIC` — usare runtime o fail-open. Turnstile ora è SOFT di default proprio per questo (vedi [[todo_prossima_sessione]]).

6. **Leggere i log runtime Vercel funziona** (utile per debug prod): `npx vercel logs <deployment-url> --json` da `client-next/` (avvolgere in Start-Job con timeout perché può streammare). Mostra i `console.error/log` delle route. Usato per leggere le error-codes di Turnstile siteverify.

7. **`npx vercel env ls production`** (da `client-next/`) elenca NOMI e scope delle var (non i valori) — utile per confermare che una var esiste col nome giusto.
