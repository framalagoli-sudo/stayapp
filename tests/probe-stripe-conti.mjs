// Come stanno DAVVERO i conti Stripe dei clienti, chiesto alla produzione.
//
// Sola lettura: per ogni azienda che ha collegato un conto chiama la route del
// pannello (`GET /api/stripe/connect`), che a sua volta lo chiede a Stripe.
// Serve perché in locale c'è solo la chiave di prova: lo stato vero si vede
// soltanto passando dalla produzione.
//
// Uso:  node probe-stripe-conti.mjs
// Crea un super_admin effimero `@playwright.internal` e lo elimina sempre.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test', quiet: true })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

let uid = null
try {
  const { data: aziende } = await admin.from('aziende').select('id, ragione_sociale, stripe_account_id').not('stripe_account_id', 'is', null)
  console.log(`\n${aziende?.length || 0} aziende hanno collegato un conto Stripe\n`)
  const email = `probe-stripe-${Date.now()}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); if (error) throw error
  uid = u.user.id
  await admin.from('profiles').upsert({ id: uid, role: 'super_admin', full_name: 'Probe Stripe' }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  for (const az of aziende || []) {
    const r = await fetch(`${BASE}/api/stripe/connect?azienda_id=${az.id}`, { headers: { Authorization: `Bearer ${s.session.access_token}` } })
    const j = await r.json().catch(() => ({}))
    const stato = !j.collegato ? `NON LEGGIBILE (${j.errore || r.status})` : j.incassa ? 'ATTIVO: incassa' : j.da_completare ? 'A METÀ: mancano dati' : 'IN VERIFICA da Stripe'
    console.log(`· ${az.ragione_sociale} — ${stato}`)
    console.log(`    nome sul conto: «${j.nome || '—'}» · carte: ${j.stato_carte || '—'} · scadenza: ${j.scadenza_stato || '—'}`)
    for (const m of j.mancanti || []) console.log(`    manca: ${m}`)
  }
} finally {
  if (uid) { await admin.auth.admin.deleteUser(uid).catch(() => {}); console.log('\n[probe] utente effimero eliminato') }
}
