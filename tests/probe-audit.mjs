// Verifica che il registro delle azioni scriva davvero, e che scriva le cose
// giuste: mutazioni sì, letture no, tentativi respinti sì, segreti redatti.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

let userId = null
const daInizio = new Date().toISOString()
try {
  const email = `probe-audit-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: c } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = c.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'super_admin', full_name: 'Probe audit' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const auth = { Authorization: `Bearer ${s.session.access_token}`, 'Content-Type': 'application/json' }

  // 1. una LETTURA: non deve finire nel registro
  await fetch(`${TEST_URL}/api/properties`, { headers: auth })
  // 2. una MUTAZIONE con un campo sensibile: deve finirci, con il segreto oscurato
  await fetch(`${TEST_URL}/api/properties`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ name: `ZZ-Probe-Audit-${Date.now()}`, wifi_password: 'segreto-da-non-registrare' }),
  })
  // 3. un tentativo SENZA credenziali: deve finirci come respinto
  await fetch(`${TEST_URL}/api/properties`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'ZZ-Probe-NoAuth' }) })

  await new Promise(r => setTimeout(r, 3000))
  const { data: righe } = await admin.from('audit_log').select('*').gte('created_at', daInizio).order('created_at')

  console.log(`righe registrate durante la prova: ${righe?.length ?? 0}\n`)
  for (const r of righe || []) {
    const payload = JSON.stringify(r.payload || {})
    console.log(`  ${r.method.padEnd(6)} ${r.path.padEnd(20)} stato=${String(r.status_code ?? 'ammessa').padEnd(8)} utente=${r.user_email || '(anonimo)'}`)
    console.log(`         ip=${r.ip} payload=${payload.slice(0, 90)}`)
  }
  const letture = (righe || []).filter(r => r.method === 'GET')
  const segreti = (righe || []).filter(r => JSON.stringify(r.payload || {}).includes('segreto-da-non-registrare'))
  const respinti = (righe || []).filter(r => r.status_code === 401)
  console.log(`\n  letture registrate (devono essere 0): ${letture.length}`)
  console.log(`  segreti in chiaro (devono essere 0) : ${segreti.length}`)
  console.log(`  tentativi respinti registrati       : ${respinti.length}`)

  // pulizia di quanto creato dalla prova
  const { data: create } = await admin.from('properties').select('id, name').like('name', 'ZZ-Probe-Audit-%')
  for (const p of create || []) { await admin.from('domini').delete().eq('entity_id', p.id); await admin.from('properties').delete().eq('id', p.id) }
  if (create?.length) console.log(`\n  strutture di prova rimosse: ${create.length}`)
} catch (e) { console.error('ERRORE:', e.message) }
finally {
  if (userId) { const { error } = await admin.auth.admin.deleteUser(userId); if (error) console.error('cleanup:', error.message) }
  console.log('\n[probe] utente effimero eliminato')
}
