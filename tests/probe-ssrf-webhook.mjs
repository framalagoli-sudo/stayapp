// Sonda: SSRF nei webhook in uscita (giro 12 dell'agente, 17/10/2026).
//
// Un webhook in uscita è un URL che il CLIENTE configura e il SERVER chiama.
// Senza controllo, l'azienda può puntarlo a un indirizzo interno
// (169.254.169.254, localhost, rete privata) e usare il nostro server per
// bussare lì dentro (SSRF). Buco trovato e chiuso il 17/10: /api/webhooks (POST
// e PATCH) e /api/webhooks/[id]/test ora validano l'URL con `urlEsternoSicuro`.
//
//  1. Creare un webhook verso un indirizzo interno → 400.
//  2. Un URL pubblico vero → 201 (il caso buono regge).
//  3. Una riga vecchia con URL interno: il /test la rifiuta lo stesso → 400.
//
// A mano. Uso: cd tests && node probe-ssrf-webhook.mjs
//      $env:TEST_URL='http://localhost:3000' per il locale.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

let az = null, utente = null, hookInterno = null, hookPubblico = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)

try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-SSRF-${t}`, require_2fa: false }).select().single(), 'azienda')
  const email = `zz-ssrf-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const token = s.session.access_token
  const crea = (url) => fetch(`${BASE}/api/webhooks`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ nome: 'zz', url, eventi: [] }) })

  console.log(`\n1. CREARE un webhook verso un indirizzo interno → 400\n`)
  const interni = [
    'http://169.254.169.254/latest/meta-data/',  // metadata cloud
    'http://localhost:3000/api/aziende',
    'http://127.0.0.1/',
    'http://10.0.0.1/',
    'http://192.168.1.1/',
    'http://[::1]/',
    'file:///etc/passwd',
    'ftp://interno/',
  ]
  for (const url of interni) {
    const r = await crea(url)
    const b = await r.json().catch(() => ({}))
    const creato = r.status === 201
    if (creato && b.id) await a.from('webhooks').delete().eq('id', b.id)  // se è passato, pulisci subito
    esito(r.status === 400, `rifiutato: ${url.slice(0, 42)}`, `status ${r.status}${creato ? ' — CREATO!' : ''}`)
  }

  console.log(`\n2. URL pubblico vero → 201 (il caso buono regge)\n`)
  const rOk = await crea('https://example.com/oltrenova-webhook')
  const okBody = await rOk.json().catch(() => ({}))
  hookPubblico = okBody.id || null
  esito(rOk.status === 201 && !!hookPubblico, 'un webhook verso un dominio pubblico è accettato', `status ${rOk.status}`)

  console.log(`\n3. RIGA VECCHIA con URL interno: anche /test la rifiuta → 400\n`)
  // Inserita direttamente nel database, come se esistesse da prima del controllo.
  hookInterno = (await deve(a.from('webhooks').insert({ azienda_id: az.id, nome: 'zz-vecchio', url: 'http://169.254.169.254/', eventi: [], attivo: true }).select('id').single(), 'webhook interno')).id
  const rTest = await fetch(`${BASE}/api/webhooks/${hookInterno}/test`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  const tb = await rTest.json().catch(() => ({}))
  esito(rTest.status === 400, 'il /test di un webhook interno → 400, non fa la richiesta', `status ${rTest.status} ${JSON.stringify(tb).slice(0, 60)}`)
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  // ⚠️ I builder Supabase sono «thenable» ma NON hanno .catch: si avvolgono in try.
  try { if (az) await a.from('webhooks').delete().eq('azienda_id', az.id) } catch {}
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
