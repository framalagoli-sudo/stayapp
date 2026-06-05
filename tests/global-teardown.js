import { createClient } from '@supabase/supabase-js'
import { config }        from 'dotenv'
import { readFileSync, rmSync } from 'fs'

config({ path: '.env.test' })

export default async function globalTeardown() {
  let userId, email
  try {
    ;({ userId, email } = JSON.parse(readFileSync('.auth/ci-user.json', 'utf8')))
  } catch {
    console.warn('[teardown] ci-user.json non trovato — nessun utente da eliminare')
    return
  }

  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) {
    console.warn(`[teardown] deleteUser fallito per ${email}: ${error.message}`)
  } else {
    console.log(`\n[teardown] Utente CI eliminato: ${email}`)
  }

  rmSync('.auth/ci-user.json', { force: true })
}
