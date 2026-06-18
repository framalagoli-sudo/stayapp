---
name: reference_next14_fetch_cache
description: "Next 14 cacha le fetch() lato server di default → supabase-js (che usa fetch) restituisce letture STALE. Fix: cache:'no-store' sul client Supabase server."
metadata:
  node_type: memory
  type: reference
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

**Sintomo (17/6):** modifiche fatte nell'admin (es. `privacy_data`, dati minisito) NON si vedevano sul sito pubblico finché non si rideployava. L'API `/api/guest/...` restituiva la versione vecchia anche con URL cache-bustato e `X-Vercel-Cache: MISS`.

**Causa radice:** Next 14 **cacha automaticamente tutte le `fetch()` lato server** (Data Cache, default `force-cache`). supabase-js fa le query via `fetch()` interne → Next le congela → letture stale. `export const dynamic = 'force-dynamic'` sul Route Handler **NON basta** (non disattiva in modo affidabile il caching delle fetch interne di una libreria).

**Fix definitivo (applicato in `client-next/lib/supabase-server.js`):** passare un fetch custom no-store al client admin:
```js
createClient(url, key, {
  auth: { persistSession: false },
  global: { fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }) },
})
```
Così OGNI query del client server legge dati freschi dal DB. Vale per tutti gli endpoint guest + `guest-data.js` (SSR minisiti) + route admin.

**Come si diagnostica:** `curl -D -` sull'endpoint → se `X-Vercel-Cache: MISS` (non è il CDN) ma i dati sono vecchi anche su URL unico (`?z=random`) → la cache è dentro la query (fetch cache di Next), non nel CDN. Confronto: query DB diretta via service role mostra il dato nuovo, l'API no.

**Lezione collegata:** [[feedback_diagnosi_prima_del_deploy]] — ho prima messo `force-dynamic` (cerotto che non risolveva) e solo dopo il fix alla radice; andava diagnosticato subito il meccanismo fetch-cache.
