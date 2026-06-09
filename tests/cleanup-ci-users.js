// Script one-shot: elimina tutti gli utenti @playwright.internal rimasti su Supabase.
// Uso: cd tests && node cleanup-ci-users.js

import { createClient } from '@supabase/supabase-js'
import { config }        from 'dotenv'

config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in tests/.env.test')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (error) { console.error('listUsers fallito:', error.message); process.exit(1) }

const stale = (data.users || []).filter(u => u.email?.endsWith('@playwright.internal'))

if (stale.length === 0) {
  console.log('Nessun utente CI da eliminare.')
  process.exit(0)
}

console.log(`Trovati ${stale.length} utenti da eliminare:`)
for (const u of stale) {
  const { error: delErr } = await admin.auth.admin.deleteUser(u.id)
  if (delErr) {
    console.error(`  ✗ ${u.email} — ${delErr.message}`)
  } else {
    console.log(`  ✓ ${u.email} eliminato`)
  }
}
