import { createClient } from '@supabase/supabase-js'
import { config }        from 'dotenv'
import { randomBytes }   from 'crypto'
import { mkdirSync, writeFileSync } from 'fs'

config({ path: '.env.test' })

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  TEST_URL = 'https://www.oltrenova.com',
} = process.env

export default async function globalSetup() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Mancano variabili in tests/.env.test:\n' +
      '  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY'
    )
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 1. Crea utente effimero ────────────────────────────────────────────────
  const email    = `ci-${Date.now()}@playwright.internal`
  const password = randomBytes(32).toString('base64url')

  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError) throw new Error(`createUser fallito: ${createError.message}`)

  const userId = createData.user.id

  // ── 2. Recupera la prima property disponibile (per il contesto azienda) ──
  const { data: properties } = await admin
    .from('properties')
    .select('id')
    .limit(1)
  const propertyId = properties?.[0]?.id ?? null

  // ── 3. Profilo super_admin con contesto property ───────────────────────────
  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      { id: userId, role: 'super_admin', full_name: 'CI Runner', property_id: propertyId },
      { onConflict: 'id' }
    )

  if (profileError) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    throw new Error(`Upsert profilo fallito: ${profileError.message}`)
  }

  // ── 3. Sign in per ottenere il JWT ─────────────────────────────────────────
  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    throw new Error(`signInWithPassword fallito: ${signInError.message}`)
  }

  const session = signInData.session

  // ── 4. Costruisci Playwright storageState ──────────────────────────────────
  // Supabase JS salva la sessione con chiave sb-{projectRef}-auth-token
  const projectRef      = new URL(SUPABASE_URL).hostname.split('.')[0]
  const localStorageKey = `sb-${projectRef}-auth-token`

  const storageState = {
    cookies: [],
    origins: [{
      origin: new URL(TEST_URL).origin,
      localStorage: [{
        name:  localStorageKey,
        value: JSON.stringify(session),
      }],
    }],
  }

  // ── 5. Persisti su disco ───────────────────────────────────────────────────
  mkdirSync('.auth', { recursive: true })
  writeFileSync('.auth/state.json',   JSON.stringify(storageState, null, 2))
  writeFileSync('.auth/ci-user.json', JSON.stringify({ userId, email }))

  console.log(`\n[setup] Utente CI creato: ${email}`)
  console.log(`[setup] Sessione valida ~1h — user eliminato in teardown\n`)
}
