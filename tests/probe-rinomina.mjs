// Prova end-to-end della rinomina dell'indirizzo incluso: il vecchio indirizzo
// deve continuare a rispondere reindirizzando al nuovo, path e query compresi.
// Lavora su un'entità di test e rimette tutto com'era.
//
// Uso: node probe-rinomina.mjs <slug-entita>      (default: prova)

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const slugEntita = process.argv[2] || 'prova'

async function chiama(url) {
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) })
    return { status: res.status, location: res.headers.get('location') }
  } catch (e) { return { status: 0, errore: e.cause?.code || e.message } }
}

let userId = null
try {
  const email = `probe-${Date.now()}@playwright.internal`
  const password = randomBytes(32).toString('base64url')
  const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = created.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'super_admin', full_name: 'Probe rinomina' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: signIn } = await anon.auth.signInWithPassword({ email, password })
  const auth = { Authorization: `Bearer ${signIn.session.access_token}`, 'Content-Type': 'application/json' }

  const { data: sub } = await admin.from('domini').select('*').eq('entity_slug', slugEntita).eq('tipo', 'subdomain').maybeSingle()
  if (!sub) throw new Error(`nessun sottodominio per "${slugEntita}"`)
  const originale = sub.dominio.split('.')[0]
  const nuovo = `${originale}-rinomina-test`
  console.log(`entità "${slugEntita}" — indirizzo attuale: ${sub.dominio}\n`)

  // 1. rinomina
  const r1 = await fetch(`${TEST_URL}/api/domini/${sub.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ slug: nuovo }) })
  const d1 = await r1.json()
  console.log(`[1] rinomina → HTTP ${r1.status}, nuovo indirizzo: ${d1.dominio || d1.error}`)
  if (!r1.ok) throw new Error('rinomina fallita')

  // Il certificato del nuovo hostname richiede qualche secondo.
  await new Promise(r => setTimeout(r, 20000))

  // 2. il vecchio indirizzo deve reindirizzare, conservando path e query
  const vecchio = await chiama(`https://${sub.dominio}/`)
  console.log(`[2] vecchio indirizzo    → HTTP ${vecchio.status} → ${vecchio.location || vecchio.errore || '(nessun redirect)'}`)
  const conPath = await chiama(`https://${sub.dominio}/p/contatti?utm_source=qr`)
  console.log(`[3] vecchio + path/query → HTTP ${conPath.status} → ${conPath.location || conPath.errore || '(nessun redirect)'}`)

  // 3. il nuovo indirizzo deve servire il sito
  const nuovoIndirizzo = await chiama(`https://${d1.dominio}/`)
  console.log(`[4] nuovo indirizzo      → HTTP ${nuovoIndirizzo.status} ${nuovoIndirizzo.errore || ''}`)

  // 4. ritorno al nome originale: l'alias va consumato, non deve dare "già in uso"
  const r2 = await fetch(`${TEST_URL}/api/domini/${sub.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ slug: originale }) })
  const d2 = await r2.json()
  console.log(`[5] ritorno al nome originale → HTTP ${r2.status}: ${d2.dominio || d2.error}`)

  const { data: rimasti } = await admin.from('domini').select('dominio, tipo, redirect_a').eq('entity_id', sub.entity_id)
  console.log('\nrecord finali per l\'entità:')
  rimasti.forEach(r => console.log(`  ${r.dominio.padEnd(42)} ${r.tipo}${r.redirect_a ? ' → ' + r.redirect_a : ''}`))

  await new Promise(r => setTimeout(r, 15000))
  const finale = await chiama(`https://${sub.dominio}/`)
  console.log(`\n[6] indirizzo originale ripristinato → HTTP ${finale.status} ${finale.errore || ''}`)
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    console.log('\n[probe] utente effimero eliminato')
  }
}
