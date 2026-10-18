// Sonda: un account bloccato non lavora più (giro 13 dell'agente, 17/10/2026).
//
// Bloccare un account (ban reversibile, nota 52) deve fermarlo SUBITO: non deve
// poter fare login, e nemmeno continuare con un token già in mano. Un JWT vive
// ~1 ora: se il blocco valesse solo al login, un account compromesso resterebbe
// operativo per un'ora. Si prova col caso ostile: si banna un utente e si riusa
// il suo token.
//
//  1. Prima del ban: il token funziona (GET /api/contatti → 200).
//  2. Dopo il ban: lo STESSO token è rifiutato (401/403).
//  3. Dopo il ban: non si può più fare login.
//
// A mano. Uso: cd tests && node probe-ban-sessione.mjs
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

let az = null, utente = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)
const chiama = (token) => fetch(`${BASE}/api/contatti`, { headers: { Authorization: `Bearer ${token}` } })

try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-BAN-${t}`, require_2fa: false }).select().single(), 'azienda')
  const email = `zz-ban-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s, error: se } = await anon.auth.signInWithPassword({ email, password })
  if (se) throw new Error(`login iniziale: ${se.message}`)
  const token = s.session.access_token

  console.log(`\n1. PRIMA del blocco\n`)
  const r1 = await chiama(token)
  esito(r1.status === 200, 'il token funziona (GET /api/contatti → 200)', `status ${r1.status}`)

  console.log(`\n2. DOPO il blocco — lo STESSO token\n`)
  const { error: be } = await a.auth.admin.updateUserById(utente, { ban_duration: '876000h' })
  if (be) throw new Error(`ban: ${be.message}`)
  // Piccola attesa: il ban deve propagarsi.
  await new Promise(r => setTimeout(r, 1500))
  const r2 = await chiama(token)
  esito(r2.status === 401 || r2.status === 403, 'il token di un account bloccato è rifiutato', `status ${r2.status}`)

  console.log(`\n3. DOPO il blocco — nuovo login\n`)
  const { data: s2, error: se2 } = await anon.auth.signInWithPassword({ email, password })
  esito(!!se2 && !s2?.session, 'un account bloccato non può più fare login', se2 ? se2.message : 'login riuscito!')
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
