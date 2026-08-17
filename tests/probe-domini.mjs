// Sonda domini: lancia la manutenzione completa e poi verifica OGNI indirizzo
// dal vivo, come farebbe un visitatore. Serve perché lo stato scritto a DB può
// mentire: un dominio "attivo" può essere irraggiungibile (certificato mancante).
//
// Uso:  node probe-domini.mjs            → solo controllo, nessuna modifica
//       node probe-domini.mjs --ripara   → lancia anche la manutenzione
//
// Crea un super_admin effimero (stesso pattern di probe-auth.mjs) e lo elimina sempre.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) throw new Error('Mancano variabili in tests/.env.test')

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ripara = process.argv.includes('--ripara')

async function provaIndirizzo(dominio) {
  try {
    const res = await fetch(`https://${dominio}/`, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
    return `HTTP ${res.status}`
  } catch (e) {
    return `IRRAGGIUNGIBILE (${e.cause?.code || e.message})`.slice(0, 60)
  }
}

let userId = null
try {
  const email = `probe-${Date.now()}@playwright.internal`
  const password = randomBytes(32).toString('base64url')
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cErr) throw new Error(`createUser: ${cErr.message}`)
  userId = created.user.id
  const { error: pErr } = await admin.from('profiles').upsert({ id: userId, role: 'super_admin', full_name: 'Probe domini' }, { onConflict: 'id' })
  if (pErr) throw new Error(`profilo: ${pErr.message}`)

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password })
  if (sErr) throw new Error(`signIn: ${sErr.message}`)
  const auth = { Authorization: `Bearer ${signIn.session.access_token}` }

  if (ripara) {
    // Più passate: ogni giro lavora un blocco di domini, per restare dentro il
    // tempo massimo della route.
    for (let giro = 1; giro <= 3; giro++) {
      const res = await fetch(`${TEST_URL}/api/domini/manutenzione?tutti=1&limite=8`, { method: 'POST', headers: auth })
      const esito = await res.json()
      console.log(`[manutenzione ${giro}] HTTP ${res.status}`, JSON.stringify(esito))
      if (!res.ok) break
    }
  }

  const { data: domini } = await admin.from('domini')
    .select('dominio, tipo, stato, entity_tipo, entity_slug, entity_id, vercel_domain_id, verifica_dettaglio')
    .order('tipo').order('dominio')

  console.log(`\n${'DOMINIO'.padEnd(46)} ${'STATO'.padEnd(8)} ${'VERCEL'.padEnd(7)} PROVA DAL VIVO`)
  console.log('-'.repeat(110))
  let rotti = 0
  for (const d of domini || []) {
    const prova = await provaIndirizzo(d.dominio)
    const ok = prova === 'HTTP 200' || prova.startsWith('HTTP 3')
    if (!ok) rotti++
    console.log(
      `${d.dominio.padEnd(46)} ${String(d.stato).padEnd(8)} ${(d.vercel_domain_id ? 'si' : 'NO').padEnd(7)} ${ok ? '✓' : '✗'} ${prova}` +
      (d.verifica_dettaglio?.fase && !ok ? `  [${d.verifica_dettaglio.fase}]` : '')
    )
  }

  // Il controllo che conta davvero: lo slug scritto nel dominio deve esistere.
  console.log('\n--- allineamento slug ---')
  const tabelle = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
  let disallineati = 0
  for (const d of domini || []) {
    const { data: e } = await admin.from(tabelle[d.entity_tipo]).select('slug').eq('id', d.entity_id).maybeSingle()
    if (!e) { console.log(`✗ ${d.dominio}: entità inesistente (record orfano)`); disallineati++ }
    else if (e.slug !== d.entity_slug) { console.log(`✗ ${d.dominio}: copia "${d.entity_slug}" ≠ reale "${e.slug}"`); disallineati++ }
  }
  if (!disallineati) console.log('✓ tutti allineati')

  console.log(`\nRIEPILOGO: ${domini?.length || 0} domini, ${rotti} irraggiungibili, ${disallineati} disallineati`)
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    console.log('\n[probe] utente effimero eliminato')
  }
}
