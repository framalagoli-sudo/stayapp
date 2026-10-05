---
name: feedback-deploy
description: Deploy solo con .\deploy.ps1 dalla root — ordine deploy Vercel PRIMA del git push, con guardie su branch e working tree
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 814df534-7fb3-41f8-b657-a325f7b1931d
  modified: 2026-10-04T12:26:37.123Z
---

Si deploya **solo** con `.\deploy.ps1` dalla root (mai `npx vercel` dalla root:
`.vercel/project.json` lì punta ancora al progetto morto `stayapp`/vite).

Ordine dello script (dal 12/08/2026): guardie → `npm audit` informativo →
**deploy Vercel** → **git push** → attesa 15s → smoke test.

**Why:** `vercel --prod` pubblica i **file locali**, non il commit. Mettere il
deploy prima del push fa sì che la build Vercel funga da gate: se il codice non
compila, `main` resta pulito. Serve perché il check CI "Build client-next" non
protegge i push diretti a `main` (Francesco ha il bypass del branch protection).
Per lo stesso motivo lo script si rifiuta di partire se non sei su `main` o se
il working tree è sporco: altrimenti finirebbe in produzione codice che in git
non esiste. Override consapevole: `.\deploy.ps1 -AllowDirty`.

**How to apply:** committare *prima* di lanciare il deploy. Se il push fallisce
dopo un deploy riuscito, lo script lo dice: sanare subito con `git push origin
main`, altrimenti il deploy successivo parte da una base diversa dal live.

La vecchia regola "git push per primo, perché aggiorna Railway" **non vale
più**: Railway è dismesso, tutto (frontend + API) sta su Vercel.

Vedi [[feedback_diagnosi_prima_del_deploy]] e [[reference_vercel_env_cli]].
Nota operativa: il `Not authorized` di Vercel è **transitorio** — rilanciare
prima di indagare (successo al secondo tentativo sia l'11/08 che il 12/08).


## ⚠️ Prima del deploy: `git fetch` e guardare cosa c'è sul remoto (03–04/10/2026)
Dependabot fa merge su `main` da solo (di sera). Se in locale mancano quei commit,
`deploy.ps1` pubblica, poi il **push viene rifiutato e lo script si ferma lì: smoke
e sonde di sicurezza NON girano**. Successo due volte in due giorni. Prima di
lanciare: `git fetch origin && git log HEAD..origin/main`; se c'è qualcosa,
`git pull --rebase origin main` e poi deploy. Se capita lo stesso: rebase, push, e
lanciare a mano `npm test` + le sonde elencate in `deploy.ps1`.
- Se il commit di Dependabot tocca `client-next/package.json`, dopo il rebase è su
  `main` ma **non in produzione** finché non si rideploya (e in locale serve
  `npm install`). Dirlo a Francesco.
- Il codice d'uscita dello script lanciato da bash non è affidabile: leggere il log.

## ⚠️ Mai reindirizzare l'output di deploy.ps1 (15/09/2026)
`.\deploy.ps1 2>&1 | ...` o `*> file` lo fermano prima del deploy: lo script ha `$ErrorActionPreference = 'Stop'` e la CLI di Vercel scrive su stderr una riga innocua (`<claude-code-hint ...>`), che col reindirizzamento diventa un errore. Lanciarlo **nudo** (`.\deploy.ps1`); l'output lungo finisce comunque salvato su file. Successo due volte di fila.
