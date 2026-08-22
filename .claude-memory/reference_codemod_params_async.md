---
name: reference_codemod_params_async
description: Migrazione params/searchParams asincroni fatta il 22/08/2026 — il codemod ufficiale rompe i file che già facevano await params
metadata:
  type: reference
---

Fatta il 22/08/2026 con `npx @next/codemod@canary next-async-request-api .`: **94 file**, 124 `params` e 27 `searchParams`. L'app è pronta per **Next 16**, dove l'accesso sincrono diventa errore (la 15 lo tollera).

⚠️ **Il codemod ha rotto 10 pagine pubbliche.** Nei file che facevano **già** `const { slug } = await params` — cioè quelli dove eravamo avanti — ha sostituito la firma `({ params, searchParams })` con `(props)` e ha aggiunto solo `const searchParams = await props.searchParams`, **senza ridefinire `params`**. Risultato: `ReferenceError: params is not defined` e **500 su tutte le pagine `/r`, `/s`, `/a` e sul blog**.

**Il build compilava benissimo**: si vede solo avviando il server e aprendo una pagina. Riparato aggiungendo `const params = await props.params;` accanto alla riga gemella.

**Regola per il prossimo codemod**: dopo averlo eseguito, cercare gli usi orfani prima di fidarsi —

```bash
for f in $(git diff --name-only); do
  grep -qE "await params|params\.[a-z]" "$f" \
    && ! grep -qE "const params = (await )?(props|use\()" "$f" \
    && ! grep -qE "\{ params \}" "$f" && echo "ORFANO: $f"
done
```

e poi **provare il server**, non solo il build. Vedi [[project_upgrade_next15]].
