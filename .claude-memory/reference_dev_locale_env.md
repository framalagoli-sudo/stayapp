---
name: reference-dev-locale-env
description: "Il dev locale (:3000) richiede SUPABASE_SERVICE_ROLE_KEY in client-next/.env.local, altrimenti le pagine guest danno 500 'supabaseKey is required' — e punta al DB di PRODUZIONE"
metadata: 
  node_type: memory
  type: reference
  originSessionId: def02397-c897-4edf-bae0-413b418c3dd2
  modified: 2026-08-12T11:02:04.305Z
---

`client-next/.env.local` conteneva solo le 4 var `NEXT_PUBLIC_*`. Mancava
`SUPABASE_SERVICE_ROLE_KEY`, che serve alle **pagine guest SSR**
(`lib/guest-data.js` interroga Supabase server-side): senza, ogni pagina
`/s|/r|/a` dava **500 `Error: supabaseKey is required`**. Il pannello admin
invece caricava lo stesso, perché passa dalle route API.

Aggiunta il 12/08/2026 prendendo il valore da `tests/.env.test` (stesso progetto
Supabase, `tdoehiyssmsccpzelgxb`). Il file è gitignorato
(`client-next/.gitignore:29 .env*.local`).

⚠️ **Il dev locale lavora sul DB di PRODUZIONE** (le env puntano lì). Leggere e
renderizzare è innocuo, ma qualsiasi scrittura di prova in locale tocca i dati
veri dei clienti.

⚠️ **Lezione**: avevo verificato dei fix in locale e ottenuto "tutto ok" mentre
il server rispondeva **500 su ogni pagina** — le sonde misuravano pagine vuote.
Prima di fidarsi di una verifica locale, controllare che la pagina mostri
**contenuto reale**, non solo che lo script giri. È la stessa lezione del
"verifica dal vivo" ([[feedback_diagnosi_prima_del_deploy]]), applicata al dev.

Le altre env server-side (RESEND, ANTHROPIC, CRON_SECRET, STRIPE) restano assenti
in locale: le funzioni che le usano non girano in dev. Stanno solo su Vercel
(vedi [[reference_vercel_env_cli]]).
