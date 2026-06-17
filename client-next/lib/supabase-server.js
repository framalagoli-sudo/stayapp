import { createClient } from '@supabase/supabase-js'

let _admin = null

// Client con service role key — bypassa RLS — solo per API routes server-side
// Lazy initialization: il client viene creato al primo accesso, non a module load.
// Questo evita che il build di Next.js fallisca se SUPABASE_SERVICE_ROLE_KEY
// non è definita nell'ambiente di build (es. Vercel senza env vars configurate).
// .replace BOM: Vercel può aggiungere ﻿ alle env vars copiate come empty string,
// che causa "Cannot convert argument to a ByteString" nelle chiamate fetch di postgrest.
export const supabaseAdmin = new Proxy({}, {
  get(_, prop) {
    if (!_admin) {
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^﻿/, '')
      const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^﻿/, '')
      // cache:'no-store' su TUTTE le fetch di supabase-js: Next 14 altrimenti cacha
      // le fetch lato server → letture stale (le modifiche admin non si vedevano sul
      // sito pubblico finché non si rideployava). Vogliamo sempre dati freschi dal DB.
      _admin = createClient(url, key, {
        auth: { persistSession: false },
        global: { fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }) },
      })
    }
    return _admin[prop]
  },
})
