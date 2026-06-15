---
name: feedback_bom_api_base
description: "Vercel inietta BOM (U+FEFF) in qualsiasi env var vuota o mal configurata. Usare sempre .trim() su TUTTE le env var lette server-side."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Vercel inietta un BOM (Byte Order Mark, U+FEFF, `%EF%BB%BF`, valore decimale 65279) all'inizio delle env var quando sono impostate come stringa vuota o in certi ambienti.

**Colpisce qualsiasi env var**, non solo `NEXT_PUBLIC_API_URL`. Esempi già colpiti:
- `NEXT_PUBLIC_API_URL` → URL fetch con `/%EF%BB%BF/api/...` → 404 HTML → crash JSON parse
- `ANTHROPIC_API_KEY` → header HTTP ByteString error: "character at index 0 has value 65279"

**Regola:** ogni env var letta da codice server o client deve usare `.trim()`:

```js
// ✅ Corretto — su TUTTE le env var
const apiKey = (process.env.ANTHROPIC_API_KEY ?? '').trim()
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim()

// ❌ Sbagliato — BOM silenzioso che causa errori cryptici
const apiKey = process.env.ANTHROPIC_API_KEY
```

**Why:** Il BOM è whitespace per la spec JS, quindi `.trim()` lo rimuove. L'operatore `??` non aiuta perché il BOM rende la stringa non-null/undefined.

**How to apply:** Ogni volta che scrivi codice che legge una env var Vercel (sia `NEXT_PUBLIC_*` che server-side), aggiungere sempre `.trim()`. Vale anche per: `RESEND_API_KEY`, `SUPABASE_URL`, `RESEND_WEBHOOK_SECRET`, ecc.
