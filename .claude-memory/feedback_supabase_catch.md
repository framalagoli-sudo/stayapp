---
name: feedback_supabase_catch
description: "Mai .catch() diretto su query builder Supabase/Postgrest — non è una Promise, lancia 'catch is not a function'"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Mai chiamare `.catch()` direttamente su un query builder Supabase:
`supabaseAdmin.from('x').update(...).eq(...).catch(...)` → runtime error **"catch is not a function"** → 500.

**Why:** il `PostgrestFilterBuilder` è *thenable* (ha `.then()`) ma NON implementa `.catch()` né `.finally()`. Funziona solo se prima c'è un `.then()` (che restituisce una vera Promise).

**How to apply:** per query fire-and-forget usare `await` + check error:
```js
const { error } = await supabaseAdmin.from('x').update(...).eq('id', id)
if (error) console.error('[ctx]', error.message)
```
oppure `.then(ok, err)`. In serverless (Vercel) preferire sempre `await` anche per side-effect (DB write, auto-tag): il fire-and-forget può non completare prima della response. Bug reale trovato/fixato in submit Form Builder, vedi [[project_session_2026_06_15b_formbuilder]].
