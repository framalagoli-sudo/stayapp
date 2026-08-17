// Rimette l'entità di test al suo indirizzo originale e cancella gli alias
// lasciati dalle prove di rinomina (usa la DELETE dell'API, così gli hostname
// vengono liberati anche su Vercel).
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const slugEntita = process.argv[2] || 'prova'
const nomeVoluto = process.argv[3] || 'prova'

let userId = null
try {
  const email = `probe-${Date.now()}@playwright.internal`
  const password = randomBytes(32).toString('base64url')
  const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = created.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'super_admin', full_name: 'Probe ripristino' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: signIn } = await anon.auth.signInWithPassword({ email, password })
  const auth = { Authorization: `Bearer ${signIn.session.access_token}`, 'Content-Type': 'application/json' }

  const { data: sub } = await admin.from('domini').select('*').eq('entity_slug', slugEntita).eq('tipo', 'subdomain').maybeSingle()
  if (!sub) throw new Error(`nessun sottodominio per "${slugEntita}"`)

  if (sub.dominio.split('.')[0] !== nomeVoluto) {
    const r = await fetch(`${TEST_URL}/api/domini/${sub.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ slug: nomeVoluto }) })
    const d = await r.json()
    console.log(`rinomina → HTTP ${r.status}: ${d.dominio || d.error}`)
  }

  const { data: alias } = await admin.from('domini').select('id, dominio').eq('entity_id', sub.entity_id).eq('tipo', 'alias')
  for (const a of alias || []) {
    const r = await fetch(`${TEST_URL}/api/domini/${a.id}`, { method: 'DELETE', headers: auth })
    console.log(`alias rimosso ${a.dominio} → HTTP ${r.status}`)
  }

  const { data: finali } = await admin.from('domini').select('dominio, tipo, stato').eq('entity_id', sub.entity_id)
  console.log('\nstato finale:')
  finali.forEach(f => console.log(`  ${f.dominio.padEnd(40)} ${f.tipo} ${f.stato}`))
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    console.log('\n[probe] utente effimero eliminato')
  }
}
